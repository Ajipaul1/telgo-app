import { AppShell } from "@/components/app-shell";
import { FinanceCharts } from "@/components/dashboard-blocks";
import { FinanceRequestsBoard } from "@/components/interactive";
import { MetricCard, GlassCard, SectionHeader, Badge } from "@/components/ui";
import { formatInr } from "@/lib/utils";

export default function FinancePage() {
  return (
    <AppShell role="finance" activeHref="/app/admin/finance" title="Financial Overview" subtitle="Track spendings, budgets and project finances">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Total Spent" value={formatInr(24578320)} sub="▲ 12.5% vs last month" icon="WalletCards" tone="blue" />
        <MetricCard label="Total Budget" value={formatInr(35000000)} sub="No change" icon="IndianRupee" tone="green" />
        <MetricCard label="Budget Utilization" value="70.2%" sub="▲ 8.2% vs last month" icon="Gauge" tone="violet" />
        <MetricCard label="Pending Approvals" value={formatInr(1876450)} sub="▲ 15.3% vs last month" icon="FileText" tone="amber" />
      </div>
      <FinanceRequestsBoard />
      <FinanceCharts />
      <GlassCard className="p-4">
        <SectionHeader title="Recent Transactions" action={<span className="text-sm text-telgo-cyan">View All</span>} />
        <div className="divide-y divide-white/10">
          {[
            ["Fuel Purchase - Thrissur Site", "RDSS Imperial Commissioning", 125600, "Approved"],
            ["Equipment Repair - Panangad", "Panangad HDD Crossing", 78450, "Pending"],
            ["Materials - Cable Drum", "CIAL 33kV UG Cable Laying", 96320, "Approved"]
          ].map(([title, subtitle, amount, status]) => (
            <div key={String(title)} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-slate-300">{subtitle}</p>
              </div>
              <p>{formatInr(Number(amount))}</p>
              <Badge tone={status === "Approved" ? "green" : "amber"}>{status}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
