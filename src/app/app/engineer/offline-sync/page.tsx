import { AppShell } from "@/components/app-shell";
import { OfflineSyncManager } from "@/components/interactive";

export default function OfflineSyncPage() {
  return (
    <AppShell role="engineer" activeHref="/app/engineer/offline-sync" title="Offline Sync" subtitle="View and manage your offline data" backHref="/app/engineer">
      <OfflineSyncManager />
    </AppShell>
  );
}
