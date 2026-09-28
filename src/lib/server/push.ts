// Push to the phone (RULES.md section 10): every notification the database makes is sent to the
// phones its person turned notifications on for (Android, and the iPhone Home Screen app, iOS 16.4+).
// Runs after every change (api.ts) and never delays the reply. A phone its push service says is gone
// is switched off; one that fails 10 times in a row too.
import "server-only";
import webpush from "web-push";
import { db, T } from "./core";

export function pushKeys() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@telgopowerprojects.com";
  return pub && priv ? { pub, priv, subject } : null;
}

type Note = { id: string; recipient_user_id: string; title: string; body: string | null; link: string | null; notification_type: string };
type Sub = { id: string; endpoint: string; p256dh: string; auth: string; fail_count: number };

export async function sendToSubs(subs: Sub[], payload: object) {
  const keys = pushKeys();
  if (!keys) return { sent: 0, failed: 0, configured: false };
  webpush.setVapidDetails(keys.subject, keys.pub, keys.priv);
  let sent = 0, failed = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
      sent++;
      // unconfirmed-ok: bookkeeping of the phone's push address
      await db().from(T.pushSubs).update({ last_ok_at: new Date().toISOString(), fail_count: 0 }).eq("id", s.id);
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode ?? 0;
      const gone = code === 404 || code === 410;
      // unconfirmed-ok: bookkeeping of the phone's push address
      await db().from(T.pushSubs).update({
        fail_count: s.fail_count + 1,
        ...(gone || s.fail_count + 1 >= 10 ? { disabled_at: new Date().toISOString() } : {}),
      }).eq("id", s.id);
    }
  }));
  return { sent, failed, configured: true };
}

export async function sendPendingPush() {
  if (!pushKeys()) return;
  const since = new Date(Date.now() - 30 * 60e3).toISOString();
  // claim: each notification is pushed once, even if two changes finish at the same moment
  const { data, error } = await db().from(T.notifications)
    .update({ pushed_at: new Date().toISOString() })
    .is("pushed_at", null).gte("created_at", since)
    .select("id,recipient_user_id,title,body,link,notification_type");
  if (error || !data?.length) return;
  const byPerson = new Map<string, Note[]>();
  for (const n of data as Note[]) byPerson.set(n.recipient_user_id, [...(byPerson.get(n.recipient_user_id) ?? []), n]);
  // only people who can still use the app (not blocked or switched off)
  const { data: live } = await db().from(T.users).select("id").in("id", [...byPerson.keys()]).eq("access_status", "active").is("blocked_at", null).is("archived_at", null);
  const allowed = new Set((live ?? []).map((u) => u.id));
  const { data: subs } = await db().from(T.pushSubs).select("id,user_id,endpoint,p256dh,auth,fail_count")
    .in("user_id", [...allowed]).is("disabled_at", null);
  for (const [person, notes] of byPerson) {
    const mine = (subs ?? []).filter((s) => s.user_id === person) as Sub[];
    if (!mine.length) continue;
    for (const n of notes) {
      await sendToSubs(mine, { id: n.id, title: n.title, body: n.body ?? "", link: n.link ?? "/app/notifications", topic: n.notification_type });
    }
  }
}
