"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Eye,
  FileCheck2,
  FileClock,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  Gauge,
  IndianRupee,
  ListTodo,
  LocateFixed,
  MapPinned,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  Plus,
  ReceiptText,
  Search,
  Send,
  ShieldCheck,
  ShieldX,
  Signal,
  TrendingUp,
  Upload,
  UserPlus,
  UserRound,
  Users,
  WifiOff
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { chatMessages as seedChatMessages, approvals as seedApprovals, engineers as seedEngineers, projects, sitePhotos } from "@/lib/demo-data";
import {
  MobileActionTile,
  MobileAvatar,
  MobileCard,
  MobileFilterButton,
  MobileGradientCard,
  MobileInput,
  MobileMetricCard,
  MobilePill,
  MobilePrimaryButton,
  MobileProgressBar,
  MobileSearchBar,
  MobileSectionTitle,
  MobileSecondaryButton,
  MobileSelect,
  MobileShell,
  MobileTabBar,
  MobileTextArea,
  MobileUploadBox
} from "@/components/mobile-kit";
import { getCurrentUser, useOpsStore } from "@/store/ops-store";
import { useOfflineStore } from "@/store/offline-store";
import { supabase } from "@/lib/supabase/client";
import { cn, formatInr, initials } from "@/lib/utils";
import { formatMeters, getGoogleMapsDirectionsUrl, getProgressMeters, getRemainingMeters } from "@/lib/project-corridor";
import type { Approval, ChatMessage, Engineer, Project, Role } from "@/lib/types";

type WorkerRecord = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: "Active" | "On Leave" | "Inactive" | "On Site" | "Offline";
  project: string;
  location: string;
  joined: string;
  badge: string;
  avatar?: string;
};

type DocumentRecord = {
  id: string;
  name: string;
  type: "PDF" | "DOC" | "XLS" | "JPG";
  status: "Approved" | "Pending" | "Rejected";
  meta: string;
  author: string;
};

type TaskRecord = {
  id: string;
  title: string;
  detail: string;
  priority: "High" | "Medium" | "Low";
  time: string;
  status: "Pending" | "In Progress" | "Completed" | "Upcoming";
};

const adminProject = projects[0];
const engineerProject = projects[0];
const clientProject = projects[0];
const workerRecords: WorkerRecord[] = [
  {
    id: "eng-arjun",
    name: "Arjun Nair",
    role: "Site Engineer",
    email: "arjun.nair@telgo.com",
    phone: "+91 98765 43210",
    status: "Active",
    project: "Kottayam Utility Expansion",
    location: "Kottayam, Kerala",
    joined: "12 Apr 2024",
    badge: "Engineer",
    avatar: undefined
  },
  {
    id: "eng-vishnu",
    name: "Vishnu P",
    role: "Site Engineer",
    email: "vishnu.p@telgo.com",
    phone: "+91 91234 56789",
    status: "Active",
    project: "Kolenchery to Ernakulam Utility Link",
    location: "Ernakulam, Kerala",
    joined: "05 Dec 2023",
    badge: "Engineer",
    avatar: undefined
  },
  {
    id: "eng-rajeev",
    name: "Rajeev R",
    role: "Supervisor",
    email: "rajeev.r@telgo.com",
    phone: "+91 98470 11223",
    status: "On Site",
    project: "Kannur Smart Corridor",
    location: "Kannur, Kerala",
    joined: "15 Feb 2024",
    badge: "Supervisor",
    avatar: undefined
  },
  {
    id: "eng-divya",
    name: "Divya S",
    role: "Finance Controller",
    email: "divya.s@telgo.com",
    phone: "+91 90375 55667",
    status: "Active",
    project: "Finance Department",
    location: "Kochi, Kerala",
    joined: "01 Nov 2023",
    badge: "Finance",
    avatar: undefined
  },
  {
    id: "eng-jithin",
    name: "Jithin Jose",
    role: "Site Engineer",
    email: "jithin.j@telgo.com",
    phone: "+91 94967 88990",
    status: "Offline",
    project: "Ernakulam City Cable Upgrade",
    location: "Ernakulam, Kerala",
    joined: "18 Apr 2024",
    badge: "Engineer",
    avatar: undefined
  },
  {
    id: "eng-manu",
    name: "Manu Mohan",
    role: "Supervisor",
    email: "manu.m@telgo.com",
    phone: "+91 90722 33445",
    status: "On Leave",
    project: "SN Junction to Vadakara",
    location: "Kozhikode, Kerala",
    joined: "20 Jan 2024",
    badge: "Supervisor"
  }
];

const documentRecords: DocumentRecord[] = [
  {
    id: "doc-1",
    name: "PWD Approval Letter.pdf",
    type: "PDF",
    status: "Approved",
    meta: "16 May 2025, 09:30 AM  -  2.4 MB",
    author: "Arjun Nair"
  },
  {
    id: "doc-2",
    name: "Site Inspection Report.docx",
    type: "DOC",
    status: "Pending",
    meta: "16 May 2025, 08:15 AM  -  1.8 MB",
    author: "Arjun Nair"
  },
  {
    id: "doc-3",
    name: "Site Photo - Road Crossing.jpg",
    type: "JPG",
    status: "Approved",
    meta: "15 May 2025, 06:45 PM  -  3.2 MB",
    author: "Arjun Nair"
  },
  {
    id: "doc-4",
    name: "Material Delivery Note.pdf",
    type: "PDF",
    status: "Approved",
    meta: "15 May 2025, 04:20 PM  -  1.2 MB",
    author: "Arjun Nair"
  },
  {
    id: "doc-5",
    name: "Progress Summary.xlsx",
    type: "XLS",
    status: "Rejected",
    meta: "14 May 2025, 07:10 PM  -  950 KB",
    author: "Arjun Nair"
  }
];

const taskRecords: TaskRecord[] = [
  {
    id: "task-1",
    title: "Site inspection at Block A",
    detail: "Check foundation quality and materials",
    priority: "High",
    time: "09:00 AM",
    status: "Pending"
  },
  {
    id: "task-2",
    title: "Material quality check",
    detail: "Verify cement, steel and sand quality",
    priority: "Medium",
    time: "11:30 AM",
    status: "In Progress"
  },
  {
    id: "task-3",
    title: "Daily progress update",
    detail: "Upload site photos and update work progress",
    priority: "Low",
    time: "04:00 PM",
    status: "Upcoming"
  }
];

const reportTrend = {
  approved: [6, 6, 10, 9, 7, 7, 6, 6, 10, 9, 7, 7, 9, 12],
  pending: [2, 2, 5, 3, 2, 1, 1, 2, 5, 3, 2, 1, 1, 2],
  rejected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0]
};

const approvalQueue = [
  {
    id: "approval-ui-1",
    name: "Arjun Nair",
    label: "Leave Request",
    info: "12-14 May 2025 (3 Days)",
    sub: "Personal Leave",
    priority: "High Priority",
    time: "Today, 10:30 AM"
  },
  {
    id: "approval-ui-2",
    name: "New User Registration",
    label: "New User",
    info: "Name: Rakesh Kumar",
    sub: "Role: Engineer",
    priority: "Medium Priority",
    time: "Today, 09:15 AM"
  },
  {
    id: "approval-ui-3",
    name: "Vishnu P",
    label: "Attendance Correction",
    info: "Date: 08 May 2025",
    sub: "Check-in missed",
    priority: "Medium Priority",
    time: "Yesterday, 05:45 PM"
  },
  {
    id: "approval-ui-4",
    name: "Expense Claim",
    label: "Expense Request",
    info: "Amount: Rs. 4,560",
    sub: "Travel to site - Kozhikode",
    priority: "High Priority",
    time: "Yesterday, 02:20 PM"
  }
];

const projectSettingsRows = [
  "Edit Project Details",
  "Project Team",
  "Work Categories",
  "Milestones",
  "Budget & Cost",
  "Settings & Preferences"
];

export function RoleHomeMobileScreen() {
  const currentUser = useOpsStore((state) => getCurrentUser(state));
  if (currentUser.role === "admin" || currentUser.role === "supervisor") return <AdminDashboardMobileScreen />;
  if (currentUser.role === "client") return <ClientDashboardMobileScreen />;
  if (currentUser.role === "finance") return <FinanceDashboardMobileScreen />;
  return <EngineerDashboardMobileScreen />;
}

