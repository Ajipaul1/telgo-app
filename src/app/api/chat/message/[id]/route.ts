import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { uuid } from "@/lib/server/validate";
import { memberOf, messageView, MSG_COLS } from "@/lib/server/chat";

// remove a message (its sender, or the admin). It leaves the chat at once; the File manager keeps it
// in the Trash for 90 days, then it is deleted for good with its file.
export const POST = api({}, async ({ me, sb, params }) => {
  const id = uuid(params.id, "Message");
  const m = await maybe<Record<string, unknown>>(sb.from(T.chatMessages).select(MSG_COLS + ",is_test").eq("id", id).maybeSingle(), "the message");
  if (!m || m.is_test !== me.isTest) fail(404, "NOT_FOUND", "That message doesn't exist.");
  await memberOf(sb, me, String(m!.thread_id));
  if (String(m!.sender_id) !== me.id && me.role !== "admin") fail(403, "ROLE", "Only the sender or the admin can remove a message.");
  if (m!.removed_at) fail(409, "NO_CHANGE", "It was already removed.");
  const now = new Date().toISOString();
  const done = await rows<Record<string, unknown>>(sb.from(T.chatMessages).update({ removed_at: now, removed_by: me.id, trashed_at: now, trashed_by: me.id }).eq("id", id).is("removed_at", null).select(MSG_COLS), "removing the message");
  if (!done.length) fail(409, "NO_CHANGE", "It was already removed.");
  return { message: messageView(done[0]) };
});
