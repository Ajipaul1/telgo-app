import { api } from "@/lib/server/api";
import { fromDb } from "@/lib/server/doctor";
import { oneOf, uuid } from "@/lib/server/validate";
import { memberOf } from "@/lib/server/chat";

// { for: "me" }: the chat is emptied for this person only; the others keep every message.
// { for: "everyone" } (the admin): every message leaves the chat for everyone and goes to the Trash
// (the File manager keeps it 90 days). Either way the chat's notification cards are marked read.
export const POST = api({ rate: { limit: 20, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Chat");
  await memberOf(sb, me, id);
  const who = oneOf(body.for, ["me", "everyone"] as const, "Clear for");
  if (who === "everyone") {
    const { data, error } = await sb.rpc("telgo_chat_clear_all", { p_user: me.id, p_thread: id });
    if (error) throw fromDb(error, "clearing the chat");
    return { cleared: "everyone", messages: data as number };
  }
  const { data, error } = await sb.rpc("telgo_chat_clear_mine", { p_user: me.id, p_thread: id });
  if (error) throw fromDb(error, "clearing the chat");
  return { cleared: "me", at: data as string };
});
