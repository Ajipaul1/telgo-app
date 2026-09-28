import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows } from "@/lib/server/truth";
import { oneOf, str } from "@/lib/server/validate";
import { escLike } from "@/lib/server/people";

// System (admin): ?view=sign-ins | changes | problems
export const GET = api({ roles: ["admin"] }, async ({ me, sb, req }) => {
  const q = req.nextUrl.searchParams;
  const view = oneOf(q.get("view") ?? "sign-ins", ["sign-ins", "changes", "problems"] as const, "View");
  const search = str(q.get("q"), { label: "Search", max: 80 });
  if (view === "sign-ins") {
    let query = sb.from(T.attempts).select("id,at,identifier,user_id,ok,reason,ip,user_agent").eq("is_test", me.isTest).order("at", { ascending: false }).limit(300);
    if (search) query = query.ilike("identifier", `%${escLike(search)}%`);
    const list = await rows<Record<string, unknown>>(query, "the sign-ins");
    return { view, items: list };
  }
  if (view === "problems") {
    let pq = sb.from(T.errors).select("id,ref,at,user_id,route,message,code,source").eq("is_test", me.isTest).order("at", { ascending: false }).limit(300);
    if (search) pq = pq.or(["ref", "message", "route", "code"].map((c) => `${c}.ilike.%${escLike(search).replace(/[,()]/g, " ")}%`).join(","));
    const list = await rows<Record<string, unknown>>(pq, "the problems");
    return { view, items: list };
  }
  let query = sb.from(T.audit).select("id,at,actor,table_name,row_id,action,changes").eq("is_test", me.isTest).order("at", { ascending: false }).limit(300);
  if (search) {
    const who = await rows<{ id: string }>(sb.from(T.users).select("id").ilike("full_name", `%${escLike(search)}%`).limit(20), "names");
    const parts = [`table_name.ilike.%${escLike(search)}%`, `row_id.ilike.%${escLike(search)}%`, ...who.map((w) => `actor.eq.${w.id}`)];
    query = query.or(parts.join(","));
  }
  const list = await rows<Record<string, unknown>>(query, "the change log");
  const actors = [...new Set(list.map((r) => r.actor).filter(Boolean))] as string[];
  const names = actors.length ? new Map((await rows<{ id: string; full_name: string }>(sb.from(T.users).select("id,full_name").in("id", actors), "names")).map((p) => [p.id, p.full_name])) : new Map();
  return { view, items: list.map((r) => ({ ...r, actorName: r.actor ? names.get(String(r.actor)) ?? null : null })) };
});
