import { AppShell } from "@/components/app-shell";
import { LeaveRequestForm } from "@/components/interactive";
import { Badge, GlassCard, MetricCard } from "@/components/ui";

export default function LeavePage() {
  return (
    <AppShell role="engineer" activeHref="/app/engineer/offline-sync" title="Leave Request" subtitle="Request time off and track your approvals" backHref="/app/engineer">
      <LeaveRequestForm />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Total Requests" value="12" icon="CalendarDays" tone="violet" />
        <MetricCard label="Pending" value="2" icon="Timer" tone="amber" />
        <MetricCard label="Approved" value="8" icon="CheckCircle2" tone="green" />
        <MetricCard label="Rejected" value="2" icon="AlertTriangle" tone="red" />
      </div>
      <GlassCard className="p-4">
        {[
          ["Casual Leave", "20 May 2025 - 22 May 2025", "Pending", "Family function"],
          ["Earned Leave", "10 May 2025 - 12 May 2025", "Approved", "Personal work"],
          ["Casual Leave", "05 Apr 2025 - 06 Apr 2025", "Rejected", "Personal work"]
        ].map(([type, dates, status, reason]) => (
          <div key={dates} className="border-b border-white/10 py-4 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{type}</h3>
                <p className="text-sm text-slate-300">{dates}</p>
                <p className="mt-2 text-sm text-slate-300">Reason: {reason}</p>
              </div>
              <Badge tone={status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber"}>{status}</Badge>
            </div>
          </div>
        ))}
      </GlassCard>
    </AppShell>
  );
}
