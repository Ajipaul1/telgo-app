import { AppShell } from "@/components/app-shell";
import {
  ActiveProjectsGrid,
  ActivityList,
  AdminMapSummary,
  AlertsList,
  QuickActions
} from "@/components/dashboard-blocks";
import { RoleNotificationsPanel } from "@/components/interactive";
import { MetricCard, TextLink } from "@/components/ui";

export default function AdminDashboardPage() {
  return (
    <AppShell
      role="admin"
      activeHref="/app/admin"
      title="Admin Dashboard"
      subtitle="Welcome back, Arjun Nair"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Active Sites" value="24" sub="▲ 12% vs last week" icon="Building2" tone="blue" />
        <MetricCard label="Engineers On Site" value="156" sub="▲ 8% vs last week" icon="Users" tone="violet" />
        <MetricCard label="Active Alerts" value="7" sub="▲ 3 new alerts" icon="AlertTriangle" tone="amber" />
        <MetricCard label="Pending Approvals" value="23" sub="▼ 5% vs last week" icon="CheckCircle2" tone="green" />
      </div>
      <RoleNotificationsPanel title="Admin Alerts & Escalations" />
      <AdminMapSummary />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Approvals Overview</h2>
            <TextLink href="/app/admin/approvals">View All</TextLink>
          </div>
          <div className="grid gap-3">
            <MetricCard label="Attendance Approvals" value="12" sub="pending requests" icon="CalendarDays" tone="blue" />
            <MetricCard label="Finance Approvals" value="8" sub="pending requests" icon="ReceiptIndianRupee" tone="violet" />
          </div>
        </section>
        <AlertsList compact />
      </div>
      <ActiveProjectsGrid />
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityList dense />
        <QuickActions variant="admin" />
      </div>
    </AppShell>
  );
}
