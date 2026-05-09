import { AppShell } from "@/components/app-shell";
import { AlertsList } from "@/components/dashboard-blocks";
import { MetricCard } from "@/components/ui";

export default function AlertsPage() {
  return (
    <AppShell role="admin" activeHref="/app/admin/alerts" title="Emergency Alerts" subtitle="Critical issues that require immediate attention">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Critical Alerts" value="3" sub="Require immediate action" icon="AlertTriangle" tone="red" />
        <MetricCard label="High Priority" value="7" sub="Needs attention" icon="Siren" tone="amber" />
        <MetricCard label="Warnings" value="12" sub="Monitor closely" icon="AlertTriangle" tone="amber" />
        <MetricCard label="Resolved Today" value="8" sub="Issues resolved" icon="CheckCircle2" tone="green" />
      </div>
      <div className="flex gap-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-2 thin-scrollbar">
        {["All Alerts", "Critical (3)", "High (7)", "Warnings (12)", "Resolved"].map((tab) => (
          <button key={tab} className="min-h-11 shrink-0 rounded-xl px-4 text-sm text-slate-200 first:bg-red-500/12 first:text-telgo-red" type="button">
            {tab}
          </button>
        ))}
      </div>
      <AlertsList />
      <MetricCard label="Avg. Resolution Time" value="1h 45m" sub="-15% vs yesterday" icon="Timer" tone="green" />
    </AppShell>
  );
}
