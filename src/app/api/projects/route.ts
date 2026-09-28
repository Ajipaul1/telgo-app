import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { must, rows } from "@/lib/server/truth";
import { listProjects, projectPatch } from "@/lib/server/projects";
import { projectFromRow } from "@/lib/shared/project";

// every project this person may see, with what the approved reports say was done (and, for money roles, spent)
export const GET = api({}, async ({ me, sb, req }) => {
  const archived = req.nextUrl.searchParams.get("archived") === "1" && me.role === "admin";
  return { projects: await listProjects(sb, me, { includeArchived: archived }) };
});

// a new project (admin)
export const POST = api({ roles: ["admin"] }, async ({ me, sb, body }) => {
  const p = projectPatch(body, true);
  const code = String(p.code);
  const same = await rows(sb.from(T.projects).select("id").ilike("code", code).limit(1), "the projects");
  if (same.length) fail(409, "DUPLICATE", `Another project already uses the code ${code}.`);
  const id = code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `project-${Date.now()}`;
  const row = await must(
    sb.from(T.projects).insert({ ...p, id: me.isTest ? `zz-test-${id}` : id, contract_type: "EPC", created_by: me.id, is_test: me.isTest })
      .select("*").single(),
    "the new project",
  );
  return { project: projectFromRow(row as Record<string, unknown>) };
});
