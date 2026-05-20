import { ProjectManagementMobileScreen } from "@/components/mobile-screens";

export default async function EngineerProjectDetailPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <ProjectManagementMobileScreen
      projectId={projectId}
      role="engineer"
      activeHref="/app/engineer/projects"
      backHref="/app/engineer/projects"
      title="Project Workspace"
    />
  );
}
