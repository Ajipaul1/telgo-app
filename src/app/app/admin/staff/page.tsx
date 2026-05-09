import { AppShell } from "@/components/app-shell";
import { engineers } from "@/lib/demo-data";
import { Badge, GlassCard, Icon, MetricCard, SectionHeader } from "@/components/ui";

export default function StaffTrackerPage() {
  return (
    <AppShell role="supervisor" activeHref="/app/admin/staff" title="Staff Tracker" subtitle="Monitor engineer activity and location in real time">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Total Engineers" value="156" sub="100%" icon="Building2" tone="blue" />
        <MetricCard label="Active" value="112" sub="71.8%" icon="Users" tone="green" />
        <MetricCard label="Idle" value="21" sub="13.5%" icon="Timer" tone="amber" />
        <MetricCard label="Inactive" value="12" sub="7.7%" icon="User" tone="slate" />
        <MetricCard label="Stagnant > 30m" value="11" sub="7.1%" icon="AlertTriangle" tone="red" />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input className="min-h-12 rounded-xl border border-white/10 bg-white/[0.03] px-4 outline-none focus:border-telgo-cyan" placeholder="Search by name, role or site..." />
        <button className="min-h-12 rounded-xl border border-white/10 px-5 text-white" type="button">Filters</button>
        <button className="min-h-12 rounded-xl border border-white/10 px-5 text-white" type="button">All Sites</button>
      </div>
      <GlassCard className="overflow-hidden p-0">
        <div className="grid grid-cols-[1.2fr_1.1fr_.8fr_.7fr_auto] gap-3 border-b border-white/10 p-4 text-sm text-slate-300">
          <span>Engineer</span>
          <span>Site & Project</span>
          <span>Status</span>
          <span>Last Update</span>
          <span />
        </div>
        {engineers.concat(engineers).map((engineer, index) => (
          <div key={`${engineer.id}-${index}`} className="grid grid-cols-1 gap-3 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[1.2fr_1.1fr_.8fr_.7fr_auto] sm:items-center">
            <div>
              <p className="font-semibold">{engineer.name}</p>
              <p className="text-sm text-slate-300">{engineer.role}</p>
            </div>
            <div>
              <p>{engineer.site}</p>
              <p className="text-sm text-slate-400">{engineer.location}</p>
            </div>
            <Badge tone={engineer.status === "Active" || engineer.status === "Moving" ? "green" : engineer.status === "Idle" ? "amber" : engineer.status === "Stagnant" ? "red" : "slate"}>
              {engineer.status}
            </Badge>
            <p className="text-sm text-slate-300">{engineer.lastUpdate}</p>
            <button className="grid h-11 w-11 place-items-center rounded-xl border border-telgo-cyan/40 text-telgo-cyan" type="button">
              <Icon name="MapPin" />
            </button>
          </div>
        ))}
      </GlassCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-4">
          <SectionHeader title="Stagnant Engineers" />
          {["Nikhil Raj 52m", "Jithin Jose 1h 12m", "Manu Mohan 45m"].map((item) => (
            <p key={item} className="flex justify-between border-b border-white/10 py-3 last:border-b-0">
              <span>{item.replace(/\s\d.*/, "")}</span>
              <span className="text-telgo-red">{item.match(/\d.*/)?.[0]}</span>
            </p>
          ))}
        </GlassCard>
        <MetricCard label="Activity Summary" value="156" sub="112 active · 21 idle · 11 stagnant" icon="Gauge" tone="green" />
      </div>
    </AppShell>
  );
}
