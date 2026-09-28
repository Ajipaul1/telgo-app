import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { purgeTrash } from "@/lib/server/purge";
import { toReply } from "@/lib/server/doctor";

// the daily clean-up (Vercel cron, see vercel.json): only with the server's CRON_SECRET
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const ok = secret.length >= 16 && got.length === secret.length && timingSafeEqual(Buffer.from(got), Buffer.from(secret));
  if (!ok) return NextResponse.json({ ok: false, error: { code: "ROLE", message: "Not allowed." } }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, removed: await purgeTrash() });
  } catch (e) {
    const r = await toReply(e, { route: "GET /api/cron/purge" });
    return NextResponse.json(r.body, { status: r.status });
  }
}
