import { ProjectManagementMobileScreen } from "@/components/mobile-screens";

export default async function SupervisorProjectDetailPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <ProjectManagementMobileScreen
      projectId={projectId}
      role="supervisor"
      activeHref="/app/supervisor/projects"
      backHref="/app/supervisor/projects"
      title="Project Workspace"
    />
  );
}
