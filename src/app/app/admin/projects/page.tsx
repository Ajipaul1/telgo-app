import { AppShell } from "@/components/app-shell";
import {
  ActivityList,
  ProjectOverviewGrid,
  QuickActions,
  TeamRail
} from "@/components/dashboard-blocks";
import { LiveMap } from "@/components/live-map";
import { projects } from "@/lib/demo-data";
import { formatMeters, getGoogleMapsDirectionsUrl, getProgressMeters, getRemainingMeters } from "@/lib/project-corridor";
import { Badge, GlassCard, MetricCard, SectionHeader, StatStrip } from "@/components/ui";
import { formatInr } from "@/lib/utils";

export default function ProjectsPage() {
  const project = projects[0];
  const corridor = project.corridor;
  return (
    <AppShell
      role="admin"
      activeHref="/app/admin/projects"
      title={project.name}
      subtitle={`${project.location} - Project ID: ${project.code}`}
      backHref="/app/admin"
    >
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-2 thin-scrollbar">
        {["Overview", "Progress", "Engineers", "Logs", "Expenses", "Files", "Settings"].map((tab) => (
          <button key={tab} className="min-h-11 shrink-0 rounded-xl px-4 text-sm text-slate-200 first:bg-telgo-cyan/12 first:text-telgo-cyan" type="button">
            {tab}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Overall Progress" value={`${project.progress}%`} sub="Behind: 17%" icon="Gauge" tone="green" />
        <MetricCard label="Corridor Length" value={corridor ? formatMeters(corridor.totalMeters) : `${project.totalLengthKm} km`} sub={corridor ? `${corridor.startLabel} to ${corridor.endLabel}` : "Project route"} icon="Map" tone="amber" />
        <MetricCard label="Budget vs Spent" value={formatInr(project.budget)} sub={`${formatInr(project.spent)} spent`} icon="IndianRupee" tone="violet" />
      </div>
      <GlassCard className="p-4">
        <StatStrip
          items={[
            { label: "Total Length", value: corridor ? formatMeters(corridor.totalMeters) : `${project.totalLengthKm} km`, icon: "Activity", tone: "cyan" },
            { label: "Completed", value: formatMeters(getProgressMeters(project)), icon: "CheckCircle2", tone: "green" },
            { label: "Pending", value: formatMeters(getRemainingMeters(project)), icon: "Timer", tone: "amber" },
            { label: "Geofence", value: corridor ? formatMeters(corridor.geofenceMeters) : "120 m", icon: "Circle", tone: "violet" }
          ]}
        />
      </GlassCard>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <GlassCard className="p-4">
          <SectionHeader title="Project Location" action={<Badge tone="green">Active</Badge>} />
          <LiveMap compact focusProjectId={project.id} />
        </GlassCard>
        <GlassCard className="p-4">
          <SectionHeader
            title="Project Summary"
            action={
              <a
                href={getGoogleMapsDirectionsUrl(project)}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-telgo-cyan"
              >
                Open in Google Maps
              </a>
            }
          />
          <p className="leading-relaxed text-slate-300">
            Underground cable laying corridor between Vadakkekotta Metro Station and SN Junction Metro Station.
            The route is seeded as a 400 meter utility stretch, with the first 100 meters already marked
            complete for field progress representation on the admin map.
          </p>
          <div className="mt-5 space-y-4">
            {[
              ["Client", project.client],
              ["Corridor", corridor ? `${corridor.startLabel} -> ${corridor.endLabel}` : "N/A"],
              ["Project Manager", project.manager],
              ["Site In-Charge", project.siteInCharge],
              ["Latest Update", corridor?.progressUpdates[0]?.detail ?? "No update yet"]
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
      <ActivityList />
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamRail />
        <GlassCard className="p-4">
          <SectionHeader title="Site Health" action={<span className="text-sm text-telgo-cyan">View Details</span>} />
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="grid h-36 w-36 place-items-center rounded-full border-[12px] border-green-400/80 border-r-white/10">
              <span className="text-center text-xl font-semibold text-telgo-green">Good<br /><span className="text-white">82/100</span></span>
            </div>
            <div className="space-y-2">
              {["Safety 85/100", "Quality 80/100", "Progress 82/100", "Compliance 81/100"].map((item) => (
                <p key={item} className="flex justify-between border-b border-white/10 pb-2 text-slate-300">
                  <span>{item.split(" ")[0]}</span>
                  <span className="text-telgo-green">{item.split(" ")[1]}</span>
                </p>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
      <QuickActions variant="project" />
      <div className="hidden">
        <ProjectOverviewGrid />
      </div>
    </AppShell>
  );
}
