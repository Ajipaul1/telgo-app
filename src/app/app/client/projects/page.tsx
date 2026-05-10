import { AppShell } from "@/components/app-shell";
import { ClientTransparency } from "@/components/dashboard-blocks";

export default function ClientProjectsPage() {
  return (
    <AppShell
      role="client"
      activeHref="/app/client/projects"
      title="Assigned Projects"
      subtitle="Client-visible progress only"
      backHref="/app/client"
    >
      <ClientTransparency />
    </AppShell>
  );
}
