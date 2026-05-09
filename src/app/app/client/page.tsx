import { AppShell } from "@/components/app-shell";
import { ClientTransparency } from "@/components/dashboard-blocks";

export default function ClientPortalPage() {
  return (
    <AppShell role="client" activeHref="/app/client" title="Client Portal" subtitle="Transparent project progress, photos and escalations">
      <ClientTransparency />
    </AppShell>
  );
}
