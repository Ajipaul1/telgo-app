import {
  MobileCard,
  MobileInput,
  MobilePrimaryButton,
  MobileShell
} from "@/components/mobile-kit";

export default function AdminProfilePage() {
  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin/profile"
      title="Admin Profile"
      subtitle="Operations account and company details"
      backHref="/app/admin"
      leftMode="back"
    >
      <div className="space-y-6">
        <MobileCard>
          <h3 className="mb-4 text-[1.35rem] font-semibold text-[#121b44]">Account Details</h3>
          <div className="space-y-4">
            <MobileInput label="Full Name" defaultValue="Vishnu Prasad" />
            <MobileInput label="Email" defaultValue="admin@telgo.test" />
            <MobileInput label="Phone" defaultValue="+91 98470 11001" />
            <MobileInput label="Role" defaultValue="Operations Lead" />
            <MobileInput label="Office" defaultValue="Kerala Operations HQ" />
          </div>
        </MobileCard>
        <MobilePrimaryButton href="/app/admin">Save Changes</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}
