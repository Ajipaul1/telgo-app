import {
  MobileCard,
  MobileInput,
  MobilePrimaryButton,
  MobileSelect,
  MobileShell,
  MobileUploadBox
} from "@/components/mobile-kit";

export default function AdminProjectCreatePage() {
  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin/projects"
      title="Add New Project"
      subtitle="Create a new project"
      backHref="/app/admin/projects"
      leftMode="back"
      bottomNav={false}
    >
      <div className="space-y-6">
        <MobileCard>
          <div className="space-y-4">
            <MobileUploadBox title="Upload Image" detail="JPG, PNG up to 5MB" />
            <MobileInput label="Project Name" placeholder="Enter project name" />
            <MobileInput label="Location" placeholder="Enter project location" />
            <MobileInput label="Total Distance (KM)" placeholder="Enter total distance" />
            <MobileInput label="Start Date" placeholder="Select start date" />
            <MobileInput label="Expected End Date" placeholder="Select end date" />
            <MobileSelect label="Project Manager" defaultValue="Select manager" />
          </div>
        </MobileCard>
        <MobilePrimaryButton href="/app/admin/projects">Create Project</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}