export function AdminDashboardMobileScreen() {
  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin"
      title="Admin Dashboard"
      subtitle="Welcome back, Admin"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<Folder className="h-6 w-6" />} label="Total Projects" value="12" meta="Active" />
          <MobileMetricCard icon={<Users className="h-6 w-6" />} label="Total Workers" value="84" meta="32 Online" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<LocateFixed className="h-6 w-6" />} label="Live on Site" value="28" meta="Workers" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<ShieldCheck className="h-6 w-6" />} label="Pending Approvals" value="6" meta="Requests" accent="text-[#ff4f63]" />
        </div>

        <MobileCard className="p-4">
          <MobileSectionTitle title="Live Locations" action={<Link href="/app/admin/map" className="text-sm font-semibold text-[#5c2dff]">View All</Link>} />
          <div className="overflow-hidden rounded-[24px] border border-[#e6e9fb]">
            <MobileMapPreview height={260} variant="portfolio" />
          </div>
          <div className="mt-4 grid gap-3 rounded-[24px] bg-[#f6f8ff] p-4">
            {projects.slice(0, 4).map((project, index) => (
              <div key={project.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                <span className={cn("h-3 w-3 rounded-full", ["bg-[#6a35ff]", "bg-[#22c55e]", "bg-[#f59e0b]", "bg-[#3b82f6]"][index % 4])} />
                <div>
                  <p className="font-semibold text-[#17204c]">{project.name}</p>
                  <p className="text-sm text-[#7c84b0]">{project.totalLengthKm} KM</p>
                </div>
                <MobilePill tone={project.status === "Active" ? "green" : project.status === "Delayed" ? "orange" : "blue"}>
                  {project.status === "Delayed" ? "Pending" : project.status}
                </MobilePill>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobileCard>
          <MobileSectionTitle title="Quick Access" />
          <div className="grid grid-cols-3 gap-3">
            <MobileActionTile href="/app/admin/projects" icon={<Folder className="h-7 w-7" />} title="All Projects" />
            <MobileActionTile href="/app/admin/staff" icon={<Users className="h-7 w-7" />} title="All Workers" />
            <MobileActionTile href="/app/admin/map" icon={<MapPinned className="h-7 w-7" />} title="Live Locations" />
            <MobileActionTile href="/app/admin/staff/eng-arjun" icon={<UserRound className="h-7 w-7" />} title="Engineer Admin" />
            <MobileActionTile href="/app/admin/finance" icon={<IndianRupee className="h-7 w-7" />} title="Finance Admin" />
            <MobileActionTile href="/app/client" icon={<BriefcaseBusiness className="h-7 w-7" />} title="Client Admin" />
            <MobileActionTile href="/app/chat" icon={<MessageCircle className="h-7 w-7" />} title="Live Chats" badge={<span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#ff4f63] px-1 text-xs font-semibold text-white">3</span>} />
            <MobileActionTile href="/app/admin/approvals" icon={<CheckCircle2 className="h-7 w-7" />} title="Approvals" badge={<span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#ff4f63] px-1 text-xs font-semibold text-white">6</span>} />
            <MobileActionTile href="/app/admin/profile" icon={<ShieldCheck className="h-7 w-7" />} title="Profile" />
          </div>
        </MobileCard>

        <div className="grid gap-4">
          <MobileCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Project Status</h3>
              <Link href="/app/admin/projects" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
            </div>
            <div className="space-y-4">
              {projects.slice(0, 4).map((project) => (
                <div key={project.id} className="space-y-2 rounded-[22px] bg-[#f7f8ff] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#18214d]">{project.name}</p>
                      <p className="text-sm text-[#7c84b0]">{project.totalLengthKm} KM</p>
                    </div>
                    <MobilePill tone={project.status === "Delayed" ? "orange" : project.status === "Completed" ? "blue" : "green"}>
                      {project.status}
                    </MobilePill>
                  </div>
                  <MobileProgressBar value={project.progress} />
                </div>
              ))}
            </div>
          </MobileCard>

          <MobileCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Pending Approvals</h3>
              <Link href="/app/admin/approvals" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
            </div>
            <div className="space-y-4">
              {approvalQueue.slice(0, 3).map((item) => (
                <div key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[22px] border border-[#e7ebff] p-4">
                  <MobileAvatar label={item.name} size={52} />
                  <div>
                    <p className="font-semibold text-[#17204c]">{item.name}</p>
                    <p className="text-sm text-[#7f87b0]">{item.label}</p>
                  </div>
                  <p className="text-xs text-[#7f87b0]">{item.time}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <MobilePrimaryButton href="/app/admin/approvals">Review All Requests</MobilePrimaryButton>
            </div>
          </MobileCard>
        </div>
      </div>
    </MobileShell>
  );
}

export function FinanceDashboardMobileScreen() {
  return (
    <MobileShell role="finance" activeHref="/app/admin/finance" title="Finance Overview" subtitle="Track spend, approvals and project funds">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<IndianRupee className="h-6 w-6" />} label="Total Spent" value={formatInr(24578320)} meta="12.5% higher" />
          <MobileMetricCard icon={<ShieldCheck className="h-6 w-6" />} label="Budget Utilization" value="70.2%" meta="Across projects" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<ReceiptText className="h-6 w-6" />} label="Pending Approvals" value={formatInr(1876450)} meta="Requires action" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<FileCheck2 className="h-6 w-6" />} label="Approved Today" value="18" meta="Transactions" accent="text-[#337dff]" />
        </div>

        <MobileCard>
          <MobileSectionTitle title="Recent Transactions" />
          <div className="space-y-4">
            {[
              ["Fuel Purchase - Thrissur Site", "Kannur Project", 125600, "Approved"],
              ["Equipment Repair - Panangad", "Vadakkekotta Cable Laying", 78450, "Pending"],
              ["Materials - Cable Drum", "Kottayam Utility Expansion", 96320, "Approved"]
            ].map(([title, project, amount, status]) => (
              <div key={String(title)} className="rounded-[22px] border border-[#e8ebff] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#18214d]">{title}</p>
                    <p className="mt-1 text-sm text-[#7f87b0]">{project}</p>
                    <p className="mt-3 text-lg font-semibold text-[#121b44]">{formatInr(Number(amount))}</p>
                  </div>
                  <MobilePill tone={status === "Approved" ? "green" : "orange"}>{status}</MobilePill>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function LiveLocationsMobileScreen({ fullMap = false }: { fullMap?: boolean }) {
  const activeWorkers = workerRecords.filter((worker) => worker.status === "Active" || worker.status === "On Site");
  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin/map"
      title={fullMap ? "Full Map View" : "Live Locations"}
      subtitle={fullMap ? "Real-time worker tracking" : "Track all workers in real-time"}
      backHref={fullMap ? "/app/admin/map" : "/app/admin"}
      leftMode={fullMap ? "back" : "menu"}
      bottomNav={!fullMap}
      rightSlot={
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white">
            <Search className="h-5 w-5 text-[#16204c]" />
          </button>
          <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white">
            <Filter className="h-5 w-5 text-[#16204c]" />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<Users className="h-6 w-6" />} label="Total Workers" value="84" meta="All" />
          <MobileMetricCard icon={<LocateFixed className="h-6 w-6" />} label="On Site" value="32" meta="Online" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<Gauge className="h-6 w-6" />} label="En Route" value="18" meta="Traveling" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<WifiOff className="h-6 w-6" />} label="Offline" value="34" meta="Offline" accent="text-[#7d85b1]" />
        </div>

        <MobileCard className={cn("overflow-hidden p-0", fullMap && "relative")}>
          <div className={cn(fullMap ? "h-[860px]" : "h-[420px]")}>
            <MobileMapPreview height={fullMap ? 860 : 420} variant={fullMap ? "workers" : "clusters"} full={fullMap} />
          </div>
          {fullMap ? (
            <div className="absolute inset-x-5 bottom-5 rounded-[28px] border border-[#e7ebff] bg-white/96 p-5 shadow-[0_18px_34px_rgba(33,48,91,0.16)] backdrop-blur">
              <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#d9def8]" />
              <div className="flex items-start gap-4">
                <MobileAvatar label="Aby Thomas" size={58} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[1.45rem] font-semibold text-[#13204c]">Aby Thomas</h3>
                      <MobilePill tone="violet" className="mt-2">Engineer</MobilePill>
                    </div>
                    <p className="text-base font-semibold text-[#18aa5d]">Online</p>
                  </div>
                  <div className="mt-4 grid gap-4 text-[#1a2450]">
                    <div>
                      <p className="font-semibold">SN Junction to Vadakara</p>
                      <p className="mt-1 text-sm text-[#7f87b0]">Kozhikode, Kerala</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <InfoCell label="Last Updated" value="2 mins ago" />
                      <InfoCell label="Speed" value="32 km/h" />
                      <InfoCell label="Distance from Site" value="2.5 km" />
                    </div>
                  </div>
                  <div className="mt-5">
                    <MobilePrimaryButton href="/app/admin/staff/eng-arjun">View Details</MobilePrimaryButton>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </MobileCard>

        {!fullMap ? (
          <MobileCard>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1">
                <MobileSearchBar placeholder="Search worker..." />
              </div>
              <MobileFilterButton label="Sort By" icon={<ArrowRight className="h-5 w-5 rotate-90" />} />
            </div>
            <div className="space-y-4">
              {activeWorkers.map((worker) => (
                <Link
                  key={worker.id}
                  href={`/app/admin/staff/${worker.id}`}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[24px] border border-[#e7ebff] p-4"
                >
                  <MobileAvatar src={worker.avatar} label={worker.name} size={56} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-lg font-semibold text-[#13204c]">{worker.name}</p>
                      <MobilePill tone={worker.badge === "Supervisor" ? "green" : worker.badge === "Finance" ? "orange" : "blue"} className="px-2.5 py-1 text-xs">
                        {worker.badge}
                      </MobilePill>
                    </div>
                    <p className="mt-1 text-sm text-[#66709e]">{worker.project}</p>
                    <p className="mt-1 text-sm text-[#9198be]">{worker.location}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold", worker.status === "On Site" ? "text-[#ff8a00]" : "text-[#18aa5d]")}>
                      {worker.status}
                    </p>
                    <p className="mt-1 text-sm text-[#7f87b0]">2 mins ago</p>
                    <p className="mt-1 text-sm text-[#7f87b0]">2.5 km away</p>
                  </div>
                </Link>
              ))}
            </div>
          </MobileCard>
        ) : null}
      </div>
    </MobileShell>
  );
}

export function ProjectsMobileScreen({
  role = "admin",
  activeHref = "/app/admin/projects",
  backHref,
  leftMode = "menu",
  title = "All Projects",
  subtitle = "Manage and track all projects"
}: {
  role?: Role;
  activeHref?: string;
  backHref?: string;
  leftMode?: "menu" | "back";
  title?: string;
  subtitle?: string;
}) {
  const [tab, setTab] = useState("All Projects (12)");
  return (
    <MobileShell
      role={role}
      activeHref={activeHref}
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      leftMode={leftMode}
      rightSlot={
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-11 w-11 place-items-center rounded-[10px] border border-[#e4e7fb] bg-white">
            <Search className="h-5 w-5 text-[#16204c]" />
          </button>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-[10px] border border-[#e4e7fb] bg-white">
            <Filter className="h-5 w-5 text-[#16204c]" />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <Link
          href={role === "client" ? "/app/client/projects/new" : "/app/admin/projects/new"}
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(92,45,255,0.22)]"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Project
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<Folder className="h-6 w-6" />} label="Total Projects" value="12" meta="All Projects" />
          <MobileMetricCard icon={<ShieldCheck className="h-6 w-6" />} label="Completed" value="3" meta="25%" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<TrendingUp className="h-6 w-6" />} label="Active" value="6" meta="50%" accent="text-[#337dff]" />
          <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value="3" meta="25%" accent="text-[#ff8a00]" />
        </div>

        <MobileCard>
          <MobileTabBar
            items={["All Projects (12)", "Active (6)", "Completed (3)", "Pending (3)"]}
            active={tab}
            onChange={setTab}
          />
          <div className="mt-5 space-y-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={role === "client" ? "/app/client/settings" : "/app/admin/projects/new"}
                className="grid grid-cols-[92px_1fr] gap-4 rounded-[24px] border border-[#e7ebff] p-4"
              >
                <div className="relative h-[92px] overflow-hidden rounded-[20px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[1.22rem] font-semibold text-[#121b44]">{project.name}</h3>
                      <p className="mt-1 text-sm text-[#7380b0]">{project.type}</p>
                      <p className="mt-2 text-sm text-[#7380b0]">{project.location}</p>
                    </div>
                    <MobilePill tone={project.status === "Completed" ? "blue" : project.status === "Delayed" ? "orange" : "green"}>
                      {project.status === "Delayed" ? "Pending Permission" : project.status}
                    </MobilePill>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-[#7080aa]">
                    <InfoCell label="Distance" value={`${project.totalLengthKm} KM`} />
                    <InfoCell label="Start" value={project.startDate} />
                    <InfoCell label="End" value={project.endDate} />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <MobileProgressBar value={project.progress} />
                    </div>
                    <p className="text-lg font-semibold text-[#18aa5d]">{project.progress}%</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function ApprovalsMobileScreen() {
  const [decisions, setDecisions] = useState<Record<string, "Approved" | "Rejected" | undefined>>({});
  const [tab, setTab] = useState("All (28)");
  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin/approvals"
      title="Pending Approvals"
      subtitle="Review and approve requests"
      rightSlot={
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white">
            <Search className="h-5 w-5 text-[#16204c]" />
          </button>
          <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white">
            <Filter className="h-5 w-5 text-[#16204c]" />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<FileClock className="h-6 w-6" />} label="Total Pending" value="28" meta="Requests" />
          <MobileMetricCard icon={<CalendarDays className="h-6 w-6" />} label="Leave Requests" value="12" meta="Pending" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<UserPlus className="h-6 w-6" />} label="New Users" value="06" meta="Pending" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<ShieldCheck className="h-6 w-6" />} label="Other Requests" value="10" meta="Pending" accent="text-[#337dff]" />
        </div>

        <MobileCard>
          <MobileTabBar
            items={["All (28)", "Leave (12)", "New Users (6)", "Attendance (4)", "Other (6)"]}
            active={tab}
            onChange={setTab}
          />
          <div className="mt-5 space-y-4">
            {approvalQueue.map((item) => {
              const decision = decisions[item.id];
              return (
                <div key={item.id} className="rounded-[24px] border border-[#e7ebff] p-4">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#f5f3ff] text-[#6a35ff]">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-[1.25rem] font-semibold text-[#121b44]">{item.name}</p>
                      <MobilePill tone="violet" className="mt-2">{item.label}</MobilePill>
                      <p className="mt-3 text-base text-[#6f7aa9]">{item.info}</p>
                      <p className="mt-1 text-base text-[#6f7aa9]">{item.sub}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#7c84b0]">{item.time}</p>
                      <MobilePill tone={item.priority.startsWith("High") ? "red" : item.priority.startsWith("Medium") ? "orange" : "green"} className="mt-3">
                        {item.priority}
                      </MobilePill>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecisions((state) => ({ ...state, [item.id]: "Approved" }))}
                      className={cn(
                        "inline-flex min-h-[54px] items-center justify-center rounded-[18px] border px-4 text-base font-semibold",
                        decision === "Approved"
                          ? "border-[#18aa5d] bg-[#e9f9ef] text-[#18aa5d]"
                          : "border-[#bfe6cd] bg-white text-[#18aa5d]"
                      )}
                    >
                      <Check className="mr-2 h-5 w-5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisions((state) => ({ ...state, [item.id]: "Rejected" }))}
                      className={cn(
                        "inline-flex min-h-[54px] items-center justify-center rounded-[18px] border px-4 text-base font-semibold",
                        decision === "Rejected"
                          ? "border-[#ff6676] bg-[#fff0f2] text-[#ff4f63]"
                          : "border-[#ffccd3] bg-white text-[#ff4f63]"
                      )}
                    >
                      <ShieldX className="mr-2 h-5 w-5" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function WorkersMobileScreen() {
  const [tab, setTab] = useState("All Workers (84)");
  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin/staff"
      title="All Workers"
      subtitle="Manage all team members and their access"
      rightSlot={
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-11 w-11 place-items-center rounded-[10px] border border-[#e4e7fb] bg-white">
            <Search className="h-5 w-5 text-[#16204c]" />
          </button>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-[10px] border border-[#e4e7fb] bg-white">
            <Filter className="h-5 w-5 text-[#16204c]" />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <Link
          href="/app/admin/staff/eng-arjun/assign-task"
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(92,45,255,0.22)]"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Worker
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<Users className="h-6 w-6" />} label="Total Workers" value="84" meta="All Members" />
          <MobileMetricCard icon={<UserPlus className="h-6 w-6" />} label="Active" value="72" meta="85.7%" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<Signal className="h-6 w-6" />} label="Offline" value="10" meta="11.9%" accent="text-[#337dff]" />
          <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Inactive" value="2" meta="2.4%" accent="text-[#ff4f63]" />
        </div>
        <MobileCard>
          <MobileTabBar
            items={["All Workers (84)", "Engineers (52)", "Supervisors (12)", "Finance (8)", "Clients (12)"]}
            active={tab}
            onChange={setTab}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <MobileSearchBar placeholder="Search by name, email, or phone..." />
            <MobileFilterButton label="Sort By" icon={<ArrowRight className="h-5 w-5 rotate-90" />} />
          </div>
          <div className="mt-5 space-y-4">
            {workerRecords.map((worker) => (
              <Link
                key={worker.id}
                href={`/app/admin/staff/${worker.id}`}
                className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[24px] border border-[#e8ebff] p-4"
              >
                <MobileAvatar src={worker.avatar} label={worker.name} size={58} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[1.35rem] font-semibold text-[#13204c]">{worker.name}</p>
                    <MobilePill tone={worker.badge === "Supervisor" ? "green" : worker.badge === "Finance" ? "orange" : "blue"} className="px-2.5 py-1 text-xs">
                      {worker.badge}
                    </MobilePill>
                  </div>
                  <p className="mt-2 text-base text-[#6c77a6]">{worker.email}</p>
                  <p className="mt-1 text-base text-[#6c77a6]">{worker.phone}</p>
                  <div className="mt-3 grid gap-1 text-sm text-[#8790ba]">
                    <p>Assigned Project</p>
                    <p className="font-semibold text-[#1b2450]">{worker.project}</p>
                    <p>Joined: {worker.joined}</p>
                  </div>
                </div>
                <div className="grid content-start justify-items-end gap-3">
                  <MobilePill tone={statusTone(worker.status)}>{worker.status}</MobilePill>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f6f7ff] text-[#6872a0]">
                    <MoreVertical className="h-5 w-5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function WorkerDetailMobileScreen({ workerId }: { workerId?: string }) {
  const worker = workerRecords.find((item) => item.id === workerId) ?? workerRecords[0];
  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin/staff"
      title={worker.name}
      subtitle={`${worker.phone}  -  Joined: ${worker.joined}`}
      backHref="/app/admin/staff"
      leftMode="back"
      bottomNav={false}
      rightSlot={
        <div className="flex items-center gap-2">
          <Link href="/app/admin/map/full" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white text-[#5c2dff]">
            <LocateFixed className="h-5 w-5" />
          </Link>
          <Link href="/app/chat" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white text-[#16204c]">
            <MessageCircle className="h-5 w-5" />
          </Link>
          <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white text-[#16204c]">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pb-8">
        <MobileCard>
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <MobileAvatar src={worker.avatar} label={worker.name} size={74} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[1.65rem] font-semibold text-[#121b44]">{worker.name}</h2>
                <MobilePill tone="violet">{worker.role}</MobilePill>
                <MobilePill tone="green">Active</MobilePill>
              </div>
              <p className="mt-3 text-base text-[#6974a4]">Employee ID: ENG-1007</p>
            </div>
          </div>
        </MobileCard>

        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<CalendarDays className="h-6 w-6" />} label="Check-in" value="09:15 AM" meta="Today" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Tasks" value="03" meta="Today" accent="text-[#5c2dff]" />
        </div>

        <MobileCard className="overflow-hidden p-0">
          <div className="border-b border-[#ecf0ff] px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#6a35ff]" />
                <p className="text-[1.3rem] font-semibold text-[#121b44]">Live Location</p>
                <MobilePill tone="green" className="px-2.5 py-1 text-xs">Live</MobilePill>
              </div>
            </div>
          </div>
          <div className="h-[260px]">
            <MobileMapPreview height={260} variant="worker" />
          </div>
          <div className="grid gap-4 p-5">
            <InfoGrid
              items={[
                ["Project", worker.project],
                ["Location", worker.location],
                ["Last Updated", "16 May 2025, 09:16 AM"],
                ["Accuracy", "10 meters"]
              ]}
            />
            <MobileSecondaryButton href="/app/admin/map/full">View Full Tracking</MobileSecondaryButton>
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Today's Tasks</h3>
            <Link href="/app/admin/staff/eng-arjun/assign-task" className="text-sm font-semibold text-[#5c2dff]">03 Tasks</Link>
          </div>
          <div className="space-y-4">
            {taskRecords.map((task) => (
              <div key={task.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                <MobilePill tone={task.priority === "High" ? "red" : task.priority === "Medium" ? "orange" : "green"} className="self-start px-2 py-1 text-xs">
                  {task.priority}
                </MobilePill>
                <div>
                  <p className="font-semibold text-[#17204c]">{task.title}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">{task.detail}</p>
                  <p className="mt-2 text-sm text-[#7d85b0]">{worker.project}</p>
                </div>
                <div className="text-right text-sm text-[#7c84b0]">
                  <p>{task.time}</p>
                  <MobilePill tone={task.status === "Pending" ? "slate" : task.status === "In Progress" ? "orange" : task.status === "Completed" ? "green" : "blue"} className="mt-2 px-2.5 py-1 text-xs">
                    {task.status}
                  </MobilePill>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>

        <div className="grid gap-4">
          <MobileCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Attendance Overview</h3>
              <Link href="/app/engineer/attendance" className="text-sm font-semibold text-[#5c2dff]">View Calendar</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <CalendarCard />
              <ScheduleCard />
            </div>
          </MobileCard>
          <MobileCard>
            <div className="grid grid-cols-2 gap-3">
              <MobileSecondaryButton href="/app/engineer/profile">Edit Profile</MobileSecondaryButton>
              <MobileSecondaryButton href={`/app/admin/staff/${worker.id}/assign-task`}>Assign Tasks</MobileSecondaryButton>
              <MobileSecondaryButton href="/app/engineer/attendance">Mark Attendance</MobileSecondaryButton>
              <MobileSecondaryButton href="/app/chat">Send Message</MobileSecondaryButton>
            </div>
            <button type="button" className="mt-4 inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] border border-[#ffbfc6] bg-white px-5 text-[1.05rem] font-semibold text-[#ff4f63]">
              Remove Access
            </button>
          </MobileCard>
        </div>
      </div>
    </MobileShell>
  );
}

export function WorkerAssignTaskMobileScreen({ workerId }: { workerId?: string }) {
  const worker = workerRecords.find((item) => item.id === workerId) ?? workerRecords[0];
  const [saved, setSaved] = useState(false);
  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin/staff"
      title="Assign Task"
      subtitle={`Create and assign task to ${worker.name}`}
      backHref={`/app/admin/staff/${worker.id}`}
      leftMode="back"
      bottomNav={false}
      rightSlot={
        <div className="flex items-center gap-3">
          <MobileAvatar src={worker.avatar} label={worker.name} size={52} />
          <div className="text-right">
            <p className="text-lg font-semibold text-[#17204c]">{worker.name}</p>
            <p className="text-sm text-[#7d85b0]">{worker.role}</p>
          </div>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Task Information</h3>
          </div>
          <div className="space-y-4">
            <MobileInput label="Task Title" placeholder="Enter task title" />
            <MobileTextArea label="Task Description" placeholder="Enter task description..." rows={5} />
            <div className="grid grid-cols-2 gap-4">
              <MobileSelect label="Project" defaultValue="Kottayam Utility Expansion" />
              <MobileSelect label="Priority" defaultValue="Select Priority" />
              <MobileSelect label="Task Type" defaultValue="Select Type" />
              <MobileInput label="Due Date" placeholder="Select due date" />
            </div>
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
              <Paperclip className="h-6 w-6" />
            </div>
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Task Details</h3>
          </div>
          <div className="grid gap-4">
            <MobileInput label="Location (Optional)" placeholder="Enter task location" />
            <div>
              <span className="mb-2 block text-sm font-semibold text-[#5c648d]">Attachments (Optional)</span>
              <button type="button" className="inline-flex min-h-[56px] w-full items-center justify-center rounded-[18px] border border-[#cabdff] bg-white px-5 text-[1.05rem] font-semibold text-[#5c2dff]">
                <Upload className="mr-2 h-5 w-5" />
                Upload Files
              </button>
              <p className="mt-2 text-sm text-[#8f96bc]">PDF, Images, Docs (Max 10MB)</p>
            </div>
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
              <FilePlus2 className="h-6 w-6" />
            </div>
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Additional Notes</h3>
          </div>
          <MobileTextArea label="Notes for Engineer (Optional)" placeholder="Add any special instructions or notes..." rows={4} />
        </MobileCard>

        <MobileCard>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
              <Eye className="h-6 w-6" />
            </div>
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Task Preview</h3>
          </div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[22px] bg-[#f7f8ff] p-4">
            <MobileAvatar src={worker.avatar} label={worker.name} size={56} />
            <div>
              <p className="text-[1.18rem] font-semibold text-[#17204c]">{worker.name}</p>
              <p className="mt-1 text-sm text-[#7d85b0]">{worker.role}</p>
            </div>
            <div className="text-right">
              <MobilePill tone="green">Active</MobilePill>
              <p className="mt-2 text-base text-[#7d85b0]">ENG-1007</p>
            </div>
          </div>
          {saved ? <p className="mt-4 text-sm font-semibold text-[#18aa5d]">Task draft saved locally.</p> : null}
        </MobileCard>

        <div className="grid grid-cols-2 gap-3">
          <MobileSecondaryButton href={`/app/admin/staff/${worker.id}`}>Cancel</MobileSecondaryButton>
          <button type="submit" className="inline-flex min-h-[58px] items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)]">
            <Send className="mr-2 h-5 w-5" />
            Assign Task
          </button>
        </div>
      </form>
    </MobileShell>
  );
}

export function ClientDashboardMobileScreen() {
  return (
    <MobileShell
      role="client"
      activeHref="/app/client"
      title="Client Admin Portal"
      subtitle="Manage all clients and their projects"
      rightSlot={
        <div className="flex items-center gap-2">
          <button type="button" className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white text-[#18214d]">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3b3b] px-1 text-[10px] font-semibold text-white">12</span>
          </button>
          <MobileAvatar label="Reliable Infra Pvt. Ltd." size={48} />
        </div>
      }
    >
      <div className="space-y-6">
        <MobileCard className="grid grid-cols-[auto_1fr] gap-4 p-5">
          <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-[#f3efff] text-[#6a35ff] text-3xl font-semibold">RI</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[1.75rem] font-semibold text-[#121b44]">Reliable Infra Pvt. Ltd.</h2>
              <MobilePill tone="green">Active</MobilePill>
            </div>
            <p className="mt-2 text-base text-[#6d77a6]">info@reliableinfra.com  |  +91 98765 43210</p>
            <div className="mt-4 flex gap-3">
              <MobileSecondaryButton href="/app/client/settings" className="w-auto px-5">Client Settings</MobileSecondaryButton>
            </div>
          </div>
        </MobileCard>

        <MobileGradientCard>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <p className="text-[1.25rem] font-semibold">Overview</p>
            </div>
            <MobilePill tone="violet" className="bg-white/14 text-white">This Month</MobilePill>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <BigGradientStat label="Total Projects" value="5" />
            <BigGradientStat label="Active Projects" value="3" />
            <BigGradientStat label="Completed" value="2" />
            <BigGradientStat label="Total Distance" value="186.40 KM" />
          </div>
        </MobileGradientCard>

        <MobileCard>
          <h3 className="text-[1.4rem] font-semibold text-[#121b44]">Overall Work Progress</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <MobileProgressBar value={72} />
            </div>
            <p className="text-[1.45rem] font-semibold text-[#121b44]">72%</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 text-sm text-[#5e6897] sm:grid-cols-4">
            <LegendItem label="Completed" value="134.10 KM" tone="green" />
            <LegendItem label="In Progress" value="52.30 KM" tone="violet" />
            <LegendItem label="Remaining" value="52.30 KM" tone="slate" />
            <LegendItem label="Not Started" value="10.00 KM" tone="slate" />
          </div>
        </MobileCard>

        <MobileCard>
          <MobileSectionTitle title="Quick Actions" />
          <div className="grid grid-cols-2 gap-3">
            <MobileActionTile href="/app/client/profile" icon={<UserRound className="h-7 w-7" />} title="Edit Profile" />
            <MobileActionTile href="/app/client/projects" icon={<Folder className="h-7 w-7" />} title="Project Details" />
            <MobileActionTile href="/app/client/engineers" icon={<Users className="h-7 w-7" />} title="Engineers On-Site" />
            <MobileActionTile href="/app/client/progress" icon={<TrendingUp className="h-7 w-7" />} title="Work Progress" />
            <MobileActionTile href="/app/client/documents" icon={<FileText className="h-7 w-7" />} title="Documents" />
            <MobileActionTile href="/app/client/progress/update" icon={<MapPinned className="h-7 w-7" />} title="Map & Progress" />
            <MobileActionTile href="/app/client/reports" icon={<FileSpreadsheet className="h-7 w-7" />} title="Reports" />
            <MobileActionTile href="/app/client/projects/new" icon={<Plus className="h-7 w-7" />} title="Add New Project" />
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Active Projects</h3>
            <Link href="/app/client/projects" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 3).map((project) => (
              <Link key={project.id} href="/app/client/projects" className="grid grid-cols-[96px_1fr_auto] gap-4 rounded-[24px] border border-[#e7ebff] p-4">
                <div className="relative h-24 overflow-hidden rounded-[20px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[1.25rem] font-semibold text-[#121b44]">{project.name}</p>
                  <p className="mt-1 text-sm text-[#7680af]">{project.location}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <MobileProgressBar value={project.progress} />
                    </div>
                    <span className="text-lg font-semibold text-[#121b44]">{project.progress}%</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <InfoCell label="Total Distance" value={`${project.totalLengthKm} KM`} />
                    <InfoCell label="Work Completed" value={`${project.completedKm} KM`} />
                  </div>
                </div>
                <ChevronRight className="mt-9 h-6 w-6 text-[#6f76a7]" />
              </Link>
            ))}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function ClientProjectsMobileScreen() {
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/projects"
      title="Project Details"
      subtitle="Track all assigned projects"
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <MobileSearchBar placeholder="Search projects..." />
          <Link href="/app/client/projects/new" className="inline-flex min-h-[52px] items-center justify-center rounded-[10px] border border-[#cabdff] bg-white px-5 text-sm font-bold text-[#5c2dff] shadow-[0_8px_18px_rgba(44,54,96,0.04)]">
            <Plus className="mr-2 h-5 w-5" />
            Add New
          </Link>
        </div>
        <MobileCard>
          <MobileTabBar
            items={["All (5)", "Active (3)", "Completed (2)"]}
            active="All (5)"
            onChange={() => undefined}
          />
          <div className="mt-5 space-y-4">
            {projects.map((project) => (
              <Link key={project.id} href="/app/client/settings" className="grid grid-cols-[76px_1fr_auto] gap-3 rounded-[12px] border border-[#e7ebff] p-4">
                <div className="relative h-[76px] overflow-hidden rounded-[10px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[1rem] font-bold leading-snug text-[#121b44]">{project.name}</p>
                  <p className="mt-1 text-sm text-[#7880ac]">{project.location}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <MobileProgressBar value={project.progress} />
                    </div>
                    <span className="text-sm font-bold text-[#121b44]">{project.progress}%</span>
                  </div>
                </div>
                <ChevronRight className="mt-6 h-5 w-5 text-[#7380aa]" />
              </Link>
            ))}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function ClientSettingsMobileScreen() {
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/projects"
      title="Project Settings"
      subtitle={clientProject.name}
      backHref="/app/client/projects"
      leftMode="back"
      bottomNav={false}
    >
      <div className="space-y-6">
        <MobileCard className="grid grid-cols-[88px_1fr_auto] gap-4 p-4">
          <div className="relative h-[88px] overflow-hidden rounded-[20px]">
            <Image src={clientProject.image} alt={clientProject.name} fill className="object-cover" />
          </div>
          <div>
            <p className="text-[1.22rem] font-semibold text-[#121b44]">{clientProject.name}</p>
            <p className="mt-1 text-sm text-[#7780ad]">{clientProject.location}</p>
            <MobilePill tone="green" className="mt-3">Active</MobilePill>
          </div>
          <ChevronRight className="mt-8 h-6 w-6 text-[#7b84b1]" />
        </MobileCard>
        <MobileCard className="p-0">
          {projectSettingsRows.map((label) => (
            <Link
              key={label}
              href="/app/client/projects"
              className="grid grid-cols-[1fr_auto] items-center border-b border-[#edf0ff] px-5 py-5 text-[#17204c] last:border-b-0"
            >
              <span className="font-medium">{label}</span>
              <ChevronRight className="h-5 w-5 text-[#8a91bc]" />
            </Link>
          ))}
        </MobileCard>
        <button type="button" className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[9px] border border-[#ffccd3] bg-white px-5 text-[0.98rem] font-bold text-[#ff4f63]">
          Delete Project
        </button>
      </div>
    </MobileShell>
  );
}

export function ClientAddProjectMobileScreen() {
  const [saved, setSaved] = useState(false);
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/projects"
      title="Add New Project"
      subtitle="Create a new project"
      backHref="/app/client/projects"
      leftMode="back"
      bottomNav={false}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="space-y-4">
            <MobileUploadBox title="Upload Image" detail="JPG, PNG up to 5MB" />
            <MobileInput label="Project Name" placeholder="Enter project name" />
            <MobileInput label="Location" placeholder="Enter project location" />
            <MobileInput label="Total Distance (KM)" placeholder="Enter total distance" />
            <MobileInput label="Start Date" placeholder="Select start date" />
            <MobileInput label="Expected End Date" placeholder="Select end date" />
            <MobileSelect label="Project Manager" defaultValue="Select manager" />
          </div>
        </MobileCard>
        {saved ? <p className="text-sm font-semibold text-[#18aa5d]">Project draft captured. Review before final publish.</p> : null}
        <button type="submit" className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)]">
          Create Project
        </button>
      </form>
    </MobileShell>
  );
}

export function ClientDocumentsMobileScreen() {
  const [tab, setTab] = useState("All Documents");
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/reports"
      title="Documents"
      subtitle="View, upload and manage project documents"
      backHref="/app/client"
      leftMode="back"
    >
      <div className="space-y-6">
        <MobileCard>
          <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#e8ebff] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-[#8690bc]">Project</p>
                <p className="text-[1.35rem] font-semibold text-[#121b44]">Kottayam Utility Expansion</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-[#7c84b0]" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <MobileSearchBar placeholder="Search documents..." />
            <MobileFilterButton />
          </div>
        </MobileCard>

        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<FolderOpen className="h-6 w-6" />} label="Total Documents" value="24" meta="Total" />
          <MobileMetricCard icon={<CheckCircle2 className="h-6 w-6" />} label="Approved" value="16" meta="Documents" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value="5" meta="Documents" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Rejected" value="3" meta="Documents" accent="text-[#ff4f63]" />
        </div>

        <MobileCard>
          <MobileTabBar
            items={["All Documents", "Folders", "Recent", "Shared"]}
            active={tab}
            onChange={setTab}
          />
          <div className="mt-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.3rem] font-semibold text-[#121b44]">Folders</h3>
              <Link href="/app/client/documents" className="text-sm font-semibold text-[#5c2dff]">View All Folders</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Permissions", "8 files"],
                ["PWD Approvals", "6 files"],
                ["Daily Reports", "15 files"],
                ["Site Photos", "32 files"]
              ].map(([name, count]) => (
                <div key={name} className="rounded-[22px] border border-[#e8ebff] p-4">
                  <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#b2a8ff]">
                    <Folder className="h-7 w-7" />
                  </div>
                  <p className="font-semibold text-[#17204c]">{name}</p>
                  <p className="mt-1 text-sm text-[#8690bc]">{count}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.3rem] font-semibold text-[#121b44]">All Documents</h3>
              <button type="button" className="text-sm font-semibold text-[#5c2dff]">Sort by: Newest</button>
            </div>
            <div className="space-y-4">
              {documentRecords.map((document) => (
                <div key={document.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                  <div className={cn("grid h-12 w-12 place-items-center rounded-2xl text-sm font-semibold text-white", docTone(document.type))}>
                    {document.type}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[1.12rem] font-semibold text-[#17204c]">{document.name}</p>
                    <p className="mt-1 text-sm text-[#7f88b5]">{document.meta}</p>
                    <p className="mt-1 text-sm text-[#7f88b5]">{document.author}</p>
                  </div>
                  <div className="grid content-start justify-items-end gap-3">
                    <MobilePill tone={statusTone(document.status)}>{document.status}</MobilePill>
                    <MoreVertical className="h-5 w-5 text-[#8a91bc]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MobileCard>

        <MobilePrimaryButton href="/app/client/documents/new">Upload Document</MobilePrimaryButton>
        <p className="text-center text-sm text-[#7d85b1]">Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)</p>
      </div>
    </MobileShell>
  );
}

export function ClientAddDocumentMobileScreen() {
  const [saved, setSaved] = useState(false);
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/reports"
      title="Add Document"
      subtitle="Upload project files"
      backHref="/app/client/documents"
      leftMode="back"
      bottomNav={false}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="space-y-4">
            <MobileSelect label="Document Type" defaultValue="Select Type" />
            <MobileInput label="Document Name" placeholder="Enter document name" />
            <MobileUploadBox title="Upload File" detail="Drag & drop file here or choose file" />
            <MobileTextArea label="Description (Optional)" placeholder="Enter description" rows={4} />
          </div>
        </MobileCard>
        {saved ? <p className="text-sm font-semibold text-[#18aa5d]">Document draft saved locally.</p> : null}
        <button type="submit" className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)]">
          Upload Document
        </button>
      </form>
    </MobileShell>
  );
}

export function ClientEngineersOnSiteMobileScreen() {
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/projects"
      title="Engineers On-Site"
      subtitle="Track project team availability"
      backHref="/app/client"
      leftMode="back"
      rightSlot={<MobileAvatar label="RA" size={40} />}
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <MobileSearchBar placeholder="Search engineers..." />
          <Link href="/app/client/engineers" className="inline-flex min-h-[52px] items-center justify-center rounded-[10px] border border-[#cabdff] bg-white px-5 text-sm font-bold text-[#5c2dff] shadow-[0_8px_18px_rgba(44,54,96,0.04)]">
            <Plus className="mr-2 h-5 w-5" />
            Add Engineer
          </Link>
        </div>
        <MobileCard>
          <div className="space-y-4">
            {workerRecords.slice(0, 5).map((worker) => (
              <Link key={worker.id} href={`/app/admin/staff/${worker.id}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                <MobileAvatar src={worker.avatar} label={worker.name} size={56} />
                <div>
                  <p className="text-[1.18rem] font-semibold text-[#17204c]">{worker.name}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">{worker.role}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">On {worker.project}</p>
                </div>
                <MobilePill tone={statusTone(worker.status)}>{worker.status === "Active" ? "Online" : worker.status}</MobilePill>
                <div className="flex gap-3 text-[#6771a0]">
                  <Phone className="h-5 w-5" />
                  <MessageCircle className="h-5 w-5" />
                </div>
              </Link>
            ))}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function ClientWorkProgressMobileScreen() {
  const project = clientProject;
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/projects"
      title="Map & Progress"
      subtitle="Current project progress"
      backHref="/app/client"
      leftMode="back"
      bottomNav={false}
      rightSlot={<MobileAvatar label="RA" size={40} />}
    >
      <div className="space-y-6">
        <MobileCard>
          <div className="flex items-center justify-between rounded-[18px] border border-[#e7ebff] px-4 py-4">
            <p className="font-semibold text-[#17204c]">{project.name}</p>
            <ChevronDown className="h-5 w-5 text-[#7681af]" />
          </div>
          <div className="mt-4 overflow-hidden rounded-[24px] border border-[#e8ebff]">
            <MobileMapPreview height={320} variant="route" progress={project.progress} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <InfoCell label="Total Distance" value={`${project.totalLengthKm} KM`} />
            <InfoCell label="Progress" value={`${project.progress}%`} />
            <InfoCell label="Completed" value={`${project.completedKm} KM`} />
            <InfoCell label="Planning" value={`${Math.max(project.totalLengthKm - project.completedKm, 0).toFixed(1)} KM`} />
          </div>
        </MobileCard>
        <MobilePrimaryButton href="/app/client/progress/update">Update on Map</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}

export function ClientUpdateProgressMobileScreen() {
  const [percent, setPercent] = useState(72);
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/projects"
      title="Update on Map"
      subtitle="Update current progress location"
      backHref="/app/client/progress"
      leftMode="back"
      bottomNav={false}
      rightSlot={<MobileAvatar label="RA" size={40} />}
    >
      <div className="space-y-6">
        <MobileCard>
          <div className="flex items-center justify-between rounded-[18px] border border-[#e7ebff] px-4 py-4">
            <p className="font-semibold text-[#17204c]">Mark Progress On Map</p>
            <ChevronDown className="h-5 w-5 text-[#7681af]" />
          </div>
          <div className="mt-4 overflow-hidden rounded-[24px] border border-[#e8ebff]">
            <MobileMapPreview height={320} variant="route" progress={percent} />
          </div>
          <div className="mt-4 space-y-4">
            <InfoCell label="Current Progress Location" value="13.40 KM" />
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#66709c]">Progress Percent</span>
                <span className="text-lg font-semibold text-[#17204c]">{percent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={percent}
                onChange={(event) => setPercent(Number(event.target.value))}
                className="w-full accent-[#5c2dff]"
              />
            </div>
            <MobileTextArea label="Update Notes" placeholder="Work completed up to manhole no. 45" rows={4} />
          </div>
        </MobileCard>
        <MobilePrimaryButton href="/app/client/progress">Save Location</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}

export function ClientProfileMobileScreen() {
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/profile"
      title="Edit Profile"
      subtitle="Company profile and contact details"
      backHref="/app/client"
      leftMode="back"
    >
      <div className="space-y-6">
        <MobileCard>
          <div className="text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] bg-[#f3efff] text-[#6a35ff]">
              <Folder className="h-9 w-9" />
            </div>
            <button type="button" className="mt-4 text-base font-semibold text-[#5c2dff]">Change Logo</button>
          </div>
        </MobileCard>
        <MobileCard>
          <h3 className="mb-4 text-[1.35rem] font-semibold text-[#121b44]">Company Information</h3>
          <div className="space-y-4">
            <MobileInput label="Company Name" defaultValue="Reliable Infra Pvt. Ltd." />
            <MobileInput label="Email" defaultValue="info@reliableinfra.com" />
            <MobileInput label="Phone" defaultValue="+91 98765 43210" />
            <MobileInput label="Address" defaultValue="123, Business Park, Kochi, Kerala, India" />
            <MobileInput label="Website" defaultValue="www.reliableinfra.com" />
            <MobileInput label="Contact Person" defaultValue="Rakesh Nair" />
            <MobileInput label="Designation" defaultValue="Managing Director" />
          </div>
        </MobileCard>
        <MobilePrimaryButton href="/app/client">Save Changes</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}

export function EngineerDashboardMobileScreen() {
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer"
      title="Hello, Arjun Nair"
      subtitle="Site Engineer"
      rightSlot={
        <div className="flex items-center gap-3">
          <div className="text-center">
            <MessageCircle className="mx-auto h-5 w-5 text-[#17204c]" />
            <p className="mt-1 text-xs font-semibold text-[#17204c]">Live Chat</p>
          </div>
          <button type="button" className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white text-[#18214d]">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3b3b] px-1 text-[10px] font-semibold text-white">5</span>
          </button>
          <MobileAvatar label="Arjun Nair" size={48} />
        </div>
      }
    >
      <div className="space-y-6">
        <MobileGradientCard>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <BigGradientStat label="My Projects Assigned" value="05" />
            <BigGradientStat label="Tasks Today" value="12" />
            <BigGradientStat label="Attendance Marked" value="18/25" />
            <BigGradientStat label="Site Visits Today" value="03" />
            <BigGradientStat label="Approvals Pending" value="02" />
            <BigGradientStat label="Reports" value="06" />
          </div>
        </MobileGradientCard>

        <MobileCard>
          <div className="grid grid-cols-2 gap-3">
            <MobileActionTile href="/app/engineer/attendance" icon={<CalendarDays className="h-7 w-7" />} title="Mark Attendance" subtitle="Daily GPS mark" />
            <MobileActionTile href="/app/engineer/reports" icon={<CalendarRange className="h-7 w-7" />} title="Calendar" subtitle="Schedule & events" />
            <MobileActionTile href="/app/admin/staff/eng-arjun/assign-task" icon={<ListTodo className="h-7 w-7" />} title="My Tasks" subtitle="View & update" />
            <MobileActionTile href="/app/engineer/shift-report" icon={<FileText className="h-7 w-7" />} title="Daily Report" subtitle="Submit report" />
            <MobileActionTile href="/app/admin/map" icon={<Pin className="h-7 w-7" />} title="Site Visit" subtitle="Add / view" />
            <MobileActionTile href="/app/engineer/documents" icon={<Folder className="h-7 w-7" />} title="Documents" subtitle="Project docs" />
            <MobileActionTile href="/app/engineer/finance-request" icon={<IndianRupee className="h-7 w-7" />} title="Material Request" subtitle="Request material" />
            <MobileActionTile href="/app/engineer/leave" icon={<CheckCircle2 className="h-7 w-7" />} title="Requests" subtitle="Raise request" />
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">My Projects</h3>
            <Link href="/app/engineer/projects" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 3).map((project) => (
              <Link key={project.id} href="/app/engineer/projects" className="grid grid-cols-[92px_1fr_auto] gap-4 rounded-[24px] border border-[#e7ebff] p-4">
                <div className="relative h-[92px] overflow-hidden rounded-[20px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[1.2rem] font-semibold text-[#121b44]">{project.name}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">{project.location}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <MobileProgressBar value={project.progress} />
                    </div>
                    <span className="text-base font-semibold text-[#121b44]">{project.progress}%</span>
                  </div>
                </div>
                <MobilePill tone={project.status === "Active" ? "green" : project.status === "Delayed" ? "orange" : "blue"}>{project.status === "Delayed" ? "Planning" : project.status}</MobilePill>
              </Link>
            ))}
          </div>
        </MobileCard>

        <div className="grid gap-4">
          <CalendarCard />
          <MobileCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Today's Tasks</h3>
              <Link href="/app/admin/staff/eng-arjun/assign-task" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
            </div>
            <div className="space-y-4">
              {taskRecords.map((task) => (
                <div key={task.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                  <CircleDot className={cn("mt-1 h-5 w-5", task.status === "Completed" ? "text-[#18aa5d]" : "text-[#c0c5e6]")} />
                  <div>
                    <p className="font-semibold text-[#17204c]">{task.title}</p>
                    <p className="mt-1 text-sm text-[#7d85b0]">{engineerProject.name}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-[#5c2dff]">{task.time}</p>
                    <MobilePill tone={task.status === "Completed" ? "green" : task.status === "In Progress" ? "orange" : "slate"} className="mt-2 px-2.5 py-1 text-xs">
                      {task.status}
                    </MobilePill>
                  </div>
                </div>
              ))}
            </div>
          </MobileCard>
        </div>
      </div>
    </MobileShell>
  );
}

export function EngineerProjectsMobileScreen() {
  return (
    <ProjectsMobileScreen
      role="engineer"
      activeHref="/app/engineer/projects"
      title="My Projects"
      subtitle="Track assigned projects"
    />
  );
}

export function EngineerProfileMobileScreen() {
  const worker = workerRecords[0];
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/profile"
      title="Profile"
      subtitle="View and manage your profile"
      backHref="/app/engineer"
      leftMode="back"
      rightSlot={
        <div className="flex items-center gap-3">
          <MobileAvatar src={worker.avatar} label={worker.name} size={48} />
          <div className="text-right">
            <p className="text-lg font-semibold text-[#17204c]">{worker.name}</p>
            <p className="text-sm text-[#7d85b0]">{worker.role}</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <MobileCard>
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <div className="relative">
              <MobileAvatar src={worker.avatar} label={worker.name} size={110} />
              <button type="button" className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center rounded-full bg-[#f3efff] text-[#6a35ff] shadow-[0_12px_24px_rgba(52,67,120,0.15)]">
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[1.75rem] font-semibold text-[#121b44]">{worker.name}</h2>
                <MobileSecondaryButton href="/app/engineer/profile" className="min-h-[42px] w-auto px-4">Edit</MobileSecondaryButton>
              </div>
              <p className="mt-2 text-[1.08rem] text-[#6772a2]">{worker.role}  -  Online</p>
              <div className="mt-4 grid gap-3 text-base text-[#18214d]">
                <p><span className="font-semibold">Employee ID</span>  ENG-1007</p>
                <p><span className="font-semibold">Phone</span>  {worker.phone}</p>
                <p><span className="font-semibold">Email</span>  {worker.email}</p>
              </div>
            </div>
          </div>
        </MobileCard>

        <MobileCard>
          <MobileTabBar
            items={["Personal Info", "Job Info", "Emergency Contact", "Account"]}
            active="Personal Info"
            onChange={() => undefined}
          />
          <div className="mt-5 grid gap-5">
            <InfoGrid
              title="Personal Information"
              items={[
                ["Full Name", "Arjun Nair"],
                ["Date of Birth", "15 Aug 1993"],
                ["Gender", "Male"],
                ["Address", "Puthenangadi House, Kottayam, Kerala - 686001"]
              ]}
            />
            <InfoGrid
              title="Job Information"
              items={[
                ["Designation", "Site Engineer"],
                ["Department", "Operations"],
                ["Reporting To", "Manu Mohan (Project Manager)"],
                ["Work Location", "Kottayam Utility Expansion Project"],
                ["Employment Type", "Full Time"]
              ]}
            />
          </div>
        </MobileCard>

        <MobileCard>
          <MobileSectionTitle title="Quick Actions" />
          <div className="grid grid-cols-2 gap-3">
            <MobileActionTile href="/app/engineer/profile" icon={<UserRound className="h-7 w-7" />} title="Edit Profile" />
            <MobileActionTile href="/app/engineer/profile" icon={<ShieldCheck className="h-7 w-7" />} title="Change Password" />
            <MobileActionTile href="/app/engineer/profile" icon={<ShieldCheck className="h-7 w-7" />} title="Privacy Settings" />
            <MobileActionTile href="/" icon={<ArrowRight className="h-7 w-7" />} title="Logout" />
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function EngineerDocumentsMobileScreen() {
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/reports"
      title="Documents"
      subtitle="View, upload and manage project documents"
      backHref="/app/engineer"
      leftMode="back"
      rightSlot={
        <div className="flex items-center gap-3">
          <MobileAvatar label="Arjun Nair" size={46} />
          <div className="text-right">
            <p className="text-lg font-semibold text-[#17204c]">Arjun Nair</p>
            <p className="text-sm text-[#7d85b0]">Site Engineer</p>
          </div>
        </div>
      }
    >
      <ClientDocumentsMobileScreenInner uploadHref="/app/engineer/documents/new" />
    </MobileShell>
  );
}

export function ClientReportsMobileScreen() {
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/reports"
      title="Reports"
      subtitle="View and manage site reports"
      backHref="/app/client"
      leftMode="back"
      rightSlot={
        <div className="flex items-center gap-3">
          <MobileAvatar label="Arjun Nair" size={46} />
          <div className="text-right">
            <p className="text-base font-bold text-[#17204c]">Arjun Nair</p>
            <p className="text-xs text-[#7d85b0]">Site Engineer</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <MobileCard>
          <MobileTabBar
            items={["Overview", "Daily Reports", "Weekly Reports", "Monthly Reports"]}
            active="Overview"
            onChange={() => undefined}
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MobileMetricCard icon={<FileText className="h-6 w-6" />} label="Total Reports" value="28" meta="All Time" />
            <MobileMetricCard icon={<CheckCircle2 className="h-6 w-6" />} label="Approved" value="22" meta="78%" accent="text-[#18aa5d]" />
            <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value="4" meta="14%" accent="text-[#ff8a00]" />
            <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Rejected" value="2" meta="7%" accent="text-[#ff4f63]" />
          </div>
          <div className="mt-5 grid gap-4">
            <MobileSelect label="Date Range" defaultValue="01 May 2025 - 16 May 2025" />
            <MobileSelect label="Project" defaultValue="All Projects" />
            <MobileSelect label="Report Type" defaultValue="All Types" />
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.2rem] font-bold text-[#121b44]">Reports Overview</h3>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[#18aa5d]"><span className="h-2 w-2 rounded-full bg-[#18aa5d]" />Approved</span>
              <span className="flex items-center gap-1.5 text-[#ff8a00]"><span className="h-2 w-2 rounded-full bg-[#ff8a00]" />Pending</span>
              <span className="flex items-center gap-1.5 text-[#ff4f63]"><span className="h-2 w-2 rounded-full bg-[#ff4f63]" />Rejected</span>
            </div>
          </div>
          <TrendChart />
        </MobileCard>

        <MobileCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.2rem] font-bold text-[#121b44]">Recent Reports</h3>
            <Link href="/app/client/reports" className="text-sm font-bold text-[#5c2dff]">View All</Link>
          </div>
          <div className="space-y-3">
            {projects.slice(0, 5).map((project, index) => (
              <div key={project.id} className="grid grid-cols-[62px_1fr_auto] gap-3 border-b border-[#edf0f7] pb-3 last:border-b-0 last:pb-0">
                <div className="relative h-[62px] overflow-hidden rounded-[10px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-bold text-[#17204c]">{project.name}</p>
                  <p className="mt-1 text-xs text-[#7d85b0]">{`16 May 2025, 09:${15 + index} AM - Daily Report`}</p>
                  <p className="mt-1 text-xs text-[#7d85b0]">Arjun Nair</p>
                </div>
                <div className="grid content-start justify-items-end gap-3">
                  <MobilePill tone={index === 1 ? "orange" : index === 3 ? "red" : "green"}>
                    {index === 1 ? "Pending" : index === 3 ? "Rejected" : "Approved"}
                  </MobilePill>
                  <FileText className="h-5 w-5 text-[#5c2dff]" />
                </div>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobileCard>
          <div className="grid grid-cols-2 gap-3">
            <MobileMetricCard icon={<FileText className="h-6 w-6" />} label="Daily Reports" value="18" meta="64%" />
            <MobileMetricCard icon={<FileCheck2 className="h-6 w-6" />} label="Weekly Reports" value="6" meta="21%" accent="text-[#18aa5d]" />
            <MobileMetricCard icon={<CalendarDays className="h-6 w-6" />} label="Monthly Reports" value="3" meta="11%" accent="text-[#ff8a00]" />
            <MobileMetricCard icon={<FileSpreadsheet className="h-6 w-6" />} label="Other Reports" value="1" meta="4%" accent="text-[#337dff]" />
          </div>
        </MobileCard>

        <MobilePrimaryButton href="/app/client/documents/new">Submit New Report</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}

export function EngineerReportsMobileScreen() {
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/reports"
      title="Reports"
      subtitle="View and manage site reports"
      backHref="/app/engineer"
      leftMode="back"
      rightSlot={
        <div className="flex items-center gap-3">
          <MobileAvatar label="Arjun Nair" size={46} />
          <div className="text-right">
            <p className="text-lg font-semibold text-[#17204c]">Arjun Nair</p>
            <p className="text-sm text-[#7d85b0]">Site Engineer</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <MobileCard>
          <MobileTabBar
            items={["Overview", "Daily Reports", "Weekly Reports", "Monthly Reports"]}
            active="Overview"
            onChange={() => undefined}
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MobileMetricCard icon={<FileText className="h-6 w-6" />} label="Total Reports" value="28" meta="All Time" />
            <MobileMetricCard icon={<CheckCircle2 className="h-6 w-6" />} label="Approved" value="22" meta="78%" accent="text-[#18aa5d]" />
            <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value="4" meta="14%" accent="text-[#ff8a00]" />
            <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Rejected" value="2" meta="7%" accent="text-[#ff4f63]" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MobileSelect label="Date Range" defaultValue="01 May 2025 - 16 May 2025" />
            <MobileSelect label="Project" defaultValue="All Projects" />
            <MobileSelect label="Report Type" defaultValue="All Types" />
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Reports Overview</h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-2 text-[#18aa5d]"><span className="h-2.5 w-2.5 rounded-full bg-[#18aa5d]" />Approved</span>
              <span className="flex items-center gap-2 text-[#ff8a00]"><span className="h-2.5 w-2.5 rounded-full bg-[#ff8a00]" />Pending</span>
              <span className="flex items-center gap-2 text-[#ff4f63]"><span className="h-2.5 w-2.5 rounded-full bg-[#ff4f63]" />Rejected</span>
            </div>
          </div>
          <TrendChart />
        </MobileCard>

        <MobileCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Recent Reports</h3>
            <Link href="/app/engineer/reports" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 5).map((project, index) => (
              <div key={project.id} className="grid grid-cols-[74px_1fr_auto] gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                <div className="relative h-[74px] overflow-hidden rounded-[18px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-semibold text-[#17204c]">{project.name}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">{`16 May 2025, 09:${15 + index} AM  -  Daily Report`}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">Arjun Nair</p>
                </div>
                <div className="grid content-start justify-items-end gap-3">
                  <MobilePill tone={index === 1 ? "orange" : index === 3 ? "red" : "green"}>
                    {index === 1 ? "Pending" : index === 3 ? "Rejected" : "Approved"}
                  </MobilePill>
                  <FileText className="h-5 w-5 text-[#5c2dff]" />
                </div>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobilePrimaryButton href="/app/engineer/shift-report">Submit New Report</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}

export function ChatMobileScreen() {
  const users = useOpsStore((state) => state.users);
  const currentUserId = useOpsStore((state) => state.currentUserId);
  const messages = useOpsStore((state) => state.chatMessages);
  const addChatMessage = useOpsStore((state) => state.addChatMessage);
  const currentUser = getCurrentUser({ users, currentUserId });
  const [body, setBody] = useState("");
  const [connected, setConnected] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const channel = supabase.channel("project-chat-cial-mobile");
    channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    const message = addChatMessage({
      author: currentUser.fullName,
      role: currentUser.role === "finance" ? "Finance" : currentUser.role === "admin" ? "Admin" : "Site Engineer",
      body,
      tone: currentUser.role === "finance" ? "violet" : currentUser.role === "admin" ? "amber" : "blue",
      reactions: 0
    });
    setBody("");
    await guardedSupabaseWrite(
      supabase.from("messages").insert({
        project_id: engineerProject.id,
        sender_id: currentUser.id,
        body: message.body
      })
    );
  }

  return (
    <MobileShell
      role="engineer"
      activeHref="/app/chat"
      title="Send Message"
      subtitle="Chat with Arjun Nair"
      backHref="/app/engineer"
      leftMode="back"
      rightSlot={
        <div className="flex items-center gap-3">
          <MobileAvatar label="Arjun Nair" size={48} />
          <div className="text-right">
            <p className="text-lg font-semibold text-[#17204c]">Arjun Nair</p>
            <p className="text-sm text-[#7d85b0]">Site Engineer</p>
            <p className="text-sm font-semibold text-[#18aa5d]">Online</p>
          </div>
        </div>
      }
    >
      <div className="space-y-5 pb-4">
        <MobileCard>
          <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-[20px] border border-[#e8ebff]">
            <button type="button" className="border-b-4 border-[#5c2dff] px-4 py-4 text-center text-[1.05rem] font-semibold text-[#5c2dff]">Direct Message</button>
            <button type="button" className="px-4 py-4 text-center text-[1.05rem] font-semibold text-[#7178a6]">Team / Group</button>
          </div>
          <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[22px] border border-[#e8ebff] p-4">
            <MobileAvatar label="Arjun Nair" size={56} />
            <div>
              <p className="text-[1.25rem] font-semibold text-[#17204c]">Arjun Nair</p>
              <p className="mt-1 text-sm text-[#7d85b0]">Site Engineer  -  Online</p>
            </div>
            <MobileSecondaryButton href="/app/engineer/profile" className="min-h-[48px] w-auto px-5">View Profile</MobileSecondaryButton>
          </div>
        </MobileCard>

        <div className="space-y-4">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-[#eef1ff] px-4 py-2 text-sm font-semibold text-[#7b82ac]">Today</span>
          </div>
          {messages.slice(-5).map((message, index) => {
            const mine = index % 2 === 0;
            return (
              <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[82%] rounded-[26px] px-5 py-4 text-[1.05rem] leading-8 shadow-[0_14px_30px_rgba(41,53,97,0.06)]", mine ? "bg-[#f4f0ff] text-[#18214d]" : "bg-white text-[#18214d]")}>
                  <p>{message.body}</p>
                  <p className="mt-3 text-right text-sm text-[#7f87b0]">{message.time}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={sendMessage} className="rounded-[28px] border border-[#e7ebff] bg-white p-4 shadow-[0_14px_28px_rgba(41,53,97,0.07)]">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Type your message..."
            className="w-full resize-none border-0 bg-transparent text-[1.05rem] text-[#18214d] outline-none placeholder:text-[#949bc1]"
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-[#6f76a5]">
              <button type="button" className="inline-flex items-center gap-2 text-base font-medium">
                <Paperclip className="h-5 w-5" />
                Attach
              </button>
              <button type="button" className="inline-flex items-center gap-2 text-base font-medium">
                <Camera className="h-5 w-5" />
                Camera
              </button>
              <button type="button" className="inline-flex items-center gap-2 text-base font-medium">
                <FileText className="h-5 w-5" />
                Document
              </button>
            </div>
            <button
              type="submit"
              disabled={!hydrated}
              className="grid h-14 w-14 place-items-center rounded-full bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] text-white shadow-[0_16px_30px_rgba(92,45,255,0.24)] disabled:opacity-60"
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
          <p className="mt-3 text-sm text-[#8b92ba]">{connected ? "Realtime chat connected." : "Connecting realtime chat..."}</p>
        </form>
      </div>
    </MobileShell>
  );
}

export function EngineerAttendanceMobileScreen() {
  const online = useOnlineStatus();
  const addItem = useOfflineStore((state) => state.addItem);
  const ops = useOpsStore(
    useShallow((state) => ({
      users: state.users,
      currentUserId: state.currentUserId,
      activeAssignments: state.activeAssignments,
      markAttendance: state.markAttendance
    }))
  );
  const currentUser = getCurrentUser(ops);
  const project = projects.find((item) => item.id === ops.activeAssignments[currentUser.id]) ?? projects[0];
  const [status, setStatus] = useState("Checked In");
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [checkInTime, setCheckInTime] = useState("09:15 AM");
  const targetCoordinates = project.corridor
    ? { lat: project.corridor.startCoordinates[1], lng: project.corridor.startCoordinates[0] }
    : { lat: project.coordinates[1], lng: project.coordinates[0] };
  const geofenceMeters = project.corridor?.geofenceMeters ?? 120;

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function markAttendance() {
    setBusy(true);
    setStatus("Checking location...");
    const location = await getCurrentPosition(targetCoordinates);
    setCoords(location);
    const distanceFromSiteM = Math.round(distanceMeters(location.lat, location.lng, targetCoordinates.lat, targetCoordinates.lng));
    const withinGeofence = distanceFromSiteM <= geofenceMeters;
    const payload = {
      user_id: currentUser.id,
      project_id: project.id,
      check_in_at: new Date().toISOString(),
      latitude: location.lat,
      longitude: location.lng,
      gps_accuracy_m: 7,
      distance_from_site_m: distanceFromSiteM,
      within_geofence: withinGeofence,
      status: "pending_approval"
    };

    if (!online) {
      ops.markAttendance({
        userId: currentUser.id,
        projectId: project.id,
        checkInAt: payload.check_in_at,
        latitude: location.lat,
        longitude: location.lng,
        accuracyM: 7,
        distanceFromSiteM,
        withinGeofence,
        status: "queued"
      });
      addItem({ type: "attendance", title: "GPS Attendance", size: "0.2 MB", payload });
      setStatus("Saved Offline");
    } else {
      const { error } = await guardedSupabaseWrite(supabase.from("attendance").insert(payload));
      ops.markAttendance({
        userId: currentUser.id,
        projectId: project.id,
        checkInAt: payload.check_in_at,
        latitude: location.lat,
        longitude: location.lng,
        accuracyM: 7,
        distanceFromSiteM,
        withinGeofence,
        status: error ? "queued" : "pending_approval"
      });
      setStatus(error ? "Queued for Sync" : withinGeofence ? "On Time" : "Pending Approval");
    }

    setCheckInTime(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      })
    );
    setBusy(false);
  }

  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/attendance"
      title="Mark Attendance"
      subtitle="Daily attendance with GPS validation"
      backHref="/app/engineer"
      leftMode="back"
      rightSlot={
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[#cabdff] bg-white text-[#5c2dff]">
          <CalendarDays className="h-6 w-6" />
        </div>
      }
    >
      <div className="space-y-6">
        <MobileGradientCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[1.45rem] font-semibold">Today, 16 May 2025</p>
              <p className="mt-1 text-lg text-white/85">Friday</p>
            </div>
            <MobilePill tone="green" className="bg-white/14 text-white">Working Day</MobilePill>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-6">
            <div className="border-r border-white/20 pr-4">
              <p className="whitespace-nowrap text-[1.9rem] font-bold">{checkInTime}</p>
              <p className="mt-2 text-lg text-white/90">Checked In</p>
            </div>
            <div className="pl-4">
              <p className="whitespace-nowrap text-[1.9rem] font-bold">--:--</p>
              <p className="mt-2 text-lg text-white/90">Check-out</p>
            </div>
          </div>
        </MobileGradientCard>

        <MobileCard className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-[#ebfaf1] text-[#18aa5d]">
            <CalendarDays className="h-8 w-8" />
          </div>
          <div>
            <p className="text-[1.35rem] font-semibold text-[#121b44]">Attendance Status</p>
            <p className="mt-1 text-base text-[#6c78a8]">You have checked in at {checkInTime}</p>
            <p className="mt-1 text-base text-[#6c78a8]">Location: {project.location}</p>
          </div>
          <MobilePill tone={status === "On Time" || status === "Checked In" ? "green" : status === "Saved Offline" ? "orange" : "blue"}>
            {status}
          </MobilePill>
        </MobileCard>

        <MobileCard>
          <h3 className="mb-4 text-[1.45rem] font-semibold text-[#121b44]">Mark Attendance</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[#cfead8] bg-[#f4fbf6] p-5 text-center">
              <p className="text-[1.4rem] font-semibold text-[#18aa5d]">Check In</p>
              <div className="mt-4 grid h-16 w-16 place-items-center rounded-full border border-[#bfe2ca] bg-white text-[#18aa5d] mx-auto">
                <ArrowRight className="h-8 w-8" />
              </div>
              <p className="mt-5 text-[2rem] font-semibold text-[#18214d]">{checkInTime}</p>
              <p className="mt-2 text-base text-[#7e87b1]">16 May 2025</p>
              <div className="mt-5 rounded-[18px] border border-[#bfe2ca] bg-white py-3 text-base font-semibold text-[#18aa5d]">
                Completed
              </div>
            </div>
            <div className="rounded-[24px] border border-[#e8ebff] bg-white p-5 text-center">
              <p className="text-[1.4rem] font-semibold text-[#67719f]">Check Out</p>
              <div className="mt-4 grid h-16 w-16 place-items-center rounded-full border border-[#e1e6fb] bg-[#f8f9ff] text-[#7f87b0] mx-auto">
                <ArrowRight className="h-8 w-8" />
              </div>
              <p className="mt-5 text-[2rem] font-semibold text-[#18214d]">--:--</p>
              <button type="button" className="mt-6 inline-flex min-h-[54px] w-full items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white">
                Check Out
              </button>
            </div>
          </div>
          <div className="mt-5 rounded-[22px] border border-[#e7ebff] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
                  <MapPinned className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-[#17204c]">Check-in Location</p>
                  <p className="mt-1 text-base text-[#7f87b0]">{project.name}</p>
                  <p className="mt-1 text-sm text-[#7f87b0]">{project.location}</p>
                </div>
              </div>
              <Link href="/app/admin/map/full" className="text-base font-semibold text-[#5c2dff]">View on Map</Link>
            </div>
          </div>
        </MobileCard>

        <MobileCard>
          <h3 className="mb-4 text-[1.45rem] font-semibold text-[#121b44]">Today's Schedule</h3>
          <div className="space-y-4">
            {[
              ["09:00 AM - 10:00 AM", "Site inspection", "Completed"],
              ["11:00 AM - 12:00 PM", "Material Quality Check", "Upcoming"],
              ["02:00 PM - 04:00 PM", "Progress Review Meeting", "Upcoming"]
            ].map(([time, title, state]) => (
              <div key={title} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[22px] border border-[#e7ebff] p-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
                  <Clock3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-[#6b76a6]">{time}</p>
                  <p className="mt-1 text-[1.18rem] font-semibold text-[#17204c]">{title}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">{project.name}</p>
                </div>
                <div className="grid content-start justify-items-end gap-3">
                  <MobilePill tone={state === "Completed" ? "green" : "orange"}>{state}</MobilePill>
                  <ChevronRight className="h-5 w-5 text-[#8a91bc]" />
                </div>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobileCard>
          <MobileTextArea label="Notes (Optional)" placeholder="Add a note about your work..." rows={4} />
          <p className="mt-3 text-sm text-[#7d85b0]">
            {coords
              ? `${Math.round(distanceMeters(coords.lat, coords.lng, targetCoordinates.lat, targetCoordinates.lng))} m from site start. Geofence ${geofenceMeters} m.`
              : "Location permission is only requested when you tap submit attendance."}
          </p>
        </MobileCard>

        <button
          type="button"
          onClick={() => {
            void markAttendance();
          }}
          disabled={!hydrated || busy}
          className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)] disabled:opacity-60"
        >
          <CheckCircle2 className="mr-2 h-5 w-5" />
          {busy ? "Submitting..." : "Submit Attendance"}
        </button>
      </div>
    </MobileShell>
  );
}

export function GenericFinanceRequestMobileScreen() {
  const [saved, setSaved] = useState(false);
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/projects"
      title="Finance Request"
      subtitle="Raise a request for advance or reimbursement"
      backHref="/app/engineer"
      leftMode="back"
      bottomNav={false}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="space-y-4">
            <MobileSelect label="Project" defaultValue={engineerProject.name} />
            <MobileInput label="Request Title" placeholder="HDD bearing replacement" />
            <MobileTextArea label="Description" placeholder="Add request details..." rows={5} />
            <div className="grid grid-cols-2 gap-4">
              <MobileInput label="Amount" placeholder="12000" />
              <MobileSelect label="Urgency" defaultValue="Urgent" />
            </div>
            <MobileUploadBox title="Attach Invoice or Photo" detail="Upload invoice, bill or site proof" />
          </div>
        </MobileCard>
        {saved ? <p className="text-sm font-semibold text-[#18aa5d]">Finance request draft saved.</p> : null}
        <button type="submit" className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)]">
          Submit Request
        </button>
      </form>
    </MobileShell>
  );
}

export function GenericLeaveMobileScreen() {
  const [saved, setSaved] = useState(false);
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/profile"
      title="Leave Request"
      subtitle="Request time off and track approvals"
      backHref="/app/engineer"
      leftMode="back"
      bottomNav={false}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="grid gap-4">
            <MobileSelect label="Leave Type" defaultValue="Casual Leave" />
            <div className="grid grid-cols-2 gap-4">
              <MobileInput label="Start Date" placeholder="20 May 2025" />
              <MobileInput label="End Date" placeholder="22 May 2025" />
            </div>
            <MobileTextArea label="Reason" placeholder="Family function" rows={4} />
          </div>
        </MobileCard>
        {saved ? <p className="text-sm font-semibold text-[#18aa5d]">Leave request saved for review.</p> : null}
        <button type="submit" className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)]">
          Submit Leave Request
        </button>
      </form>
    </MobileShell>
  );
}

export function GenericShiftReportMobileScreen() {
  const [saved, setSaved] = useState(false);
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/reports"
      title="Daily Shift Report"
      subtitle="Complete your shift summary and submit"
      backHref="/app/engineer/reports"
      leftMode="back"
      bottomNav={false}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="space-y-4">
            <MobileSelect label="Project" defaultValue={engineerProject.name} />
            <div className="grid grid-cols-2 gap-4">
              <MobileInput label="Meters Completed" placeholder="245" />
              <MobileInput label="Fuel Used (L)" placeholder="32" />
            </div>
            <MobileTextArea label="Work Notes" placeholder="Summarize work completed..." rows={5} />
            <MobileTextArea label="Safety Issue" placeholder="Add safety notes if any..." rows={4} />
            <MobileUploadBox title="Upload Shift Photo" detail="Add image proof or daily report photo" />
          </div>
        </MobileCard>
        {saved ? <p className="text-sm font-semibold text-[#18aa5d]">Shift report captured locally.</p> : null}
        <button type="submit" className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)]">
          Submit Shift Report
        </button>
      </form>
    </MobileShell>
  );
}

export function GenericOfflineSyncMobileScreen() {
  const online = useOnlineStatus();
  const forceOffline = useOpsStore((state) => state.forceOffline);
  const setForceOffline = useOpsStore((state) => state.setForceOffline);
  const items = useOfflineStore((state) => state.items);
  const markSynced = useOfflineStore((state) => state.markSynced);
  const clearAll = useOfflineStore((state) => state.clearAll);
  const pending = items.filter((item) => item.status !== "synced");
  const synced = items.filter((item) => item.status === "synced");
  const percent = Math.round((synced.length / Math.max(items.length, 1)) * 100);

  function syncNow() {
    pending.forEach((item, index) => {
      window.setTimeout(() => markSynced(item.id), 280 * (index + 1));
    });
  }

  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/profile"
      title="Offline Sync"
      subtitle="View and manage your offline data"
      backHref="/app/engineer"
      leftMode="back"
      bottomNav={false}
    >
      <div className="space-y-6">
        <MobileCard>
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <div className="grid h-36 w-36 place-items-center rounded-full border-[10px] border-[#5c2dff] border-r-[#e8ebff] text-center">
              <div>
                <p className="text-[2rem] font-semibold text-[#121b44]">{Math.max(percent, 50)}%</p>
                <p className="text-sm text-[#7d85b0]">Synced</p>
              </div>
            </div>
            <div>
              <p className="text-[1.4rem] font-semibold text-[#121b44]">{online ? "Sync in Progress..." : "Offline Mode"}</p>
              <p className="mt-2 text-base text-[#6974a3]">Uploading {pending.length} of {items.length} items</p>
              <div className="mt-4">
                <MobileProgressBar value={Math.max(percent, 50)} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForceOffline(!forceOffline)}
                  className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] border border-[#ffd3a9] bg-white px-4 text-base font-semibold text-[#ff8a00]"
                >
                  {forceOffline ? "Restore Signal" : "Simulate No Signal"}
                </button>
                <button
                  type="button"
                  onClick={syncNow}
                  className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] border border-[#cabdff] bg-white px-4 text-base font-semibold text-[#5c2dff]"
                >
                  Sync Now
                </button>
              </div>
            </div>
          </div>
        </MobileCard>

        {!online ? (
          <MobileCard className="border-[#ffe3bc] bg-[#fff9f0]">
            <div className="flex items-start gap-3">
              <WifiOff className="mt-1 h-6 w-6 text-[#ff8a00]" />
              <div>
                <p className="text-[1.2rem] font-semibold text-[#17204c]">You are currently offline</p>
                <p className="mt-1 text-sm text-[#7d85b0]">Data is saved locally and will sync automatically.</p>
              </div>
            </div>
          </MobileCard>
        ) : null}

        <MobileCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Pending Items ({pending.length})</h3>
            <button type="button" onClick={clearAll} className="text-sm font-semibold text-[#ff4f63]">Clear Pending</button>
          </div>
          <div className="space-y-4">
            {pending.length ? (
              pending.map((item) => (
                <div key={item.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#17204c]">{item.title}</p>
                    <p className="mt-1 text-sm text-[#7d85b0]">{item.createdAt}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-[#17204c]">{item.size}</p>
                    <p className="mt-1 font-semibold text-[#ff8a00]">{item.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#7d85b0]">No pending items in the offline queue.</p>
            )}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

function MobileMapPreview({
  height,
  variant = "portfolio",
  full = false,
  progress = 72
}: {
  height: number;
  variant?: "portfolio" | "clusters" | "workers" | "worker" | "route";
  full?: boolean;
  progress?: number;
}) {
  const workerPins = [
    { x: 58, y: 16, name: "Manu Mohan", role: "Supervisor", tone: "green" },
    { x: 44, y: 30, name: "Jithin Jose", role: "Engineer", tone: "blue" },
    { x: 73, y: 40, name: "Divya S", role: "Finance", tone: "orange" },
    { x: 52, y: 55, name: "Aby Thomas", role: "Engineer", tone: "blue" },
    { x: 68, y: 64, name: "Rajeev R", role: "Supervisor", tone: "green" },
    { x: 50, y: 75, name: "Arjun Nair", role: "Engineer", tone: "blue" }
  ];
  const clusterPins = [
    { x: 32, y: 31, value: "12", tone: "green" },
    { x: 49, y: 40, value: "8", tone: "violet" },
    { x: 69, y: 50, value: "6", tone: "orange" },
    { x: 57, y: 72, value: "", tone: "blue" }
  ];
  const routePoints = "18,76 31,64 41,60 52,48 62,40 78,34";
  const progressWidth = Math.max(18, Math.min(82, progress));
  const toneClass: Record<string, string> = {
    green: "border-[#15bd72] text-[#15a864]",
    blue: "border-[#2477ff] text-[#1766e8]",
    orange: "border-[#ff8a00] text-[#e27800]",
    violet: "border-[#6b34ff] text-[#5c2dff]"
  };

  return (
    <div
      className="relative h-full overflow-hidden rounded-[10px] bg-[#eaf2ec]"
      style={{ minHeight: height }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <rect width="100" height="100" fill="#eaf2ec" />
        <path d="M0 0 H27 C20 24 22 48 14 67 C8 82 8 94 0 100 Z" fill="#b7ddfb" />
        <path d="M22 0 C37 16 42 32 51 44 C62 58 72 68 100 75" fill="none" stroke="#ffffff" strokeWidth="2.4" opacity="0.75" />
        <path d="M30 9 C44 18 58 23 83 21" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
        <path d="M28 82 C46 70 61 63 93 58" fill="none" stroke="#ffffff" strokeWidth="1.7" opacity="0.72" />
        <path d="M41 0 C40 18 43 38 39 59 C36 75 34 85 36 100" fill="none" stroke="#d5d8c4" strokeWidth="1.1" />
        <path d="M65 0 C61 19 63 42 58 62 C55 78 55 88 51 100" fill="none" stroke="#d5d8c4" strokeWidth="1.1" />
        <text x="30" y="19" fontSize="4" fontWeight="700" fill="#2a365a">Kozhikode</text>
        <text x="45" y="49" fontSize="4" fontWeight="700" fill="#2a365a">Thrissur</text>
        <text x="53" y="70" fontSize="4" fontWeight="700" fill="#2a365a">Kochi</text>
        <text x="70" y="67" fontSize="4" fontWeight="700" fill="#2a365a">Kottayam</text>
      </svg>

      {variant === "route" ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <polyline points={routePoints} fill="none" stroke="#6b35ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.5 1.2" />
          <polyline points={`18,76 31,64 41,60 ${progressWidth > 45 ? "52,48" : ""} ${progressWidth > 62 ? "62,40" : ""}`} fill="none" stroke="#1f78ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="18" cy="76" r="2.4" fill="#18bd72" stroke="#fff" strokeWidth="1.2" />
          <circle cx="78" cy="34" r="2.4" fill="#ff4056" stroke="#fff" strokeWidth="1.2" />
          <circle cx="52" cy="48" r="2.6" fill="#fff" stroke="#6b35ff" strokeWidth="1.4" />
        </svg>
      ) : null}

      {variant === "workers" ? (
        <div className="absolute inset-0">
          {workerPins.map((pin) => (
            <div
              key={pin.name}
              className="absolute flex items-center gap-2 rounded-[10px] border border-white bg-white px-2.5 py-2 shadow-[0_8px_22px_rgba(20,35,80,0.16)]"
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-full border-2 bg-white text-[10px] font-bold", toneClass[pin.tone])}>
                {initials(pin.name)}
              </span>
              <span>
                <span className="block whitespace-nowrap text-xs font-bold text-[#11183d]">{pin.name}</span>
                <span className={cn("block whitespace-nowrap text-[10px] font-bold", toneClass[pin.tone])}>{pin.role}</span>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {variant === "clusters" || variant === "portfolio" ? (
        <div className="absolute inset-0">
          {clusterPins.map((pin) => (
            <div
              key={`${pin.x}-${pin.y}`}
              className={cn(
                "absolute grid h-12 w-12 place-items-center rounded-full border-[5px] bg-white text-base font-bold shadow-[0_8px_22px_rgba(20,35,80,0.16)]",
                toneClass[pin.tone]
              )}
              style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)" }}
            >
              {pin.value || "AN"}
            </div>
          ))}
        </div>
      ) : null}

      {variant === "worker" ? (
        <div className="absolute inset-0">
          <div className="absolute left-[44%] top-[44%] rounded-[10px] bg-white px-3 py-2 text-xs font-bold text-[#11183d] shadow-[0_8px_22px_rgba(20,35,80,0.16)]">
            Kottayam Utility Expansion
          </div>
          <div className="absolute left-[52%] top-[60%] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[5px] border-[#6b35ff] bg-white text-xs font-bold text-[#6b35ff] shadow-[0_8px_22px_rgba(20,35,80,0.16)]">
            AN
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-4 right-4 grid gap-2">
        <button type="button" className="grid h-10 w-10 place-items-center rounded-[10px] bg-white text-xl font-bold text-[#101638] shadow-[0_8px_22px_rgba(20,35,80,0.12)]">
          +
        </button>
        <button type="button" className="grid h-10 w-10 place-items-center rounded-[10px] bg-white text-xl font-bold text-[#101638] shadow-[0_8px_22px_rgba(20,35,80,0.12)]">
          -
        </button>
      </div>
      {!full && variant !== "route" ? (
        <Link
          href="/app/admin/map/full"
          className="absolute bottom-4 left-4 rounded-[10px] bg-white px-4 py-3 text-sm font-bold text-[#5c2dff] shadow-[0_8px_22px_rgba(20,35,80,0.12)]"
        >
          View Full Map
        </Link>
      ) : null}
    </div>
  );
}

function ClientDocumentsMobileScreenInner({ uploadHref }: { uploadHref: string }) {
  const [tab, setTab] = useState("All Documents");
  return (
    <div className="space-y-6">
      <MobileCard>
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#e8ebff] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#6a35ff]">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-[#8690bc]">Project</p>
              <p className="text-[1.35rem] font-semibold text-[#121b44]">Kottayam Utility Expansion</p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 text-[#7c84b0]" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <MobileSearchBar placeholder="Search documents..." />
          <MobileFilterButton />
        </div>
      </MobileCard>

      <div className="grid grid-cols-2 gap-3">
        <MobileMetricCard icon={<FolderOpen className="h-6 w-6" />} label="Total Documents" value="24" meta="Total" />
        <MobileMetricCard icon={<CheckCircle2 className="h-6 w-6" />} label="Approved" value="16" meta="Documents" accent="text-[#18aa5d]" />
        <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value="5" meta="Documents" accent="text-[#ff8a00]" />
        <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Rejected" value="3" meta="Documents" accent="text-[#ff4f63]" />
      </div>

      <MobileCard>
        <MobileTabBar
          items={["All Documents", "Folders", "Recent", "Shared"]}
          active={tab}
          onChange={setTab}
        />
        <div className="mt-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.3rem] font-semibold text-[#121b44]">Folders</h3>
            <Link href={uploadHref} className="text-sm font-semibold text-[#5c2dff]">View All Folders</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Permissions", "8 files"],
              ["PWD Approvals", "6 files"],
              ["Daily Reports", "15 files"],
              ["Site Photos", "32 files"]
            ].map(([name, count]) => (
              <div key={name} className="rounded-[22px] border border-[#e8ebff] p-4">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f3efff] text-[#b2a8ff]">
                  <Folder className="h-7 w-7" />
                </div>
                <p className="font-semibold text-[#17204c]">{name}</p>
                <p className="mt-1 text-sm text-[#8690bc]">{count}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.3rem] font-semibold text-[#121b44]">All Documents</h3>
            <button type="button" className="text-sm font-semibold text-[#5c2dff]">Sort by: Newest</button>
          </div>
          <div className="space-y-4">
            {documentRecords.map((document) => (
              <div key={document.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                <div className={cn("grid h-12 w-12 place-items-center rounded-2xl text-sm font-semibold text-white", docTone(document.type))}>
                  {document.type}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[1.12rem] font-semibold text-[#17204c]">{document.name}</p>
                  <p className="mt-1 text-sm text-[#7f88b5]">{document.meta}</p>
                  <p className="mt-1 text-sm text-[#7f88b5]">{document.author}</p>
                </div>
                <div className="grid content-start justify-items-end gap-3">
                  <MobilePill tone={statusTone(document.status)}>{document.status}</MobilePill>
                  <MoreVertical className="h-5 w-5 text-[#8a91bc]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </MobileCard>

      <MobilePrimaryButton href={uploadHref}>Upload Document</MobilePrimaryButton>
      <p className="text-center text-sm text-[#7d85b1]">Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)</p>
    </div>
  );
}

function TrendChart() {
  const width = 320;
  const height = 180;
  const max = 12;
  const makePath = (values: number[]) =>
    values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - (value / max) * (height - 10);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="approvedFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2ccb74" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2ccb74" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M 0 ${height} ${makePath(reportTrend.approved).slice(1)} L ${width} ${height} Z`} fill="url(#approvedFill)" />
      <path d={makePath(reportTrend.approved)} fill="none" stroke="#20ba65" strokeWidth="3" />
      <path d={makePath(reportTrend.pending)} fill="none" stroke="#ff8a00" strokeWidth="3" />
      <path d={makePath(reportTrend.rejected)} fill="none" stroke="#ff4f63" strokeWidth="3" />
      {reportTrend.approved.map((value, index) => {
        const x = (index / (reportTrend.approved.length - 1)) * width;
        const y = height - (value / max) * (height - 10);
        return <circle key={`approved-${index}`} cx={x} cy={y} r="3.5" fill="#20ba65" />;
      })}
    </svg>
  );
}

function CalendarCard() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const numbers = Array.from({ length: 35 }, (_, index) => index + 1);
  return (
    <MobileCard className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-[#6a35ff]" />
          <p className="text-[1.22rem] font-semibold text-[#121b44]">Attendance Overview</p>
        </div>
        <p className="font-semibold text-[#5c2dff]">May 2025</p>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[#7b84af]">
        {days.map((day) => (
          <span key={day}>{day}</span>
        ))}
        {numbers.map((value) => (
          <span
            key={value}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full justify-self-center text-sm font-medium",
              value === 16
                ? "bg-[#5c2dff] text-white"
                : value === 19
                  ? "bg-[#e8f9ef] text-[#18aa5d]"
                  : value === 22
                    ? "bg-[#fff2e3] text-[#ff8a00]"
                    : "text-[#1c2450]"
            )}
          >
            {value}
          </span>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#6d78a9]">
        <LegendItem label="Present" value="" tone="green" />
        <LegendItem label="Leave" value="" tone="orange" />
        <LegendItem label="Absent" value="" tone="red" />
        <LegendItem label="Today" value="" tone="violet" />
      </div>
    </MobileCard>
  );
}

function ScheduleCard() {
  return (
    <MobileCard className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-[#6a35ff]" />
          <p className="text-[1.22rem] font-semibold text-[#121b44]">Today's Schedule</p>
        </div>
        <Link href="/app/engineer/reports" className="text-sm font-semibold text-[#5c2dff]">View Full Schedule</Link>
      </div>
      <div className="space-y-4">
        {[
          ["09:00 AM", "Site inspection at Block A", "Pending", "#7c4dff"],
          ["11:30 AM", "Material quality check", "In Progress", "#22c55e"],
          ["02:30 PM", "Progress review meeting", "Upcoming", "#ff8a00"],
          ["04:00 PM", "Upload daily report", "Upcoming", "#3b82f6"]
        ].map(([time, label, state, color]) => (
          <div key={label} className="grid grid-cols-[auto_auto_1fr_auto] items-start gap-3">
            <p className="text-sm font-semibold text-[#121b44]">{time}</p>
            <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <p className="font-semibold text-[#17204c]">{label}</p>
              <p className="mt-1 text-sm text-[#7d85b0]">{engineerProject.name}</p>
            </div>
            <MobilePill tone={state === "Pending" ? "slate" : state === "In Progress" ? "orange" : "blue"} className="px-2.5 py-1 text-xs">
              {state}
            </MobilePill>
          </div>
        ))}
      </div>
    </MobileCard>
  );
}

function BigGradientStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[2rem] font-semibold leading-none tracking-[-0.04em]">{value}</p>
      <p className="mt-2 text-sm text-white/80">{label}</p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[#7a84b0]">{label}</p>
      <p className="mt-1 font-semibold text-[#17204c]">{value}</p>
    </div>
  );
}

function InfoGrid({
  title,
  items
}: {
  title?: string;
  items: Array<[string, string]>;
}) {
  return (
    <div>
      {title ? <h3 className="mb-4 text-[1.3rem] font-semibold text-[#121b44]">{title}</h3> : null}
      <div className="space-y-3 rounded-[24px] border border-[#e8ebff] p-4">
        {items.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[140px_1fr] gap-3 border-b border-[#edf0ff] pb-3 last:border-b-0 last:pb-0">
            <p className="text-sm text-[#7f87b0]">{label}</p>
            <p className="font-semibold text-[#17204c]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendItem({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "green" | "orange" | "red" | "violet" | "slate";
}) {
  const dotTone = {
    green: "bg-[#18aa5d]",
    orange: "bg-[#ff8a00]",
    red: "bg-[#ff4f63]",
    violet: "bg-[#5c2dff]",
    slate: "bg-[#8f97c0]"
  }[tone];

  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", dotTone)} />
      <span>{label}</span>
      {value ? <span className="font-semibold text-[#17204c]">{value}</span> : null}
    </div>
  );
}

function statusTone(value: string): "green" | "orange" | "red" | "blue" | "slate" {
  if (value === "Active" || value === "Approved" || value === "On Time" || value === "Completed") return "green";
  if (value === "Pending" || value === "Pending Approval" || value === "On Leave" || value === "In Progress") return "orange";
  if (value === "Rejected" || value === "Inactive") return "red";
  if (value === "On Site") return "blue";
  return "slate";
}

function docTone(type: DocumentRecord["type"]) {
  if (type === "PDF") return "bg-[#ff5f6d]";
  if (type === "DOC") return "bg-[#3b82f6]";
  if (type === "XLS") return "bg-[#16a34a]";
  return "bg-[#84cc16]";
}

function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  const forceOffline = useOpsStore((state) => state.forceOffline);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return forceOffline ? false : online;
}

function getCurrentPosition(fallback: { lat: number; lng: number }) {
  return new Promise<{ lat: number; lng: number }>((resolve) => {
    if (!navigator.geolocation) {
      resolve(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(fallback),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  });
}

function distanceMeters(latA: number, lngA: number, latB: number, lngB: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function guardedSupabaseWrite<T extends { error: unknown }>(operation: PromiseLike<T>) {
  try {
    return await operation;
  } catch (error) {
    return { error } as T;
  }
}
