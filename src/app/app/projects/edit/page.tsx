"use client";
import { Screen } from "@/components/Screen";
import { Loaded, Empty, Pill, Button } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtWhen } from "@/lib/shared/format";
import { STATUS_LABEL, type ProjectView } from "@/lib/shared/project";

// Edit projects (admin): the list to pick from, and New project
export default function EditProjects() {
  const load = useLoad<{ projects: ProjectView[] }>("/api/projects?archived=1", { every: 60 });
  return (
    <Screen title="Edit projects" roles={["admin"]} testId="projects-edit">
      <Button big block href="/app/projects/edit/new" testId="new-project">New project</Button>
      <Loaded load={load} isEmpty={(d) => !d.projects.length} empty={<Empty title="No projects yet">Tap New project to add the first one.</Empty>}>
        {(d) => (
          <div className="list" data-testid="edit-list">
            {d.projects.map((p) => (
              <a key={p.id} className="item" href={`/app/projects/edit/${encodeURIComponent(p.id)}`}>
                <div className="grow">
                  <div className="title ellipsis">{p.name}</div>
                  <div className="sub">{p.code} · {p.route.length > 1 ? "route drawn" : "no route yet"} · changed {fmtWhen(p.updatedAt)}</div>
                </div>
                <Pill tone={p.archivedAt ? undefined : p.status === "active" ? "ok" : "warn"}>{p.archivedAt ? "Archived" : STATUS_LABEL[p.status]}</Pill>
              </a>
            ))}
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
