import { NextResponse } from "next/server";
import { publicApi } from "@/lib/server/api";
import { clearSessionCookie, revokeAllSessions, revokeSession } from "@/lib/server/session";

// Signs out this phone, or every phone of this login ({ everywhere: true }). Always clears the cookie,
// even when the sign-in had already ended.
export const POST = publicApi({}, async ({ req, me, body }) => {
  if (me) {
    if (body.everywhere === true) await revokeAllSessions(me.id, me.id, "everywhere");
    else await revokeSession(me.sessionId, me.id, "signed_out");
    // this phone stops getting this person's notifications when they sign out by hand
    if (typeof body.pushEndpoint === "string" && body.pushEndpoint) {
      const { db, T } = await import("@/lib/server/core");
      // unconfirmed-ok: best effort while signing out; the phone is signed out either way
      await db(me.id).from(T.pushSubs).update({ disabled_at: new Date().toISOString() }).eq("endpoint", body.pushEndpoint).eq("user_id", me.id);
    }
  }
  const res = NextResponse.json({ ok: true, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  clearSessionCookie(res, req);
  return res;
});
