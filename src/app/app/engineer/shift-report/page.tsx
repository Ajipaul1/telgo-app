import { AppShell } from "@/components/app-shell";
import { ShiftReportForm } from "@/components/interactive";
import { projects } from "@/lib/demo-data";
import { Badge, GlassCard, Icon } from "@/components/ui";

export default function ShiftReportPage() {
  const project = projects[0];
  return (
    <AppShell role="engineer" activeHref="/app/engineer/shift-report" title="End Shift Report" subtitle="Complete your shift summary and submit" backHref="/app/engineer">
      <GlassCard className="p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-xl bg-violet-500/12 text-violet-300">
              <Icon name="RadioTower" className="h-9 w-9" />
            </span>
            <div>
              <p className="text-sm text-slate-300">Project</p>
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <p className="text-sm text-slate-300">{project.location}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-300">Shift</p>
            <Badge tone="blue">Day Shift</Badge>
            <p className="mt-2">08:00 AM - 05:00 PM</p>
          </div>
        </div>
      </GlassCard>
      <ShiftReportForm />
    </AppShell>
  );
}
