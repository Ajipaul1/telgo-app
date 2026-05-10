import { AppShell } from "@/components/app-shell";
import { PhotosGrid } from "@/components/dashboard-blocks";

export default function ClientPhotosPage() {
  return (
    <AppShell
      role="client"
      activeHref="/app/client/photos"
      title="Latest Photos"
      subtitle="Approved project media"
      backHref="/app/client"
    >
      <PhotosGrid />
    </AppShell>
  );
}
