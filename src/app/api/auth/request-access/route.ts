import { publicApi } from "@/lib/server/api";
import { db, T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { must, rows } from "@/lib/server/truth";
import { email as emailOf, oneOf, phone as phoneOf, str, optStr } from "@/lib/server/validate";
import { escLike, newLoginId } from "@/lib/server/people";
import { REQUESTABLE } from "@/lib/shared/roles";

// Anyone may ask for a login (never an admin one). The admin is told by the database and decides.
// 5 requests an hour per network.
export const POST = publicApi({ rate: { limit: 5, seconds: 3600 } }, async ({ body }) => {
  const fullName = str(body.fullName, { label: "Your name", required: true, min: 2, max: 80 });
  const email = emailOf(body.email);
  const phone = phoneOf(body.phone);
  const role = oneOf(body.role, REQUESTABLE, "Your work");
  const note = optStr(body.note, { label: "Note", max: 400 });
  const sb = db();
  const same = await rows<{ access_status: string; blocked_at: string | null; archived_at: string | null }>(
    sb.from(T.users).select("access_status,blocked_at,archived_at").ilike("email", escLike(email)).limit(1), "your request");
  if (same.length) {
    const s = same[0];
    if (s.blocked_at || s.access_status === "blocked" || s.archived_at) fail(409, "EXISTS", "This email can't ask for access here. Ask the Telgo office.");
    if (s.access_status === "pending") fail(409, "EXISTS", "Your request is already waiting for the admin.");
    fail(409, "EXISTS", "This email already has a login. Sign in, or ask the admin to reset your password.");
  }
  const row = await must(
    sb.from(T.users).insert({
      full_name: fullName, email, phone, role, access_status: "pending", login_id: await newLoginId(), request_note: note,
    }).select("id,login_id,created_at").single(),
    "your request",
  );
  return { requestedAt: row.created_at, message: "Your request was sent. The admin will give you a password." };
});
