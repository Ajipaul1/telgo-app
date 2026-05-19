import { WorkerDetailMobileScreen } from "@/components/mobile-screens";

export default async function WorkerDetailPage({
  params
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  return <WorkerDetailMobileScreen workerId={workerId} />;
}
