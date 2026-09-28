"use client";
import { Screen } from "@/components/Screen";
import { ProjectForm } from "../_parts/ProjectForm";

export default function NewProject() {
  return (
    <Screen title="New project" roles={["admin"]} testId="project-new">
      <ProjectForm />
    </Screen>
  );
}
