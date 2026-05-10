import { AppShell } from "@/components/app-shell";
import { ClientReviewRequest, RoleNotificationsPanel } from "@/components/interactive";

export default function ClientReviewPage() {
  return (
    <AppShell
      role="client"
      activeHref="/app/client/review"
      title="Request Review"
      subtitle="Escalate a project checkpoint"
      backHref="/app/client"
    >
      <ClientReviewRequest />
      <RoleNotificationsPanel title="Client Notifications" />
    </AppShell>
  );
}
