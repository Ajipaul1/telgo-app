import Image from "next/image";
import Link from "next/link";
import { activities, alerts, engineers, projects, sitePhotos } from "@/lib/demo-data";
import {
  formatMeters,
  getGoogleMapsDirectionsUrl,
  getProgressMeters,
  getRemainingMeters,
  hasCorridor
} from "@/lib/project-corridor";
import { formatInr } from "@/lib/utils";
import type { Project, StatusTone } from "@/lib/types";
import {
  Badge,
  GlassCard,
  Icon,
  MetricCard,
  ProgressRing,
  ProjectImage,
  SectionHeader,
  StatStrip,
  TextLink,
  toneClasses
} from "@/components/ui";
import { LiveMap } from "@/components/live-map";

export function ProjectHero({ project = projects[0] }: { project?: Project }) {
  return (
    <GlassCard className="p-4">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="grid h-24 w-24 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
          <Icon name="RadioTower" className="h-12 w-12" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <Badge tone={project.status === "At Risk" ? "amber" : "green"}>{project.status}</Badge>
          </div>
          <p className="mt-2 flex items-center gap-2 text-slate-300">
            <Icon name="MapPin" className="h-4 w-4" />
            {project.location}
          </p>
          <p className="mt-1 flex items-center gap-2 text-slate-300">
            <Icon name="CalendarDays" className="h-4 w-4" />
            {project.startDate} - {project.endDate}
          </p>
        </div>
        <ProgressRing value={project.progress} />
      </div>
    </GlassCard>
  );
}

