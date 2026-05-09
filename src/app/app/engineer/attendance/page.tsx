import { AppShell } from "@/components/app-shell";
import { AttendanceAction } from "@/components/interactive";
import { LiveMap } from "@/components/live-map";
import { projects } from "@/lib/demo-data";
import { Badge, GlassCard, MetricCard, SectionHeader, StatStrip } from "@/components/ui";

export default function AttendancePage() {
  const project = projects[0];
  return (
    <AppShell role="engineer" activeHref="/app/engineer/attendance" title="GPS Attendance" subtitle="Mark your attendance at site" backHref="/app/engineer">
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-telgo-cyan">Current Project</p>
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <p className="text-slate-300">{project.location}</p>
          </div>
          <Badge tone="green">● Within Range</Badge>
        </div>
      </GlassCard>
      <GlassCard className="overflow-hidden p-0">
        <LiveMap compact focusProjectId={project.id} className="h-[420px] rounded-none border-0" />
        <div className="p-4">
          <StatStrip
            items={[
              { label: "Your Location", value: "Kozhikode", icon: "MapPin", tone: "blue" },
              { label: "Distance from Site", value: "68 m", icon: "LocateFixed", tone: "green" },
              { label: "Accuracy", value: "7 m", icon: "Gauge", tone: "green" },
              { label: "Geofence", value: "100 m", icon: "Circle", tone: "cyan" }
            ]}
          />
        </div>
      </GlassCard>
      <AttendanceAction />
      <MetricCard label="Working Hours" value="04h 32m" sub="This week 26h 15m · This month 96h 40m" icon="Timer" tone="blue" />
    </AppShell>
  );
}
