import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows } from "@/lib/server/truth";

// who can be put in a group chat: for the admin, every active Telgo staff login (not clients);
// anyone else's group is with the admin, so they pick no one.
export const GET = api({}, async ({ me, sb }) => {
  if (me.role !== "admin") return { people: [] };
  const people = await rows<{ id: string; full_name: string; role: string; avatar_file_id: string | null; avatar_url: string | null }>(
    sb.from(T.users).select("id,full_name,role,avatar_file_id,avatar_url").eq("access_status", "active").is("archived_at", null).eq("is_test", me.isTest)
      .neq("role", "client").neq("id", me.id).order("full_name"), "the people");
  return { people: people.map((p) => ({ id: p.id, fullName: p.full_name, role: p.role, hasAvatar: !!(p.avatar_file_id || p.avatar_url) })) };
});
