import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  ActivityList,
  EngineerTaskList,
  QuickActions
} from "@/components/dashboard-blocks";
import { LiveMap } from "@/components/live-map";
import { projects } from "@/lib/demo-data";
import { Badge, GlassCard, MetricCard, ProjectImage, SectionHeader } from "@/components/ui";

export default function EngineerHomePage() {
  const project = projects[0];
  return (
    <AppShell role="engineer" activeHref="/app/engineer" title="Good Morning, Arjun 👋" subtitle="Site Engineer">
      <GlassCard className="p-4">
        <div className="grid gap-4 sm:grid-cols-[180px_1fr_auto] sm:items-center">
          <ProjectImage src={project.image} alt={project.name} className="h-28" />
          <div>
            <p className="text-sm text-telgo-cyan">Current Site</p>
            <h2 className="mt-1 text-2xl font-semibold">{project.name}</h2>
            <p className="mt-1 text-slate-300">{project.location}</p>
          </div>
          <Link href="/app/admin/projects" className="rounded-xl border border-white/10 px-5 py-3 text-center">
            View Project →
          </Link>
        </div>
      </GlassCard>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Today's Tasks" value="5/8" sub="Completed" icon="CheckCircle2" tone="green" />
        <MetricCard label="Work Hours" value="04:32" sub="Hours" icon="Timer" tone="blue" />
        <MetricCard label="Distance Covered" value="12.6" sub="km" icon="MapPin" tone="amber" />
        <MetricCard label="Reports" value="1" sub="Submitted" icon="ClipboardList" tone="violet" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_.95fr]">
        <EngineerTaskList />
        <div className="space-y-4">
          <GlassCard className="p-4">
            <SectionHeader title="Site Status" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-telgo-green">Good</p>
                <p className="text-slate-300">All operations are running as per plan</p>
              </div>
              <Badge tone="green">Verified</Badge>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <SectionHeader title="Site Quick Actions" />
            <div className="grid gap-2">
              {[
                ["Mark Attendance", "/app/engineer/attendance"],
                ["Daily Site Log", "/app/engineer/logs"],
                ["Upload Photos", "/app/engineer/logs"],
                ["Finance Request", "/app/engineer/finance-request"],
                ["End Shift Report", "/app/engineer/shift-report"]
              ].map(([label, href]) => (
                <Link key={label} href={href} className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-4">
                  {label}
                  <span>›</span>
                </Link>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
      <GlassCard className="p-4">
        <SectionHeader title="Live Location" action={<Link href="/app/engineer/attendance" className="inline-flex min-h-9 items-center rounded-lg px-1 text-sm text-telgo-cyan">View on Map</Link>} />
        <LiveMap compact focusProjectId={project.id} />
      </GlassCard>
      <ActivityList dense />
      <QuickActions />
    </AppShell>
  );
}
