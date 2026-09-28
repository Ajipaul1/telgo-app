import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { maybe, must, rows } from "@/lib/server/truth";
import { oneOf, optStr, uuid } from "@/lib/server/validate";
import { personView, PERSON_COLS, type PersonRow } from "@/lib/server/people";
import { hashPassword, passwordProblem, tempPassword } from "@/lib/server/password";
import { passwordCopy } from "@/lib/server/seal";
import { revokeAllSessions } from "@/lib/server/session";
import { sendLoginEmail } from "@/lib/server/email";

const ACTIONS = ["approve", "reset_password", "set_password", "block", "unblock", "sign_out_everywhere"] as const;

// approve a request, reset a password, block or unblock, sign out on all phones (admin)
export const POST = api({ roles: ["admin"], rate: { limit: 60, seconds: 600 } }, async ({ me, sb, params, body, req }) => {
  const id = uuid(params.id, "Person");
  const action = oneOf(body.action, ACTIONS, "Action");
  const p = await maybe<PersonRow>(sb.from(T.users).select(PERSON_COLS).eq("id", id).eq("is_test", me.isTest).is("trashed_at", null).maybeSingle(), "the person");
  if (!p) fail(404, "NOT_FOUND", "That person doesn't exist.");
  const person = p!;
  const now = new Date().toISOString();

  const otherAdmins = async () => (await rows(sb.from(T.users).select("id").eq("role", "admin").eq("access_status", "active").is("blocked_at", null).is("archived_at", null).eq("is_test", me.isTest).neq("id", id), "the admins")).length;

  if (action === "block") {
    if (id === me.id) fail(400, "SELF", "You can't block your own login.");
    if (person.role === "admin" && (await otherAdmins()) === 0) fail(400, "LAST_ADMIN", "This is the only admin login left, so it can't be blocked.");
    const reason = optStr(body.reason, { label: "Reason", max: 200 }) ?? "Blocked by the admin.";
    const row = await must(sb.from(T.users).update({ access_status: "blocked", blocked_at: now, blocked_reason: reason }).eq("id", id).select(PERSON_COLS).single(), "blocking the login");
    await revokeAllSessions(id, me.id, "blocked");
    return { person: personView(row as unknown as PersonRow) };
  }
  if (action === "unblock") {
    const row = await must(sb.from(T.users).update({ access_status: "active", blocked_at: null, blocked_reason: null }).eq("id", id).select(PERSON_COLS).single(), "unblocking the login");
    return { person: personView(row as unknown as PersonRow) };
  }
  if (action === "sign_out_everywhere") {
    // your own login: every other phone is signed out, this one stays
    await revokeAllSessions(id, me.id, "everywhere", id === me.id ? me.sessionId : undefined);
    return { person: personView(person) };
  }
  // set a password (owner's ask): the admin types it (or leaves it empty for one made here). It is kept
  // visible for the admin; they change it at next sign-in only if the admin asks; their phones stay signed
  // in unless the admin asks to sign them out.
  if (action === "set_password") {
    if (id === me.id) fail(400, "SELF", "Change your own password in Profile.");
    const typed = String(body.password ?? "");
    const password = typed || tempPassword();
    const problem = passwordProblem(password);
    if (problem) fail(400, "INVALID", `Password: ${problem}`);
    const row = await must(sb.from(T.users).update({ password_hash: await hashPassword(password), ...passwordCopy(password), must_change_password: body.mustChange === true, password_changed_at: now })
      .eq("id", id).select(PERSON_COLS).single(), "the new password");
    if (body.signOut === true) await revokeAllSessions(id, me.id, "reset");
    return { person: personView(row as unknown as PersonRow), password };
  }
  // approve or reset: a new temporary password, shown once, changed by them at first sign-in
  if (action === "approve" && person.access_status !== "pending") fail(409, "NO_CHANGE", "This login isn't waiting for approval.");
  if (action === "reset_password" && id === me.id) fail(400, "SELF", "Change your own password in Profile.");
  const password = tempPassword();
  const patch: Record<string, unknown> = { password_hash: await hashPassword(password), ...passwordCopy(password), must_change_password: true, password_changed_at: now };
  if (action === "approve") Object.assign(patch, { access_status: "active", activated_at: now, blocked_at: null, blocked_reason: null });
  const row = await must(sb.from(T.users).update(patch).eq("id", id).select(PERSON_COLS).single(), action === "approve" ? "the approval" : "the new password");
  if (action === "reset_password") await revokeAllSessions(id, me.id, "reset");
  const mail = body.sendEmail === true && person.email
    ? await sendLoginEmail(person.email, { name: person.full_name ?? "", loginId: person.login_id ?? "", password, appUrl: req.nextUrl.origin, kind: action === "approve" ? "new" : "reset" })
    : { sent: false, why: null };
  return { person: personView(row as unknown as PersonRow), tempPassword: password, emailed: mail.sent, emailProblem: mail.why };
});
