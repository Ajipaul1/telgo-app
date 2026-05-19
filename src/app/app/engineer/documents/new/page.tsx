import {
  MobileCard,
  MobileInput,
  MobileSelect,
  MobileShell,
  MobileTextArea,
  MobileUploadBox
} from "@/components/mobile-kit";

export default function EngineerDocumentCreatePage() {
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/reports"
      title="Add Document"
      subtitle="Upload project files"
      backHref="/app/engineer/documents"
      leftMode="back"
      bottomNav={false}
    >
      <div className="space-y-6">
        <MobileCard>
          <div className="space-y-4">
            <MobileSelect label="Document Type" defaultValue="Select Type" />
            <MobileInput label="Document Name" placeholder="Enter document name" />
            <MobileUploadBox title="Upload File" detail="Drag & drop file here or choose file" />
            <MobileTextArea label="Description (Optional)" placeholder="Enter description" rows={4} />
          </div>
        </MobileCard>
        <button
          type="button"
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[0.98rem] font-bold text-white shadow-[0_14px_30px_rgba(92,45,255,0.22)]"
        >
          Upload Document
        </button>
      </div>
    </MobileShell>
  );
}
