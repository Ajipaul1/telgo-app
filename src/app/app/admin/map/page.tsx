import { AppShell } from "@/components/app-shell";
import { LiveMap } from "@/components/live-map";
import { engineers } from "@/lib/demo-data";
import { Badge, GlassCard, Icon, MetricCard, SectionHeader } from "@/components/ui";

export default function LiveOperationsMapPage() {
  return (
    <AppShell role="admin" activeHref="/app/admin/map" title="Live Map" subtitle="Kerala Operations">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Moving Engineers" value="34" sub="● Live" icon="Activity" tone="cyan" />
        <MetricCard label="Idle Engineers" value="12" sub="● Idle" icon="Users" tone="amber" />
        <MetricCard label="Alerts" value="7" sub="● Active" icon="AlertTriangle" tone="red" />
        <MetricCard label="Sites Online" value="24 / 28" sub="● Online" icon="RadioTower" tone="green" />
      </div>
      <LiveMap />
      <GlassCard className="p-4">
        <SectionHeader title="Live Engineers (34)" action={<span className="text-sm text-telgo-cyan">View All</span>} />
        <div className="grid gap-3">
          {engineers.slice(0, 3).map((engineer) => (
            <div key={engineer.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div>
                <h3 className="text-lg font-semibold">{engineer.name}</h3>
                <p className="text-slate-300">{engineer.site}</p>
                <p className="text-sm text-slate-400">{engineer.location}</p>
              </div>
              <Badge tone={engineer.status === "Idle" ? "amber" : "cyan"}>{engineer.status}</Badge>
              <div className="text-sm text-slate-300">
                <p>{engineer.speed}</p>
                <p className="flex items-center gap-1">
                  <Icon name="Gauge" className="h-4 w-4" />
                  {engineer.battery}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </AppShell>
  );
}
