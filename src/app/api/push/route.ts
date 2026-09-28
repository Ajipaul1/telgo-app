import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { must, rows } from "@/lib/server/truth";
import { oneOf, str } from "@/lib/server/validate";
import { pushKeys, sendToSubs } from "@/lib/server/push";

// is push set up on the server, and is it on for this phone? (?endpoint=)
export const GET = api({ allowMustChange: true }, async ({ me, sb, req }) => {
  const keys = pushKeys();
  const endpoint = req.nextUrl.searchParams.get("endpoint");
  let onHere = false;
  if (endpoint) {
    const s = await rows(sb.from(T.pushSubs).select("id").eq("endpoint", endpoint).eq("user_id", me.id).is("disabled_at", null).limit(1), "this phone");
    onHere = s.length > 0;
  }
  return { configured: !!keys, publicKey: keys?.pub ?? null, onHere };
});

// { action: subscribe, subscription } | { action: unsubscribe, endpoint } | { action: test, endpoint }
export const POST = api({ allowMustChange: true, rate: { limit: 30, seconds: 600 } }, async ({ me, sb, body, req }) => {
  const action = oneOf(body.action, ["subscribe", "unsubscribe", "test"] as const, "Action");
  if (action === "subscribe") {
    const s = (body.subscription ?? {}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    const endpoint = str(s.endpoint, { label: "Phone", required: true, max: 1000, pattern: /^https:\/\//, patternMsg: "This phone's push address isn't valid." });
    const p256dh = str(s.keys?.p256dh, { label: "Phone key", required: true, max: 200 });
    const auth = str(s.keys?.auth, { label: "Phone key", required: true, max: 100 });
    // a phone belongs to whoever signed in on it last
    const row = await must(sb.from(T.pushSubs).upsert({
      user_id: me.id, endpoint, p256dh, auth, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
      disabled_at: null, fail_count: 0, is_test: me.isTest,
    }, { onConflict: "endpoint" }).select("id,created_at").single(), "notifications on this phone");
    return { on: true, since: row.created_at };
  }
  const endpoint = str(body.endpoint, { label: "Phone", required: true, max: 1000 });
  if (action === "unsubscribe") {
    const { error } = await sb.from(T.pushSubs).update({ disabled_at: new Date().toISOString() }).eq("endpoint", endpoint).eq("user_id", me.id).select("id");
    if (error) throw error;
    return { on: false };
  }
  const subs = await rows<{ id: string; endpoint: string; p256dh: string; auth: string; fail_count: number }>(
    sb.from(T.pushSubs).select("id,endpoint,p256dh,auth,fail_count").eq("endpoint", endpoint).eq("user_id", me.id).is("disabled_at", null), "this phone");
  if (!subs.length) fail(409, "PUSH_OFF", "Notifications aren't on for this phone yet. Turn them on first.");
  const r = await sendToSubs(subs, { title: "Telgo test", body: "Notifications work on this phone.", link: "/app/notifications", topic: "test" });
  if (!r.configured) fail(503, "PUSH_NOT_SET", "Push isn't set up on the server yet (the push keys are missing).");
  if (!r.sent) fail(502, "PUSH_FAILED", "The phone's push service refused the test. Turn notifications off and on again.");
  return { sent: r.sent };
});
