import { AppShell } from "@/components/app-shell";
import { ChatRoom } from "@/components/interactive";

export default function ChatPage() {
  return (
    <AppShell role="engineer" activeHref="/app/engineer/logs" title="Project Chat" subtitle="Realtime project communication" backHref="/app/engineer">
      <ChatRoom />
    </AppShell>
  );
}
