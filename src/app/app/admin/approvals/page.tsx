import { AppShell } from "@/components/app-shell";
import { AccessApprovalConsole, ApprovalQueue } from "@/components/interactive";
import { MetricCard } from "@/components/ui";

export default function ApprovalsPage() {
  return (
    <AppShell
      role="admin"
      activeHref="/app/admin/approvals"
      title="Approvals Center"
      subtitle="Review and take action on pending requests"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Attendance Approvals" value="12" sub="Pending" icon="CalendarDays" tone="blue" />
        <MetricCard label="Finance Approvals" value="8" sub="Pending" icon="ReceiptIndianRupee" tone="violet" />
        <MetricCard label="Leave Requests" value="5" sub="Pending" icon="CalendarDays" tone="green" />
        <MetricCard label="Overtime Requests" value="3" sub="Pending" icon="Timer" tone="amber" />
      </div>
      <div className="flex gap-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-2 thin-scrollbar">
        {["All Requests", "Attendance", "Finance", "Leave", "Overtime"].map((tab) => (
          <button key={tab} className="min-h-11 shrink-0 rounded-xl px-4 text-sm text-slate-200 first:bg-telgo-cyan/12 first:text-telgo-cyan" type="button">
            {tab}
          </button>
        ))}
      </div>
      <AccessApprovalConsole />
      <ApprovalQueue />
    </AppShell>
  );
}
