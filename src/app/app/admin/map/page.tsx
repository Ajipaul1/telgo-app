import { AppShell } from "@/components/app-shell";
import { LiveMap } from "@/components/live-map";
import { engineers, projects } from "@/lib/demo-data";
import { formatMeters, getProgressMeters, getRemainingMeters } from "@/lib/project-corridor";
import { Badge, GlassCard, Icon, MetricCard, SectionHeader } from "@/components/ui";

export default function LiveOperationsMapPage() {
  const project = projects[0];
  const corridor = project.corridor;
  return (
    <AppShell role="admin" activeHref="/app/admin/map" title="Live Map" subtitle="Vadakkekotta Metro Station to SN Junction Metro Station">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Corridor Length" value={corridor ? formatMeters(corridor.totalMeters) : `${project.totalLengthKm} km`} sub="Google Maps ready" icon="Map" tone="cyan" />
        <MetricCard label="Completed Work" value={formatMeters(getProgressMeters(project))} sub={`${project.progress}% overall progress`} icon="Activity" tone="green" />
        <MetricCard label="Remaining Work" value={formatMeters(getRemainingMeters(project))} sub="Utility corridor balance" icon="AlertTriangle" tone="amber" />
        <MetricCard label="Attendance Geofence" value={corridor ? formatMeters(corridor.geofenceMeters) : "120 m"} sub="Checked on mark attendance" icon="RadioTower" tone="blue" />
      </div>
      <LiveMap />
      <GlassCard className="p-4">
        <SectionHeader title="Live Engineers on Corridor" action={<span className="text-sm text-telgo-cyan">View All</span>} />
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
