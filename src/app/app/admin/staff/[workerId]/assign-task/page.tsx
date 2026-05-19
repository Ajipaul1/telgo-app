import { WorkerAssignTaskMobileScreen } from "@/components/mobile-screens";

export default async function WorkerAssignTaskPage({
  params
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  return <WorkerAssignTaskMobileScreen workerId={workerId} />;
}
