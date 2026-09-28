import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { must, rows } from "@/lib/server/truth";
import { email as emailOf, oneOf, phone as phoneOf, str } from "@/lib/server/validate";
import { escLike, newLoginId, personView, PERSON_COLS, type PersonRow } from "@/lib/server/people";
import { hashPassword, tempPassword } from "@/lib/server/password";
import { sendLoginEmail } from "@/lib/server/email";
import { ROLES } from "@/lib/shared/roles";

// everyone (admin); ?status=active|pending|blocked|archived|all
export const GET = api({ roles: ["admin"] }, async ({ me, sb, req }) => {
  const status = req.nextUrl.searchParams.get("status") ?? "all";
  let q = sb.from(T.users).select(PERSON_COLS).eq("is_test", me.isTest).is("trashed_at", null).order("full_name");
  if (status === "archived") q = q.not("archived_at", "is", null);
  else if (status !== "all") q = q.is("archived_at", null);
  if (status === "active") q = q.eq("access_status", "active").is("blocked_at", null);
  if (status === "pending") q = q.eq("access_status", "pending");
  if (status === "blocked") q = q.or("access_status.eq.blocked,blocked_at.not.is.null");
  const list = await rows<PersonRow>(q, "the team");
  return { people: list.map(personView) };
});

// add a person (admin): they get a temporary password, shown once here, and must change it at first sign-in
export const POST = api({ roles: ["admin"], rate: { limit: 30, seconds: 600 } }, async ({ me, sb, body, req }) => {
  const fullName = str(body.fullName, { label: "Name", required: true, min: 2, max: 80 });
  const email = emailOf(body.email);
  const phone = phoneOf(body.phone);
  const role = oneOf(body.role, ROLES, "Work");
  const same = await rows(sb.from(T.users).select("id").ilike("email", escLike(email)).limit(1), "the team");
  if (same.length) fail(409, "DUPLICATE", "Someone already has a login with this email.");
  const password = tempPassword();
  const loginId = await newLoginId();
  const row = await must(
    sb.from(T.users).insert({
      full_name: fullName, email, phone, role, login_id: loginId, access_status: "active", activated_at: new Date().toISOString(),
      password_hash: await hashPassword(password), must_change_password: true, is_test: me.isTest,
    }).select(PERSON_COLS).single(),
    "the new login",
  );
  const mail = body.sendEmail === true
    ? await sendLoginEmail(email, { name: fullName, loginId, password, appUrl: req.nextUrl.origin, kind: "new" })
    : { sent: false, why: null };
  return { person: personView(row as unknown as PersonRow), tempPassword: password, emailed: mail.sent, emailProblem: mail.why };
});
