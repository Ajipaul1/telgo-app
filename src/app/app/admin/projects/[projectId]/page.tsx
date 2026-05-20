import { ProjectManagementMobileScreen } from "@/components/mobile-screens";

export default async function AdminProjectDetailPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectManagementMobileScreen projectId={projectId} />;
}
