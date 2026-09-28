import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { must } from "@/lib/server/truth";
import { checkPassword, hashPassword, passwordProblem } from "@/lib/server/password";
import { passwordCopy } from "@/lib/server/seal";
import { revokeAllSessions } from "@/lib/server/session";

// The person changes their own password (also the first step after a temporary password).
// Every other phone signed in with this login is signed out.
export const POST = api({ allowMustChange: true, rate: { limit: 10, seconds: 600 } }, async ({ me, sb, body }) => {
  const current = String(body.current ?? "");
  const next = String(body.next ?? "");
  if (!current) fail(400, "INVALID", "Enter your current password.");
  const problem = passwordProblem(next);
  if (problem) fail(400, "INVALID", `New password: ${problem}`);
  if (next === current) fail(400, "INVALID", "The new password must be different from the current one.");
  const u = await must(sb.from(T.users).select("password_hash,email").eq("id", me.id).single(), "your login");
  const ok = await checkPassword(current, u.password_hash as string, u.email as string);
  if (!ok.ok) fail(401, "WRONG", "The current password is wrong.");
  const row = await must(
    sb.from(T.users).update({ password_hash: await hashPassword(next), ...passwordCopy(next), must_change_password: false, password_changed_at: new Date().toISOString() })
      .eq("id", me.id).select("password_changed_at").single(),
    "your new password",
  );
  await revokeAllSessions(me.id, me.id, "password", me.sessionId);
  return { changedAt: row.password_changed_at };
});
