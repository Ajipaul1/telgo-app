import { AppShell } from "@/components/app-shell";
import { FinanceRequestForm } from "@/components/interactive";
import { projects } from "@/lib/demo-data";
import { GlassCard, Icon } from "@/components/ui";

export default function FinanceRequestPage() {
  const project = projects[0];
  return (
    <AppShell role="engineer" activeHref="/app/engineer/logs" title="Finance Request" subtitle="Raise a request for advance or reimbursement" backHref="/app/engineer">
      <GlassCard className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-xl bg-violet-500/12 text-violet-300">
              <Icon name="RadioTower" className="h-9 w-9" />
            </span>
            <div>
              <p className="text-sm text-slate-300">Current Project</p>
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <p className="text-sm text-slate-300">{project.location}</p>
            </div>
          </div>
          <button className="hidden rounded-xl border border-white/10 px-4 py-3 sm:block" type="button">
            Change Project
          </button>
        </div>
      </GlassCard>
      <FinanceRequestForm />
    </AppShell>
  );
}
