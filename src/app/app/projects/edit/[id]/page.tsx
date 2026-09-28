"use client";
import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Loaded, Saved, Button } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import type { ProjectView } from "@/lib/shared/project";
import { ProjectForm } from "../_parts/ProjectForm";

function Body({ id }: { id: string }) {
  const q = useSearchParams();
  const load = useLoad<{ project: ProjectView }>(`/api/projects/${encodeURIComponent(id)}`);
  return (
    <Loaded load={load}>
      {(d) => (
        <>
          <Saved at={q.get("saved")} what="Added" />
          <ProjectForm key={d.project.id} project={d.project} />
          <Button kind="ghost" block href={`/app/projects/${encodeURIComponent(d.project.id)}`}>See the project</Button>
          <p className="tiny muted center">To archive or remove a project, use File manager → Projects.</p>
        </>
      )}
    </Loaded>
  );
}

export default function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Screen title="Edit project" roles={["admin"]} testId="project-edit">
      <Suspense><Body id={id} /></Suspense>
    </Screen>
  );
}
