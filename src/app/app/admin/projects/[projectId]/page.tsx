import { AdminProjectEditorScreen } from "@/components/admin-project-editor";

export default async function AdminProjectDetailPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <AdminProjectEditorScreen projectId={projectId} />;
}
