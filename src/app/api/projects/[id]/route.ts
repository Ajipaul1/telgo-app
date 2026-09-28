import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { str, stamp } from "@/lib/server/validate";
import { clientProjectIds, projectPatch, totalsFromRow } from "@/lib/server/projects";
import { projectFromRow } from "@/lib/shared/project";

async function load(sb: Parameters<Parameters<typeof api>[1]>[0]["sb"], id: string, isTest: boolean) {
  return maybe<Record<string, unknown>>(sb.from(T.projects).select("*").eq("id", id).eq("is_test", isTest).is("trashed_at", null).maybeSingle(), "the project");
}

// one project with its totals and the latest site storage
export const GET = api({}, async ({ me, sb, params }) => {
  const id = str(params.id, { label: "Project", required: true, max: 80 });
  if (me.role === "client" && !(await clientProjectIds(sb, me)).includes(id)) fail(404, "NOT_FOUND", "That project isn't shared with you.");
  const row = await load(sb, id, me.isTest);
  if (!row) fail(404, "NOT_FOUND", "That project doesn't exist.");
  const [tot, materials] = await Promise.all([
    maybe<Record<string, unknown>>(sb.from(T.projectTotals).select("*").eq("project_id", id).eq("is_test", me.isTest).maybeSingle(), "project totals"),
    me.role === "client" ? Promise.resolve([]) : rows(sb.from(T.materials).select("id,unloaded_on,material,quantity,unit,location,created_by_name,created_at").eq("project_id", id).is("trashed_at", null).is("archived_at", null).order("unloaded_on", { ascending: false }).limit(5), "site storage"),
  ]);
  const money = me.role === "admin" || me.role === "finance";
  const p = projectFromRow(row!);
  const t = totalsFromRow(tot ?? undefined);
  return {
    project: { ...p, budget: money ? p.budget : null, standardWage: me.role === "client" ? null : p.standardWage },
    totals: money ? t : { ...t, wages: 0, fuel: 0, travel: 0, roomRent: 0, toolRent: 0, other: 0, spent: 0 },
    materials,
  };
});

// change a project (admin); refused if someone changed it since the screen loaded it
export const PATCH = api({ roles: ["admin"] }, async ({ me, sb, params, body }) => {
  const id = str(params.id, { label: "Project", required: true, max: 80 });
  const expected = stamp(body.expected);
  const patch = projectPatch(body, false);
  if (!Object.keys(patch).length) fail(400, "INVALID", "Nothing to change.");
  if (patch.code) {
    const same = await rows<{ id: string }>(sb.from(T.projects).select("id").ilike("code", String(patch.code)).neq("id", id).limit(1), "the projects");
    if (same.length) fail(409, "DUPLICATE", `Another project already uses the code ${patch.code}.`);
  }
  const { data, error } = await sb.from(T.projects).update(patch).eq("id", id).eq("is_test", me.isTest).eq("updated_at", expected).is("trashed_at", null).select("*");
  if (error) throw error;
  if (!data?.length) {
    const now = await load(sb, id, me.isTest);
    if (!now) fail(404, "NOT_FOUND", "That project doesn't exist any more.");
    fail(409, "CHANGED", "Someone changed this project since you opened it. Nothing was saved. Reload to see their change.");
  }
  return { project: projectFromRow(data![0] as Record<string, unknown>) };
});
