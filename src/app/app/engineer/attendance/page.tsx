import { AppShell } from "@/components/app-shell";
import { AttendanceAction } from "@/components/interactive";
import { LiveMap } from "@/components/live-map";
import { projects } from "@/lib/demo-data";
import { formatMeters } from "@/lib/project-corridor";
import { Badge, GlassCard, MetricCard, StatStrip } from "@/components/ui";

export default function AttendancePage() {
  const project = projects[0];
  const corridor = project.corridor;
  return (
    <AppShell
      role="engineer"
      activeHref="/app/engineer/attendance"
      title="GPS Attendance"
      subtitle="Location is requested only when you tap Mark Attendance"
      backHref="/app/engineer"
    >
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-telgo-cyan">Current Project</p>
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <p className="text-slate-300">{project.location}</p>
          </div>
          <Badge tone="green">GPS on Check-In Only</Badge>
        </div>
      </GlassCard>
      <GlassCard className="overflow-hidden p-0">
        <LiveMap compact focusProjectId={project.id} className="h-[420px] rounded-none border-0" />
        <div className="p-4">
          <StatStrip
            items={[
              { label: "Start Point", value: corridor?.startLabel ?? project.location, icon: "MapPin", tone: "blue" },
              { label: "Distance from Site", value: "Captured on check-in", icon: "LocateFixed", tone: "green" },
              { label: "Accuracy", value: "Live GPS at mark time", icon: "Gauge", tone: "green" },
              { label: "Geofence", value: corridor ? formatMeters(corridor.geofenceMeters) : "120 m", icon: "Circle", tone: "cyan" }
            ]}
          />
        </div>
      </GlassCard>
      <AttendanceAction />
      <MetricCard
        label="Working Hours"
        value="04h 32m"
        sub="This week 26h 15m | This month 96h 40m"
        icon="Timer"
        tone="blue"
      />
    </AppShell>
  );
}
