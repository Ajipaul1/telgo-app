import { api } from "@/lib/server/api";
import { fromDb } from "@/lib/server/doctor";
import { uuid } from "@/lib/server/validate";
import { memberOf } from "@/lib/server/chat";

// the admin adds people to a group chat: { members: [ids] }. They are told, and see the earlier messages.
export const POST = api({ roles: ["admin"], rate: { limit: 30, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Chat");
  await memberOf(sb, me, id, { write: true });
  const members = Array.isArray(body.members) ? (body.members as unknown[]).slice(0, 100).map((x) => uuid(x, "Person")) : [];
  const { data, error } = await sb.rpc("telgo_chat_add", { p_user: me.id, p_thread: id, p_members: members });
  if (error) throw fromDb(error, "adding the people");
  return { added: data as number };
});
