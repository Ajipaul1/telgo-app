import { WorkerAssignTaskMobileScreen } from "@/components/mobile-screens";

export default async function SupervisorAssignTaskPage({
  params
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  return (
    <WorkerAssignTaskMobileScreen
      workerId={workerId}
      role="supervisor"
      activeHref="/app/supervisor/team"
      backHref={`/app/supervisor/engineers/${workerId}`}
      detailBasePath="/app/supervisor/engineers"
    />
  );
}
