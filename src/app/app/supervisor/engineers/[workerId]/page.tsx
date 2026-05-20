import { WorkerDetailMobileScreen } from "@/components/mobile-screens";

export default async function SupervisorWorkerDetailPage({
  params
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  return (
    <WorkerDetailMobileScreen
      workerId={workerId}
      role="supervisor"
      activeHref="/app/supervisor/team"
      backHref="/app/supervisor/team"
      detailBasePath="/app/supervisor/engineers"
      trackingHref="/app/supervisor/tracking/full"
      allowRemoveAccess={false}
    />
  );
}
