import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { oneOf, str, uuid } from "@/lib/server/validate";
import { memberOf, messageView, MSG_COLS } from "@/lib/server/chat";

// { action: "remove" } (the default): its sender or the admin. It leaves the chat at once; the File
// manager keeps it in the Trash for 90 days, then it is deleted for good with its file.
// { action: "edit", body }: the sender changes their own text; everyone sees "edited".
export const POST = api({ rate: { limit: 60, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Message");
  const action = oneOf(body.action ?? "remove", ["remove", "edit"] as const, "Action");
  const m = await maybe<Record<string, unknown>>(sb.from(T.chatMessages).select(MSG_COLS + ",is_test").eq("id", id).maybeSingle(), "the message");
  if (!m || m.is_test !== me.isTest) fail(404, "NOT_FOUND", "That message doesn't exist.");
  await memberOf(sb, me, String(m!.thread_id), { write: action === "edit" });
  if (m!.removed_at) fail(409, "NO_CHANGE", "It was already removed.");
  const now = new Date().toISOString();

  if (action === "edit") {
    if (String(m!.sender_id) !== me.id) fail(403, "ROLE", "Only the sender can change a message.");
    if (m!.kind !== "text") fail(400, "INVALID", "Only a written message can be changed.");
    const text = str(body.body, { label: "Message", required: true, max: 4000 });
    if (text === m!.body) fail(409, "NO_CHANGE", "Nothing was changed.");
    const done = await rows<Record<string, unknown>>(sb.from(T.chatMessages).update({ body: text, edited_at: now }).eq("id", id).eq("sender_id", me.id).is("removed_at", null).select(MSG_COLS), "changing the message");
    if (!done.length) fail(409, "NO_CHANGE", "It was removed meanwhile.");
    return { message: messageView(done[0]) };
  }

  if (String(m!.sender_id) !== me.id && me.role !== "admin") fail(403, "ROLE", "Only the sender or the admin can remove a message.");
  const done = await rows<Record<string, unknown>>(sb.from(T.chatMessages).update({ removed_at: now, removed_by: me.id, trashed_at: now, trashed_by: me.id }).eq("id", id).is("removed_at", null).select(MSG_COLS), "removing the message");
  if (!done.length) fail(409, "NO_CHANGE", "It was already removed.");
  return { message: messageView(done[0]) };
});