export function QuickActions({
  variant = "engineer"
}: {
  variant?: "engineer" | "admin" | "project";
}) {
  const actions =
    variant === "admin"
      ? [
          ["Add New Site", "Building2", "/app/admin/projects", "blue"],
          ["Send Alert", "Siren", "/app/admin/alerts", "red"],
          ["Generate Report", "FileText", "/app/admin/finance", "green"],
          ["Site Attendance", "UserCheck", "/app/admin/staff", "cyan"],
          ["Finance Overview", "IndianRupee", "/app/admin/finance", "violet"]
        ]
      : [
          ["Add Site Log", "ClipboardList", "/app/engineer/logs", "blue"],
          ["Upload Photos", "Camera", "/app/engineer/logs", "green"],
          ["Finance Request", "ReceiptIndianRupee", "/app/engineer/finance-request", "amber"],
          ["Add Alert", "AlertTriangle", "/app/admin/alerts", "red"],
          ["Mark Attendance", "UserCheck", "/app/engineer/attendance", "cyan"]
        ];

  return (
    <GlassCard className="p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {actions.map(([label, icon, href, tone]) => (
          <Link
            key={label}
            href={href}
            className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-2 text-center text-sm text-white transition hover:border-telgo-cyan/50"
          >
            <Icon name={icon} className={`h-7 w-7 ${toneClasses[tone as StatusTone].split(" ")[0]}`} />
            {label}
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}

export function ActivityList({ dense = false }: { dense?: boolean }) {
  return (
    <GlassCard className="p-4">
      <SectionHeader title={dense ? "Recent Activity" : "Project Activity"} action={<TextLink href="/app/engineer/logs">View All</TextLink>} />
      <div className="divide-y divide-white/10">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${toneClasses[activity.tone]}`}>
              <Icon name={activity.icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-white">{activity.title}</p>
              <p className="text-sm text-slate-300">{activity.subtitle}</p>
            </div>
            <div className="text-right text-sm text-slate-300">
              <p>{activity.time}</p>
              {activity.amount ? <p className="mt-1 text-white">{activity.amount}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function ProjectOverviewGrid() {
  const project = projects[0];
  const corridor = project.corridor;
  const progressStages = hasCorridor(project)
    ? [
        ["Planning", 100, "green"],
        ["Barricading", 100, "green"],
        ["Excavation", 100, "green"],
        ["Cable Laying", Math.round((project.corridor.completedMeters / project.corridor.totalMeters) * 100), "blue"],
        ["Jointing", 0, "slate"],
        ["Restoration", 0, "slate"]
      ]
    : [
        ["Planning", 100, "green"],
        ["Mobilization", 100, "green"],
        ["Trenching", 100, "green"],
        ["Cable Laying", 72, "blue"],
        ["Jointing", 0, "slate"],
        ["Backfilling", 0, "slate"]
      ];
  return (
    <div className="space-y-4">
      <ProjectHero project={project} />
      <GlassCard className="p-4">
        <SectionHeader title="Project Summary" action={<span className="text-sm text-slate-300">Last updated: Today, 08:35 AM</span>} />
        <StatStrip
          items={[
            { label: "Total Length", value: corridor ? formatMeters(corridor.totalMeters) : `${project.totalLengthKm} km`, icon: "Activity", tone: "cyan" },
            { label: "Completed", value: formatMeters(getProgressMeters(project)), icon: "CheckCircle2", tone: "green" },
            { label: "Remaining", value: formatMeters(getRemainingMeters(project)), icon: "Wrench", tone: "amber" },
            { label: "Start Date", value: project.startDate, icon: "CalendarDays", tone: "slate" }
          ]}
        />
      </GlassCard>
      <GlassCard className="p-4">
        <SectionHeader title="Progress Overview" action={<TextLink href="/app/admin/projects">View Details</TextLink>} />
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {progressStages.map(([label, value, tone]) => (
            <div key={label} className="text-center">
              <div className={`mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full border ${toneClasses[tone as StatusTone]}`}>
                <Icon name={Number(value) >= 100 ? "Check" : "Circle"} className="h-5 w-5" />
              </div>
              <p className="text-sm text-slate-200">{label}</p>
              <p className={toneClasses[tone as StatusTone].split(" ")[0]}>{value}%</p>
            </div>
          ))}
        </div>
      </GlassCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityList />
        <GlassCard className="p-4">
          <SectionHeader title="Project Map" action={<TextLink href="/app/admin/map">View Full Map</TextLink>} />
          <LiveMap compact focusProjectId={project.id} />
        </GlassCard>
      </div>
      <DocumentsRail />
      <TeamRail />
    </div>
  );
}

export function DocumentsRail() {
  const docs = [
    ["Site Report - May 11", "PDF · 2.4 MB", "red"],
    ["Material Statement", "XLSX · 48 KB", "green"],
    ["Method Statement", "DOCX · 1.1 MB", "blue"],
    ["Drawing Revision", "PDF · 3.8 MB", "amber"]
  ];
  return (
    <GlassCard className="p-4">
      <SectionHeader title="Recent Documents" action={<TextLink href="/app/admin/projects">View All</TextLink>} />
      <div className="flex gap-3 overflow-x-auto pb-1 thin-scrollbar">
        {docs.map(([title, meta, tone]) => (
          <div key={title} className="min-w-[220px] rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <span className={`mb-4 inline-grid h-10 w-10 place-items-center rounded-lg ${toneClasses[tone as StatusTone]}`}>
              <Icon name="FileText" />
            </span>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-slate-300">{meta}</p>
            <p className="mt-4 text-sm text-slate-400">Today, 08:15 AM</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function TeamRail() {
  return (
    <GlassCard className="p-4">
      <SectionHeader title="Team Members (12)" action={<TextLink href="/app/admin/staff">View All</TextLink>} />
      <div className="flex gap-3 overflow-x-auto pb-1 thin-scrollbar">
        {engineers.map((engineer) => (
          <div key={engineer.id} className="flex min-w-[190px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-white/10">
              <Image src={engineer.avatar} alt={engineer.name} fill className="object-cover" />
            </div>
            <div>
              <p className="font-medium">{engineer.name}</p>
              <p className="text-sm text-slate-300">{engineer.role}</p>
            </div>
          </div>
        ))}
        <div className="grid min-w-16 place-items-center rounded-xl border border-white/10 text-slate-300">
          +8
        </div>
      </div>
    </GlassCard>
  );
}

export function AdminMapSummary() {
  const project = projects[0];
  const corridor = project.corridor;
  return (
    <GlassCard className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Live Operations Map</h2>
          <div className="mt-2 flex gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-telgo-green" />Completed segment</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-telgo-cyan" />Active corridor</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-telgo-amber" />Geofence ready</span>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={getGoogleMapsDirectionsUrl(project)}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white"
          >
            Open Route
          </a>
          <Link href="/app/admin/map" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white">
            View Full Map
          </Link>
        </div>
      </div>
      {corridor ? (
        <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-400">Corridor</p>
            <p className="font-medium text-white">{corridor.startLabel} to {corridor.endLabel}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Completed</p>
            <p className="font-medium text-telgo-green">{formatMeters(corridor.completedMeters)} of {formatMeters(corridor.totalMeters)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Remaining</p>
            <p className="font-medium text-telgo-cyan">{formatMeters(corridor.totalMeters - corridor.completedMeters)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Latest field update</p>
            <p className="font-medium text-white">{corridor.progressUpdates[0]?.recordedAt ?? "No update yet"}</p>
          </div>
        </div>
      ) : null}
      <LiveMap compact />
    </GlassCard>
  );
}

export function ActiveProjectsGrid() {
  return (
    <GlassCard className="p-4">
      <SectionHeader title="Active Projects" action={<TextLink href="/app/admin/projects">View All Projects</TextLink>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {projects.map((project) => (
          <Link
            href="/app/admin/projects"
            key={project.id}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]"
          >
            <ProjectImage src={project.image} alt={project.name} className="h-32 rounded-none" />
            <div className="p-3">
              <div className="flex items-start gap-2">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${project.accent === "amber" ? "bg-telgo-amber" : project.accent === "green" ? "bg-telgo-green" : project.accent === "violet" ? "bg-telgo-violet" : "bg-telgo-cyan"}`} />
                <div>
                  <p className="font-semibold">{project.name}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-slate-300">
                    <Icon name="MapPin" className="h-4 w-4" />
                    {project.location}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-telgo-cyan" style={{ width: `${project.progress}%` }} />
                </div>
                <span className="text-sm text-telgo-cyan">{project.progress}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}

export function AlertsList({ compact = false }: { compact?: boolean }) {
  return (
    <GlassCard className="p-4">
      <SectionHeader title={compact ? "Recent Alerts" : "All Alerts"} action={<TextLink href="/app/admin/alerts">View All</TextLink>} />
      <div className="divide-y divide-white/10">
        {alerts.slice(0, compact ? 3 : alerts.length).map((alert) => {
          const tone = alert.severity === "Critical" ? "red" : alert.severity === "High" ? "amber" : "amber";
          return (
            <div key={alert.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <span className={`grid h-14 w-14 place-items-center rounded-full border ${toneClasses[tone]}`}>
                <Icon name="AlertTriangle" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{alert.title}</h3>
                  <Badge tone={tone as StatusTone}>{alert.severity}</Badge>
                </div>
                <p className="text-sm text-slate-300">{alert.project}</p>
                <p className="mt-2 text-sm text-slate-300">{alert.detail}</p>
              </div>
              <div className="text-sm text-slate-300 sm:text-right">
                <p>{alert.time}</p>
                <button type="button" className={`mt-3 rounded-xl border px-4 py-2 ${toneClasses[tone]}`}>
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

export function FinanceCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-4 lg:col-span-2">
        <SectionHeader title="Spending Trend" action={<Badge tone="slate">Monthly</Badge>} />
        <div className="relative h-64 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4">
          <svg viewBox="0 0 720 220" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="trend" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#178bff" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#178bff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[40, 80, 120, 160].map((y) => (
              <line key={y} x1="0" x2="720" y1={y} y2={y} stroke="rgba(255,255,255,.12)" />
            ))}
            <path d="M20 170 C120 145 170 140 240 132 C330 120 410 90 500 78 C580 66 650 110 700 92" fill="none" stroke="#178bff" strokeWidth="5" />
            <path d="M20 170 C120 145 170 140 240 132 C330 120 410 90 500 78 C580 66 650 110 700 92 L700 220 L20 220 Z" fill="url(#trend)" />
            <path d="M20 135 C150 118 230 98 330 82 C430 84 500 45 600 38 C650 35 690 58 710 50" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeDasharray="10 12" />
          </svg>
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <SectionHeader title="Project Wise Spending" action={<TextLink href="/app/admin/projects">View All</TextLink>} />
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center gap-3">
              <ProjectImage src={project.image} alt={project.name} className="h-14 w-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{project.name}</p>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-telgo-cyan" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
              <span className="text-telgo-cyan">{project.progress}%</span>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <SectionHeader title="Expense Categories" action={<Badge tone="slate">This Month</Badge>} />
        <div className="grid place-items-center">
          <div className="grid h-56 w-56 place-items-center rounded-full bg-[conic-gradient(#178bff_0_36%,#7c3cff_36%_60%,#22e052_60%_78%,#ff9f0a_78%_90%,#05d9ff_90%_100%)]">
            <div className="grid h-28 w-28 place-items-center rounded-full bg-ink-950 text-center">
              <span>
                <strong className="block text-lg">₹45,32,000</strong>
                <span className="text-sm text-slate-300">Total</span>
              </span>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export function EngineerTaskList() {
  return (
    <GlassCard className="p-4">
      <SectionHeader title="Today's Tasks" action={<TextLink href="/app/engineer/logs">View All</TextLink>} />
      <div className="divide-y divide-white/10">
        {[
          ["Cable Laying - Stretch 1", "Vadakkekotta to 100 m corridor point", "Completed", "04:30 PM", "green"],
          ["Barricading & Safety Signage", "Vadakkekotta station approach", "In Progress", "05:00 PM", "amber"],
          ["Utility Crossing Review", "SN Junction side", "Pending", "06:15 PM", "blue"]
        ].map(([title, subtitle, status, time, tone]) => (
          <div key={title} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center">
            <span className={`grid h-12 w-12 place-items-center rounded-full border ${toneClasses[tone as StatusTone]}`}>
              <Icon name={tone === "green" ? "Check" : tone === "amber" ? "Timer" : "FileText"} />
            </span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-slate-300">{subtitle}</p>
            </div>
            <Badge tone={tone as StatusTone}>{status}</Badge>
            <span className="text-sm text-slate-300">{time}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function PhotosGrid() {
  return (
    <GlassCard className="p-4">
      <SectionHeader title="Work Photos" action={<span className="text-sm text-telgo-cyan">+ Add Photos</span>} />
      <div className="grid grid-cols-2 gap-3">
        {sitePhotos.map((photo, index) => (
          <div key={photo} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
            <div className="relative h-40">
              <Image src={photo} alt="Work photo" fill className="object-cover" />
            </div>
            <div className="p-3">
              <p className="font-medium">{["KP-1 to KP-2 Drilling", "Drill Pipe Setup", "Entry Point Setup", "Drilling in Progress", "Hole Pilot Drilling", "Mud Circulation Check"][index]}</p>
              <p className="text-xs text-slate-400">12 May 2025 · 09:{15 + index * 10} AM</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

export function ClientTransparency() {
  const project = projects[0];
  return (
    <div className="space-y-4">
      <ProjectHero project={project} />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Overall Progress" value={`${project.progress}%`} sub="On schedule" icon="Gauge" tone="green" />
        <MetricCard label="Photos Uploaded" value="126" sub="18 this week" icon="Camera" tone="cyan" />
        <MetricCard label="Open Escalations" value="1" sub="MD monitoring" icon="Siren" tone="red" />
      </div>
      <GlassCard className="p-4">
        <SectionHeader title="Client Timeline" action={<Badge tone="green">Transparent</Badge>} />
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-full border ${toneClasses[activity.tone]}`}>
                <Icon name={activity.icon} />
              </span>
              <div>
                <p className="font-medium">{activity.title}</p>
                <p className="text-sm text-slate-300">{activity.subtitle}</p>
              </div>
              <span className="ml-auto text-sm text-slate-400">{activity.time}</span>
            </div>
          ))}
        </div>
      </GlassCard>
      <DocumentsRail />
      <GlassCard className="p-4">
        <SectionHeader title="MD Escalation" action={<Badge tone="amber">Monitored</Badge>} />
        <p className="text-slate-300">Critical blockers, major schedule risks, and finance holds are routed to leadership with full context and attachments.</p>
      </GlassCard>
    </div>
  );
}
