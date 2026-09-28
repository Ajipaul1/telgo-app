import { NextResponse } from "next/server";
import { publicApi } from "@/lib/server/api";
import { resumeSession, setSessionCookie } from "@/lib/server/session";

// An Android WebView sometimes loses its cookies. The phone keeps a resume ticket (never the password)
// and trades it here for a fresh session. The ticket changes every time it is used.
export const POST = publicApi({ rate: { limit: 30, seconds: 600 } }, async ({ req, body }) => {
  const s = await resumeSession(String(body.resume ?? ""), req);
  const res = NextResponse.json({ ok: true, serverTime: new Date().toISOString(), resume: s.resume, mustChangePassword: s.me.mustChangePassword }, { headers: { "Cache-Control": "no-store" } });
  setSessionCookie(res, s.token, s.expires, req);
  return res;
});
