import { AppShell } from "@/components/app-shell";
import {
  ActivityList,
  ProjectOverviewGrid,
  QuickActions,
  TeamRail
} from "@/components/dashboard-blocks";
import { LiveMap } from "@/components/live-map";
import { projects } from "@/lib/demo-data";
import { Badge, GlassCard, MetricCard, SectionHeader, StatStrip } from "@/components/ui";
import { formatInr } from "@/lib/utils";

export default function ProjectsPage() {
  const project = projects[0];
  return (
    <AppShell
      role="admin"
      activeHref="/app/admin/projects"
      title={project.name}
      subtitle={`${project.location} · Project ID: ${project.code}`}
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
        <MetricCard label="Project Timeline" value="72" sub="Days remaining" icon="CalendarDays" tone="amber" />
        <MetricCard label="Budget vs Spent" value={formatInr(project.budget)} sub={`${formatInr(project.spent)} spent`} icon="IndianRupee" tone="violet" />
      </div>
      <GlassCard className="p-4">
        <StatStrip
          items={[
            { label: "Total Length", value: `${project.totalLengthKm} km`, icon: "Activity", tone: "cyan" },
            { label: "Completed", value: `${project.completedKm} km`, icon: "CheckCircle2", tone: "green" },
            { label: "Pending", value: `${(project.totalLengthKm - project.completedKm).toFixed(1)} km`, icon: "Timer", tone: "amber" },
            { label: "Teams Deployed", value: "8", icon: "Users", tone: "violet" }
          ]}
        />
      </GlassCard>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <GlassCard className="p-4">
          <SectionHeader title="Project Location" action={<Badge tone="green">Active</Badge>} />
          <LiveMap compact focusProjectId={project.id} />
        </GlassCard>
        <GlassCard className="p-4">
          <SectionHeader title="Project Summary" />
          <p className="leading-relaxed text-slate-300">
            Underground laying of 33kV power cable for CIAL expansion project. Includes excavation,
            cable laying, jointing, testing and restoration.
          </p>
          <div className="mt-5 space-y-4">
            {[
              ["Client", project.client],
              ["Contract Type", "EPC"],
              ["Project Manager", project.manager],
              ["Site In-Charge", project.siteInCharge]
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
