"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
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
  Settings,
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
import { projects, sitePhotos } from "@/lib/demo-data";
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
import {
  getCurrentUser,
  type DemoUser,
  type ManagedTask,
  type OpsState,
  useOpsStore
} from "@/store/ops-store";
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
  status: "Pending" | "In Progress" | "Completed" | "Upcoming" | "Blocked";
};

type EnterpriseApprovalItem = {
  id: string;
  entityId: string;
  kind: "access" | "leave" | "attendance" | "finance" | "report" | "document";
  name: string;
  label: string;
  info: string;
  sub: string;
  priority: "High Priority" | "Medium Priority" | "Low Priority";
  time: string;
  projectId?: string;
};

function roleBadgeLabel(role: DemoUser["role"]) {
  switch (role) {
    case "supervisor":
      return "Supervisor";
    case "finance":
      return "Finance";
    case "client":
      return "Client";
    case "admin":
      return "Admin";
    default:
      return "Engineer";
  }
}

function workerStatusLabel(user: DemoUser): WorkerRecord["status"] {
  if (user.status === "inactive") return "Inactive";
  if (user.workStatus === "on_leave") return "On Leave";
  if (user.workStatus === "on_site") return "On Site";
  if (user.workStatus === "offline") return "Offline";
  return "Active";
}

function taskPriorityLabel(priority: ManagedTask["priority"]): TaskRecord["priority"] {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

function taskStatusLabel(status: ManagedTask["status"]): TaskRecord["status"] {
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "blocked") return "Blocked";
  if (status === "upcoming") return "Upcoming";
  return "Pending";
}

function projectById(state: OpsState, projectId?: string) {
  return state.managedProjects.find((project) => project.id === projectId) ?? state.managedProjects[0];
}

function userById(state: OpsState, userId?: string) {
  return state.users.find((user) => user.id === userId);
}

function getProjectsForUser(state: OpsState, user: DemoUser) {
  if (user.role === "admin") return state.managedProjects;
  if (user.role === "client") {
    const allowedProjectIds = state.clientPermissions
      .filter((permission) => permission.clientUserId === user.id && permission.status === "approved")
      .map((permission) => permission.projectId);
    return state.managedProjects.filter((project) => allowedProjectIds.includes(project.id));
  }
  return state.managedProjects.filter((project) => user.projectIds.includes(project.id));
}

function getPrimaryProjectForUser(state: OpsState, user: DemoUser) {
  return (
    projectById(state, state.activeAssignments[user.id]) ??
    getProjectsForUser(state, user)[0] ??
    state.managedProjects[0]
  );
}

function getWorkerRecords(state: OpsState): WorkerRecord[] {
  return state.users
    .filter((user) => user.role !== "admin")
    .map((user) => {
      const primaryProject = getPrimaryProjectForUser(state, user);
      return {
        id: user.id,
        name: user.fullName,
        role: user.designation,
        email: user.email,
        phone: user.phone,
        status: workerStatusLabel(user),
        project: primaryProject?.name ?? user.site,
        location: primaryProject?.location ?? user.site,
        joined: user.joinedAt,
        badge: roleBadgeLabel(user.role),
        avatar: user.avatar ?? undefined
      };
    });
}

function getTaskRecords(state: OpsState, assigneeUserId?: string): TaskRecord[] {
  return state.tasks
    .filter((task) => (assigneeUserId ? task.assigneeUserId === assigneeUserId : true))
    .map((task) => ({
      id: task.id,
      title: task.title,
      detail: task.detail,
      priority: taskPriorityLabel(task.priority),
      time: task.dueAt.split(", ").at(-1) ?? task.dueAt,
      status: taskStatusLabel(task.status)
    }));
}

function getDocumentRecords(state: OpsState, viewer: DemoUser, projectId?: string): DocumentRecord[] {
  return state.projectDocuments
    .filter((document) => document.visibilityRoles.includes(viewer.role))
    .filter((document) => (projectId ? document.projectId === projectId : true))
    .filter((document) => {
      if (viewer.role === "admin") return true;
      if (viewer.role === "client") {
        return state.clientPermissions.some(
          (permission) =>
            permission.clientUserId === viewer.id &&
            permission.projectId === document.projectId &&
            permission.status === "approved" &&
            permission.canViewDocuments
        );
      }
      return viewer.projectIds.includes(document.projectId);
    })
    .map((document) => ({
      id: document.id,
      name: document.name,
      type: document.type === "ZIP" ? "PDF" : document.type,
      status:
        document.status === "approved"
          ? "Approved"
          : document.status === "pending"
            ? "Pending"
            : "Rejected",
      meta: `${document.uploadedAt}  -  ${document.sizeLabel}`,
      author: userById(state, document.authorUserId)?.fullName ?? "TELGO"
    }));
}

function getVisibleReports(state: OpsState, viewer: DemoUser) {
  return state.projectReports.filter((report) => {
    if (viewer.role === "admin") return true;
    if (viewer.role === "client") {
      return state.clientPermissions.some(
        (permission) =>
          permission.clientUserId === viewer.id &&
          permission.projectId === report.projectId &&
          permission.status === "approved" &&
          permission.canViewReports
      );
    }
    return viewer.projectIds.includes(report.projectId);
  });
}

function reportStatusLabel(status: "approved" | "pending" | "rejected") {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  return "Rejected";
}

function reportStatusTone(status: "approved" | "pending" | "rejected") {
  if (status === "approved") return "green";
  if (status === "pending") return "orange";
  return "red";
}

function reportTypeLabel(type: "daily" | "weekly" | "monthly") {
  if (type === "daily") return "Daily Report";
  if (type === "weekly") return "Weekly Report";
  return "Monthly Report";
}

function getApprovalQueue(state: OpsState): EnterpriseApprovalItem[] {
  const access = state.accessRequests
    .filter((request) => request.status === "pending")
    .map<EnterpriseApprovalItem>((request) => ({
      id: `approval-${request.id}`,
      entityId: request.id,
      kind: "access",
      name: request.fullName,
      label: "New User",
      info: `Role: ${roleBadgeLabel(request.requestedRole)}`,
      sub: request.accessPurpose,
      priority: "Medium Priority",
      time: request.createdAt,
      projectId: state.managedProjects[0]?.id
    }));

  const leave = state.leaveRequests
    .filter((request) => request.status === "pending")
    .map<EnterpriseApprovalItem>((request) => ({
      id: `approval-${request.id}`,
      entityId: request.id,
      kind: "leave",
      name: userById(state, request.userId)?.fullName ?? "Leave Request",
      label: "Leave Request",
      info: `${request.startDate} - ${request.endDate}`,
      sub: request.reason,
      priority: "High Priority",
      time: request.createdAt,
      projectId: state.activeAssignments[request.userId]
    }));

  const attendance = state.attendance
    .filter((record) => record.status === "pending_approval")
    .map<EnterpriseApprovalItem>((record) => ({
      id: `approval-${record.id}`,
      entityId: record.id,
      kind: "attendance",
      name: userById(state, record.userId)?.fullName ?? "Attendance Review",
      label: "Attendance Review",
      info: `Distance: ${record.distanceFromSiteM} m`,
      sub: record.withinGeofence ? "Inside geofence" : "Outside geofence",
      priority: record.withinGeofence ? "Medium Priority" : "High Priority",
      time: record.checkInAt,
      projectId: record.projectId
    }));

  const finance = state.financeRequests
    .filter((request) => request.status === "pending")
    .map<EnterpriseApprovalItem>((request) => ({
      id: `approval-${request.id}`,
      entityId: request.id,
      kind: "finance",
      name: request.title,
      label: "Expense Request",
      info: `Amount: ${formatInr(request.amount)}`,
      sub: projectById(state, request.projectId)?.name ?? "Project spend",
      priority: request.urgency === "urgent" ? "High Priority" : "Medium Priority",
      time: request.createdAt,
      projectId: request.projectId
    }));

  const reports = state.projectReports
    .filter((report) => report.status === "pending")
    .map<EnterpriseApprovalItem>((report) => ({
      id: `approval-${report.id}`,
      entityId: report.id,
      kind: "report",
      name: report.title,
      label: "Report Review",
      info: `Progress: ${report.progressPercent}%`,
      sub: report.summary,
      priority: "Medium Priority",
      time: report.submittedAt,
      projectId: report.projectId
    }));

  const documents = state.projectDocuments
    .filter((document) => document.status === "pending")
    .map<EnterpriseApprovalItem>((document) => ({
      id: `approval-${document.id}`,
      entityId: document.id,
      kind: "document",
      name: document.name,
      label: "Document Approval",
      info: document.type,
      sub: projectById(state, document.projectId)?.name ?? "Project document",
      priority: document.category === "permission" ? "High Priority" : "Medium Priority",
      time: document.uploadedAt,
      projectId: document.projectId
    }));

  return [...leave, ...access, ...attendance, ...finance, ...reports, ...documents];
}

const reportTrend = {
  approved: [6, 6, 10, 9, 7, 7, 6, 6, 10, 9, 7, 7, 9, 12],
  pending: [2, 2, 5, 3, 2, 1, 1, 2, 5, 3, 2, 1, 1, 2],
  rejected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0]
};

const projectSettingsRows = [
  "Edit Project Details",
  "Assignments & Permissions",
  "Document Visibility",
  "Tracking Controls",
  "Budget & Cost",
  "Settings & Preferences"
];

export function RoleHomeMobileScreen() {
  const currentUser = useOpsStore((state) => getCurrentUser(state));
  if (currentUser.role === "admin") return <AdminDashboardMobileScreen />;
  if (currentUser.role === "supervisor") return <SupervisorDashboardMobileScreen />;
  if (currentUser.role === "client") return <ClientDashboardMobileScreen />;
  if (currentUser.role === "finance") return <FinanceDashboardMobileScreen />;
  return <EngineerDashboardMobileScreen />;
}

export function AdminDashboardMobileScreen() {
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const workerRecords = getWorkerRecords(ops);
  const approvalQueue = getApprovalQueue(ops);
  const activeProjects = ops.managedProjects.filter((project) => project.status !== "Completed");
  const workersOnSite = workerRecords.filter((worker) => worker.status === "On Site").length;
  const liveWorkers = workerRecords.filter(
    (worker) => worker.status === "Active" || worker.status === "On Site"
  ).length;
  const unreadNotifications = ops.notifications.filter(
    (item) =>
      !item.read &&
      (item.targetRole === currentUser.role || item.targetRole === "all")
  ).length;
  const engineerAdminLink =
    workerRecords.find((worker) => worker.badge === "Engineer")?.id ?? "eng-arjun";
  const supervisorAdminLink =
    workerRecords.find((worker) => worker.badge === "Supervisor")?.id ?? "eng-rajeev";

  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin"
      title="Admin Dashboard"
      subtitle="Welcome back, Admin"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<Folder className="h-6 w-6" />} label="Total Projects" value={String(ops.managedProjects.length)} meta={`${activeProjects.length} active`} />
          <MobileMetricCard icon={<Users className="h-6 w-6" />} label="Total Workers" value={String(workerRecords.length)} meta={`${liveWorkers} live`} accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<LocateFixed className="h-6 w-6" />} label="Live on Site" value={String(workersOnSite)} meta="Workers" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<ShieldCheck className="h-6 w-6" />} label="Pending Approvals" value={String(approvalQueue.length)} meta="Requests" accent="text-[#ff4f63]" />
        </div>

        <MobileCard className="p-4">
          <MobileSectionTitle title="Live Locations" action={<Link href="/app/admin/map" className="text-sm font-semibold text-[#5c2dff]">View All</Link>} />
          <div className="overflow-hidden rounded-[24px] border border-[#e6e9fb]">
            <MobileMapPreview height={260} variant="portfolio" />
          </div>
          <div className="mt-4 grid gap-3 rounded-[24px] bg-[#f6f8ff] p-4">
            {ops.managedProjects.slice(0, 4).map((project, index) => (
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
          <div className="grid grid-cols-5 gap-2">
            <MobileActionTile href="/app/admin/projects" icon={<Folder className="h-7 w-7" />} title="All Projects" />
            <MobileActionTile href="/app/admin/projects/new" icon={<Upload className="h-7 w-7" />} title="Update Projects" />
            <MobileActionTile href="/app/admin/staff" icon={<Users className="h-7 w-7" />} title="All Workers" />
            <MobileActionTile href="/app/admin/map" icon={<MapPinned className="h-7 w-7" />} title="Live Locations" />
            <MobileActionTile href={`/app/admin/staff/${engineerAdminLink}`} icon={<UserRound className="h-7 w-7" />} title="Engineer Admin" />
            <MobileActionTile href={`/app/admin/staff/${supervisorAdminLink}`} icon={<UserRound className="h-7 w-7" />} title="Supervisor Admin" />
            <MobileActionTile href="/app/admin/finance" icon={<IndianRupee className="h-7 w-7" />} title="Finance Admin" />
            <MobileActionTile href="/app/client" icon={<BriefcaseBusiness className="h-7 w-7" />} title="Client Admin" />
            <MobileActionTile href="/app/chat" icon={<MessageCircle className="h-7 w-7" />} title="Live Chats" badge={<span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#ff4f63] px-1 text-xs font-semibold text-white">{ops.chatMessages.length}</span>} />
            <MobileActionTile href="/app/admin/alerts" icon={<Bell className="h-7 w-7" />} title="Notifications" badge={<span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#ff4f63] px-1 text-xs font-semibold text-white">{unreadNotifications}</span>} />
            <MobileActionTile href="/app/admin/approvals" icon={<CheckCircle2 className="h-7 w-7" />} title="Approvals" badge={<span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#ff4f63] px-1 text-xs font-semibold text-white">{approvalQueue.length}</span>} />
          </div>
        </MobileCard>

        <div className="grid gap-4">
          <MobileCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Project Status</h3>
              <Link href="/app/admin/projects" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
            </div>
            <div className="space-y-4">
              {ops.managedProjects.slice(0, 4).map((project) => (
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
  const ops = useOpsStore((state) => state);
  const visibleProjects = ops.managedProjects.filter((project) =>
    project.status !== "Completed"
  );
  const totalSpent = visibleProjects.reduce((sum, project) => sum + project.spent, 0);
  const totalBudget = visibleProjects.reduce((sum, project) => sum + project.budget, 0);
  const pendingRequests = ops.financeRequests.filter((request) => request.status === "pending");
  const approvedToday = ops.financeRequests.filter(
    (request) => request.status === "approved" || request.status === "paid"
  );

  return (
    <MobileShell role="finance" activeHref="/app/admin/finance" title="Finance Overview" subtitle="Track spend, approvals and project funds">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<IndianRupee className="h-6 w-6" />} label="Total Spent" value={formatInr(totalSpent)} meta={`${visibleProjects.length} live projects`} />
          <MobileMetricCard icon={<ShieldCheck className="h-6 w-6" />} label="Budget Utilization" value={`${Math.round((totalSpent / Math.max(totalBudget, 1)) * 100)}%`} meta="Across managed projects" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<ReceiptText className="h-6 w-6" />} label="Pending Approvals" value={formatInr(pendingRequests.reduce((sum, request) => sum + request.amount, 0))} meta="Requires action" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<FileCheck2 className="h-6 w-6" />} label="Approved Today" value={String(approvedToday.length)} meta="Transactions" accent="text-[#337dff]" />
        </div>

        <MobileCard>
          <MobileSectionTitle title="Finance Actions" />
          <div className="grid grid-cols-4 gap-2">
            <MobileActionTile href="/app/admin/approvals" icon={<CheckCircle2 className="h-6 w-6" />} title="Payment Requests" subtitle="Review" />
            <MobileActionTile href="/app/chat" icon={<MessageCircle className="h-6 w-6" />} title="Live Chat" subtitle="Teams" />
            <MobileActionTile href="/app/admin/projects" icon={<Folder className="h-6 w-6" />} title="Expense Reports" subtitle="Projects" />
            <MobileActionTile href="/app/admin/alerts" icon={<Bell className="h-6 w-6" />} title="Alerts" subtitle="Updates" />
          </div>
        </MobileCard>

        <MobileCard>
          <MobileSectionTitle title="Recent Transactions" />
          <div className="space-y-4">
            {ops.financeRequests.slice(0, 3).map((request) => (
              <div key={request.id} className="rounded-[22px] border border-[#e8ebff] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#18214d]">{request.title}</p>
                    <p className="mt-1 text-sm text-[#7f87b0]">{projectById(ops, request.projectId)?.name}</p>
                    <p className="mt-3 text-lg font-semibold text-[#121b44]">{formatInr(request.amount)}</p>
                  </div>
                  <MobilePill tone={request.status === "approved" || request.status === "paid" ? "green" : "orange"}>
                    {request.status === "approved" ? "Approved" : request.status === "paid" ? "Paid" : "Pending"}
                  </MobilePill>
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function SupervisorDashboardMobileScreen() {
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const supervisor = getWorkerRecords(ops).find((worker) => worker.id === currentUser.id) ?? getWorkerRecords(ops)[0];
  const teamMembers = getWorkerRecords(ops)
    .filter(
      (worker) =>
        worker.badge === "Engineer" &&
        userById(ops, worker.id)?.projectIds.some((projectId) =>
          currentUser.projectIds.includes(projectId)
        )
    )
    .slice(0, 4);
  const supervisorTasks = getTaskRecords(ops, currentUser.id);
  const teamAttendance = ops.attendance.filter((record) =>
    teamMembers.some((worker) => worker.id === record.userId)
  );

  return (
    <MobileShell
      role="supervisor"
      activeHref="/app/supervisor"
      title={`Hello, ${supervisor.name}`}
      subtitle={currentUser.designation}
    >
      <div className="space-y-4">
        <MobileGradientCard>
          <div className="grid grid-cols-4 gap-1.5 divide-x divide-white/20">
            <BigGradientStat label="Assigned Project" value={String(currentUser.projectIds.length)} />
            <BigGradientStat label="Team Active" value={String(teamMembers.length)} />
            <BigGradientStat label="Attendance" value={`${teamAttendance.length}/${Math.max(teamMembers.length, 1)}`} />
            <BigGradientStat label="Site Reports" value={String(ops.projectReports.filter((report) => currentUser.projectIds.includes(report.projectId)).length)} />
          </div>
        </MobileGradientCard>

        <MobileCard>
          <MobileSectionTitle title="Supervisor Actions" />
          <div className="grid grid-cols-5 gap-2">
            <MobileActionTile href="/app/admin/projects" icon={<Folder className="h-6 w-6" />} title="Current Project" subtitle="Status" />
            <MobileActionTile href="/app/engineer/attendance" icon={<CalendarDays className="h-6 w-6" />} title="Attendance" subtitle="Mark" />
            <MobileActionTile href="/app/engineer/reports" icon={<CalendarRange className="h-6 w-6" />} title="Calendar" subtitle="Month" />
            <MobileActionTile href="/app/chat" icon={<MessageCircle className="h-6 w-6" />} title="Live Chat" subtitle="Open" />
            <MobileActionTile href="/app/admin/staff" icon={<Users className="h-6 w-6" />} title="Team Attendance" subtitle="View" />
            <MobileActionTile href="/app/admin/map" icon={<LocateFixed className="h-6 w-6" />} title="Work Monitor" subtitle="Live" />
            <MobileActionTile href="/app/admin/projects/new" icon={<FileText className="h-6 w-6" />} title="Site Reports" subtitle="Upload" />
            <MobileActionTile href="/app/admin/map/full" icon={<MapPinned className="h-6 w-6" />} title="Live Tracking" subtitle="Map" />
            <MobileActionTile href="/app/admin/staff/eng-arjun" icon={<UserRound className="h-6 w-6" />} title="Engineer Detail" subtitle="Open" />
            <MobileActionTile href="/app/admin/alerts" icon={<Bell className="h-6 w-6" />} title="Alerts" subtitle="Review" />
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[1rem] font-semibold text-[#121b44]">Team Snapshot</h3>
            <Link href="/app/admin/staff" className="text-sm font-semibold text-[#5c2dff]">View Team</Link>
          </div>
          <div className="space-y-3">
            {teamMembers.map((worker) => (
              <Link
                key={worker.id}
                href={`/app/admin/staff/${worker.id}`}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[16px] border border-[#e8ebff] p-3"
              >
                <MobileAvatar label={worker.name} size={44} />
                <div className="min-w-0">
                  <p className="text-[0.92rem] font-semibold text-[#17204c]">{worker.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#7d85b0]">{worker.project}</p>
                </div>
                <MobilePill tone={worker.status === "Active" ? "green" : worker.status === "Offline" ? "slate" : "orange"}>
                  {worker.status}
                </MobilePill>
              </Link>
            ))}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function LiveLocationsMobileScreen({ fullMap = false }: { fullMap?: boolean }) {
  const ops = useOpsStore((state) => state);
  const workerRecords = getWorkerRecords(ops);
  const activeWorkers = workerRecords.filter((worker) => worker.status === "Active" || worker.status === "On Site");
  const onSiteWorkers = workerRecords.filter((worker) => worker.status === "On Site");
  const offlineWorkers = workerRecords.filter((worker) => worker.status === "Offline" || worker.status === "Inactive");
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
          <MobileMetricCard icon={<Users className="h-6 w-6" />} label="Total Workers" value={String(workerRecords.length)} meta="All" />
          <MobileMetricCard icon={<LocateFixed className="h-6 w-6" />} label="On Site" value={String(onSiteWorkers.length)} meta="Online" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<Gauge className="h-6 w-6" />} label="En Route" value={String(activeWorkers.length)} meta="Traveling" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<WifiOff className="h-6 w-6" />} label="Offline" value={String(offlineWorkers.length)} meta="Offline" accent="text-[#7d85b1]" />
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const visibleProjects =
    role === "admin"
      ? ops.managedProjects
      : getProjectsForUser(ops, currentUser);
  const activeProjects = visibleProjects.filter((project) => project.status === "Active");
  const completedProjects = visibleProjects.filter((project) => project.status === "Completed");
  const pendingProjects = visibleProjects.filter((project) => project.status === "Delayed");
  const [tab, setTab] = useState(`All Projects (${visibleProjects.length})`);
  const tabbedProjects =
    tab.startsWith("Active")
      ? activeProjects
      : tab.startsWith("Completed")
        ? completedProjects
        : tab.startsWith("Pending")
          ? pendingProjects
          : visibleProjects;

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
          <MobileMetricCard icon={<Folder className="h-6 w-6" />} label="Total Projects" value={String(visibleProjects.length)} meta="Managed in one system" />
          <MobileMetricCard icon={<ShieldCheck className="h-6 w-6" />} label="Completed" value={String(completedProjects.length)} meta={`${Math.round((completedProjects.length / Math.max(visibleProjects.length, 1)) * 100)}%`} accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<TrendingUp className="h-6 w-6" />} label="Active" value={String(activeProjects.length)} meta={`${Math.round((activeProjects.length / Math.max(visibleProjects.length, 1)) * 100)}%`} accent="text-[#337dff]" />
          <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value={String(pendingProjects.length)} meta={`${Math.round((pendingProjects.length / Math.max(visibleProjects.length, 1)) * 100)}%`} accent="text-[#ff8a00]" />
        </div>

        <MobileCard>
          <MobileTabBar
            items={[
              `All Projects (${visibleProjects.length})`,
              `Active (${activeProjects.length})`,
              `Completed (${completedProjects.length})`,
              `Pending (${pendingProjects.length})`
            ]}
            active={tab}
            onChange={setTab}
          />
          <div className="mt-5 space-y-4">
            {tabbedProjects.map((project) => (
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
  const ops = useOpsStore((state) => state);
  const approvalQueue = getApprovalQueue(ops);
  const leaveApprovals = approvalQueue.filter((item) => item.kind === "leave");
  const userApprovals = approvalQueue.filter((item) => item.kind === "access");
  const attendanceApprovals = approvalQueue.filter((item) => item.kind === "attendance");
  const otherApprovals = approvalQueue.filter(
    (item) => !["leave", "access", "attendance"].includes(item.kind)
  );
  const [decisions, setDecisions] = useState<Record<string, "Approved" | "Rejected" | undefined>>({});
  const [tab, setTab] = useState(`All (${approvalQueue.length})`);

  function handleDecision(item: EnterpriseApprovalItem, decision: "Approved" | "Rejected") {
    if (item.kind === "access") {
      if (decision === "Approved") {
        ops.approveAccessRequest(item.entityId, item.projectId ?? ops.managedProjects[0]!.id);
      } else {
        ops.rejectAccessRequest(item.entityId);
      }
    }
    if (item.kind === "leave") {
      ops.decideLeaveRequest(item.entityId, decision === "Approved" ? "approved" : "rejected");
    }
    if (item.kind === "attendance") {
      ops.reviewAttendance(item.entityId, decision === "Approved" ? "approved" : "queued");
    }
    if (item.kind === "finance") {
      ops.decideFinanceRequest(item.entityId, decision === "Approved" ? "approved" : "rejected");
    }
    if (item.kind === "report") {
      ops.reviewProjectReport(item.entityId, decision === "Approved" ? "approved" : "rejected");
    }
    if (item.kind === "document") {
      ops.reviewProjectDocument(item.entityId, decision === "Approved" ? "approved" : "rejected");
    }
    setDecisions((state) => ({ ...state, [item.id]: decision }));
  }

  const visibleApprovals =
    tab.startsWith("Leave")
      ? leaveApprovals
      : tab.startsWith("New Users")
        ? userApprovals
        : tab.startsWith("Attendance")
          ? attendanceApprovals
          : tab.startsWith("Other")
            ? otherApprovals
            : approvalQueue;

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
          <MobileMetricCard icon={<FileClock className="h-6 w-6" />} label="Total Pending" value={String(approvalQueue.length)} meta="Requests" />
          <MobileMetricCard icon={<CalendarDays className="h-6 w-6" />} label="Leave Requests" value={String(leaveApprovals.length)} meta="Pending" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<UserPlus className="h-6 w-6" />} label="New Users" value={String(userApprovals.length)} meta="Pending" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<ShieldCheck className="h-6 w-6" />} label="Other Requests" value={String(otherApprovals.length)} meta="Pending" accent="text-[#337dff]" />
        </div>

        <MobileCard>
          <MobileTabBar
            items={[
              `All (${approvalQueue.length})`,
              `Leave (${leaveApprovals.length})`,
              `New Users (${userApprovals.length})`,
              `Attendance (${attendanceApprovals.length})`,
              `Other (${otherApprovals.length})`
            ]}
            active={tab}
            onChange={setTab}
          />
          <div className="mt-5 space-y-4">
            {visibleApprovals.map((item) => {
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
                      onClick={() => handleDecision(item, "Approved")}
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
                      onClick={() => handleDecision(item, "Rejected")}
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
  const ops = useOpsStore((state) => state);
  const workerRecords = getWorkerRecords(ops);
  const engineers = workerRecords.filter((worker) => worker.badge === "Engineer");
  const supervisors = workerRecords.filter((worker) => worker.badge === "Supervisor");
  const finance = workerRecords.filter((worker) => worker.badge === "Finance");
  const clients = workerRecords.filter((worker) => worker.badge === "Client");
  const activeWorkers = workerRecords.filter((worker) => worker.status === "Active" || worker.status === "On Site");
  const offlineWorkers = workerRecords.filter((worker) => worker.status === "Offline");
  const inactiveWorkers = workerRecords.filter((worker) => worker.status === "Inactive");
  const [tab, setTab] = useState(`All Workers (${workerRecords.length})`);
  const visibleWorkers =
    tab.startsWith("Engineers")
      ? engineers
      : tab.startsWith("Supervisors")
        ? supervisors
        : tab.startsWith("Finance")
          ? finance
          : tab.startsWith("Clients")
            ? clients
            : workerRecords;
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
          <MobileMetricCard icon={<Users className="h-6 w-6" />} label="Total Workers" value={String(workerRecords.length)} meta="All Members" />
          <MobileMetricCard icon={<UserPlus className="h-6 w-6" />} label="Active" value={String(activeWorkers.length)} meta={`${Math.round((activeWorkers.length / Math.max(workerRecords.length, 1)) * 100)}%`} accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<Signal className="h-6 w-6" />} label="Offline" value={String(offlineWorkers.length)} meta={`${Math.round((offlineWorkers.length / Math.max(workerRecords.length, 1)) * 100)}%`} accent="text-[#337dff]" />
          <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Inactive" value={String(inactiveWorkers.length)} meta={`${Math.round((inactiveWorkers.length / Math.max(workerRecords.length, 1)) * 100)}%`} accent="text-[#ff4f63]" />
        </div>
        <MobileCard>
          <MobileTabBar
            items={[
              `All Workers (${workerRecords.length})`,
              `Engineers (${engineers.length})`,
              `Supervisors (${supervisors.length})`,
              `Finance (${finance.length})`,
              `Clients (${clients.length})`
            ]}
            active={tab}
            onChange={setTab}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <MobileSearchBar placeholder="Search by name, email, or phone..." />
            <MobileFilterButton label="Sort By" icon={<ArrowRight className="h-5 w-5 rotate-90" />} />
          </div>
          <div className="mt-5 space-y-4">
            {visibleWorkers.map((worker) => (
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
  const ops = useOpsStore((state) => state);
  const workerRecords = getWorkerRecords(ops);
  const worker = workerRecords.find((item) => item.id === workerId) ?? workerRecords[0];
  const workerUser = userById(ops, worker?.id);
  const workerTasks = getTaskRecords(ops, worker.id);
  const workerProject = workerUser ? getPrimaryProjectForUser(ops, workerUser) : ops.managedProjects[0];
  const workerAttendance = ops.attendance.filter((item) => item.userId === worker.id);
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
                <MobilePill tone={statusTone(worker.status)}>{worker.status}</MobilePill>
              </div>
              <p className="mt-3 text-base text-[#6974a4]">Employee ID: {workerUser?.employeeCode ?? "ENG-0000"}</p>
            </div>
          </div>
        </MobileCard>

        <div className="grid grid-cols-2 gap-3">
          <MobileMetricCard icon={<CalendarDays className="h-6 w-6" />} label="Check-in" value={(workerAttendance[0]?.checkInAt.split("T")[1]?.slice(0, 5).replace(/^(\d{2}):(\d{2}).*/, "$1:$2") ?? "09:15")} meta="Today" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Tasks" value={String(workerTasks.length)} meta="Assigned" accent="text-[#5c2dff]" />
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
                ["Project", workerProject?.name ?? worker.project],
                ["Location", worker.location],
                ["Last Updated", workerAttendance[0]?.checkInAt ?? "No live update"],
                ["Accuracy", workerAttendance[0] ? `${workerAttendance[0].accuracyM} meters` : "Unavailable"]
              ]}
            />
            <MobileSecondaryButton href="/app/admin/map/full">View Full Tracking</MobileSecondaryButton>
          </div>
        </MobileCard>

        <MobileCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.35rem] font-semibold text-[#121b44]">Today's Tasks</h3>
              <Link href={`/app/admin/staff/${worker.id}/assign-task`} className="text-sm font-semibold text-[#5c2dff]">{workerTasks.length} Tasks</Link>
            </div>
            <div className="space-y-4">
              {workerTasks.map((task) => (
                <div key={task.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                  <MobilePill tone={task.priority === "High" ? "red" : task.priority === "Medium" ? "orange" : "green"} className="self-start px-2 py-1 text-xs">
                    {task.priority}
                  </MobilePill>
                  <div>
                    <p className="font-semibold text-[#17204c]">{task.title}</p>
                    <p className="mt-1 text-sm text-[#7d85b0]">{task.detail}</p>
                    <p className="mt-2 text-sm text-[#7d85b0]">{workerProject?.name ?? worker.project}</p>
                  </div>
                  <div className="text-right text-sm text-[#7c84b0]">
                    <p>{task.time}</p>
                    <MobilePill tone={task.status === "Pending" ? "slate" : task.status === "In Progress" ? "orange" : task.status === "Completed" ? "green" : task.status === "Blocked" ? "red" : "blue"} className="mt-2 px-2.5 py-1 text-xs">
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
            <button
              type="button"
              onClick={() => ops.removeUserAccess(worker.id)}
              className="mt-4 inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] border border-[#ffbfc6] bg-white px-5 text-[1.05rem] font-semibold text-[#ff4f63]"
            >
              Remove Access
            </button>
          </MobileCard>
        </div>
      </div>
    </MobileShell>
  );
}

export function WorkerAssignTaskMobileScreen({ workerId }: { workerId?: string }) {
  const ops = useOpsStore((state) => state);
  const worker = getWorkerRecords(ops).find((item) => item.id === workerId) ?? getWorkerRecords(ops)[0];
  const workerUser = userById(ops, worker.id);
  const workerProject = workerUser ? getPrimaryProjectForUser(ops, workerUser) : ops.managedProjects[0];
  const [saved, setSaved] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [taskType, setTaskType] = useState("Inspection");
  const [dueDate, setDueDate] = useState("20 May 2026, 06:00 PM");
  const [notes, setNotes] = useState("");
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
          ops.assignTask({
            title: taskTitle || "New assigned task",
            detail: taskDescription || "Task detail to be confirmed.",
            projectId: workerProject?.id ?? ops.managedProjects[0]!.id,
            assigneeUserId: worker.id,
            priority: priority.toLowerCase() as ManagedTask["priority"],
            status: "pending",
            dueAt: dueDate,
            taskType,
            notes,
            location: workerProject?.location
          });
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
            <MobileInput label="Task Title" placeholder="Enter task title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} />
            <MobileTextArea label="Task Description" placeholder="Enter task description..." rows={5} value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <MobileSelect label="Project" defaultValue={workerProject?.name ?? "Select Project"} />
              <MobileSelect
                label="Priority"
                defaultValue={priority}
                onClick={() =>
                  setPriority((value) =>
                    value === "High" ? "Medium" : value === "Medium" ? "Low" : "High"
                  )
                }
              />
              <MobileSelect
                label="Task Type"
                defaultValue={taskType}
                onClick={() =>
                  setTaskType((value) =>
                    value === "Inspection"
                      ? "Reporting"
                      : value === "Reporting"
                        ? "Permission"
                        : value === "Permission"
                          ? "Quality Check"
                          : "Inspection"
                  )
                }
              />
              <MobileInput label="Due Date" placeholder="Select due date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
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
          <MobileTextArea label="Notes for Engineer (Optional)" placeholder="Add any special instructions or notes..." rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
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
              <MobilePill tone={statusTone(worker.status)}>{worker.status}</MobilePill>
              <p className="mt-2 text-base text-[#7d85b0]">{workerUser?.employeeCode ?? "ENG-0000"}</p>
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const visibleProjects = getProjectsForUser(ops, currentUser);
  const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
  const visibleDocuments = getDocumentRecords(ops, currentUser);
  const visibleReports = getVisibleReports(ops, currentUser);
  const visiblePermissions = ops.clientPermissions.filter(
    (permission) => permission.clientUserId === currentUser.id && permission.status === "approved"
  );
  const assignedWorkers = ops.users.filter(
    (user) =>
      user.role !== "admin" &&
      user.role !== "client" &&
      user.projectIds.some((projectId) => visibleProjectIds.has(projectId))
  );
  const activeProjects = visibleProjects.filter((project) => project.status !== "Completed");
  const completedProjects = visibleProjects.filter((project) => project.status === "Completed");
  const totalDistanceKm = visibleProjects.reduce((sum, project) => sum + project.totalLengthKm, 0);
  const completedKm = visibleProjects.reduce((sum, project) => sum + project.completedKm, 0);
  const remainingKm = visibleProjects.reduce(
    (sum, project) => sum + Math.max(project.totalLengthKm - project.completedKm, 0),
    0
  );
  const notStartedKm = visibleProjects.reduce(
    (sum, project) => sum + (project.progress === 0 ? project.totalLengthKm : 0),
    0
  );
  const overallProgress = totalDistanceKm
    ? Math.round((completedKm / totalDistanceKm) * 100)
    : 0;
  const unreadNotifications = ops.notifications.filter(
    (item) => !item.read && (item.targetRole === currentUser.role || item.targetRole === "all")
  ).length;
  const canViewDocuments = visiblePermissions.some((permission) => permission.canViewDocuments);
  const canViewReports = visiblePermissions.some((permission) => permission.canViewReports);
  const canViewTracking = visiblePermissions.some((permission) => permission.canViewTracking);
  const canChat = visiblePermissions.some((permission) => permission.canChat);

  return (
    <MobileShell
      role="client"
      activeHref="/app/client"
      title="Client Admin Portal"
      leftMode="back"
      backHref="/app"
      titlePrefix={
        <div className="flex items-center border-r border-[#dfe3ef] pr-2">
          <Image src="/assets/telgo-logo-cropped.png" alt="TELGO" width={40} height={22} className="h-6 w-10 object-contain" />
        </div>
      }
      rightSlot={
        <div className="flex items-center gap-2">
          <button type="button" className="relative grid h-11 w-11 place-items-center rounded-[12px] border border-[#e4e7fb] bg-white text-[#18214d]">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3b3b] px-1 text-[10px] font-semibold text-white">
              {unreadNotifications}
            </span>
          </button>
          <MobileAvatar label={currentUser.company} size={44} />
        </div>
      }
    >
      <div className="space-y-4">
        <MobileCard className="p-[14px]">
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#f3efff] text-[1.35rem] font-bold text-[#6a35ff]">RI</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[1.05rem] font-bold leading-tight text-[#121b44]">{currentUser.company}</h2>
                <MobilePill tone="green">Active</MobilePill>
              </div>
              <p className="mt-1.5 text-[12px] leading-4 text-[#6d77a6]">
                {currentUser.email}  |  {currentUser.phone}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <MobileSecondaryButton href="/app/client/settings" className="min-h-[42px] w-full px-4 text-[0.86rem]">
              <Settings className="mr-2 h-4 w-4" />
              Client Settings
            </MobileSecondaryButton>
          </div>
        </MobileCard>

        <MobileGradientCard className="p-[14px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/15">
                <BriefcaseBusiness className="h-[18px] w-[18px]" />
              </div>
              <p className="text-[0.98rem] font-bold">Overview</p>
            </div>
            <MobilePill tone="violet" className="bg-white/14 text-white">This Month</MobilePill>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5 divide-x divide-white/20">
            <BigGradientStat label="Total Projects" value={String(visibleProjects.length)} />
            <BigGradientStat label="Active Projects" value={String(activeProjects.length)} />
            <BigGradientStat label="Completed" value={String(completedProjects.length)} />
            <BigGradientStat label="Total Distance" value={`${totalDistanceKm.toFixed(2)} KM`} />
          </div>
        </MobileGradientCard>

        <MobileCard className="p-[14px]">
          <h3 className="text-[1.02rem] font-bold text-[#121b44]">Overall Work Progress</h3>
          <div className="mt-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <MobileProgressBar value={overallProgress} />
            </div>
            <p className="text-[0.98rem] font-bold text-[#121b44]">{overallProgress}%</p>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-[0.66rem] text-[#5e6897]">
            <LegendItem label="Completed" value={`${completedKm.toFixed(2)} KM`} tone="green" />
            <LegendItem label="Visible Reports" value={String(visibleReports.length)} tone="violet" />
            <LegendItem label="Remaining" value={`${remainingKm.toFixed(2)} KM`} tone="slate" />
            <LegendItem label="Not Started" value={`${notStartedKm.toFixed(2)} KM`} tone="slate" />
          </div>
        </MobileCard>

        <div>
          <MobileSectionTitle title="Quick Actions" />
          <div className="grid grid-cols-5 gap-2">
            <MobileActionTile href="/app/client/profile" icon={<UserRound className="h-6 w-6" />} title="Edit Profile" subtitle={currentUser.fullName} />
            <MobileActionTile href="/app/client/projects" icon={<Folder className="h-6 w-6" />} title="Project Details" subtitle={`${visibleProjects.length} visible`} />
            <MobileActionTile href="/app/client/engineers" icon={<Users className="h-6 w-6" />} title="Engineers On-Site" subtitle={`${assignedWorkers.length} assigned`} />
            <MobileActionTile href="/app/client/progress" icon={<TrendingUp className="h-6 w-6" />} title="Work Progress" subtitle={`${overallProgress}% overall`} />
            {canChat ? <MobileActionTile href="/app/chat" icon={<MessageCircle className="h-6 w-6" />} title="Live Chat" subtitle="Admin linked" /> : null}
            {canViewDocuments ? <MobileActionTile href="/app/client/documents" icon={<FileText className="h-6 w-6" />} title="Documents" subtitle={`${visibleDocuments.length} visible`} /> : null}
            {canViewTracking ? <MobileActionTile href="/app/client/progress/update" icon={<MapPinned className="h-6 w-6" />} title="Live Tracking" subtitle="Permission based" /> : null}
            {canViewReports ? <MobileActionTile href="/app/client/reports" icon={<FileSpreadsheet className="h-6 w-6" />} title="Reports" subtitle={`${visibleReports.length} visible`} /> : null}
            <MobileActionTile href="/app/client/settings" icon={<ShieldCheck className="h-6 w-6" />} title="Permissions" subtitle={`${visiblePermissions.length} rules`} />
            <MobileActionTile href="/app/client/profile" icon={<Phone className="h-6 w-6" />} title="Contacts" subtitle="Client desk" />
          </div>
        </div>

        <MobileCard className="p-[14px]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.02rem] font-bold text-[#121b44]">Active Projects</h3>
            <Link href="/app/client/projects" className="text-sm font-bold text-[#5c2dff]">View All</Link>
          </div>
          <div className="space-y-3">
            {visibleProjects.slice(0, 3).map((project) => (
              <Link key={project.id} href="/app/client/projects" className="grid grid-cols-[74px_1fr_auto] gap-3 rounded-[12px] border border-[#e7ebff] p-2.5">
                <div className="relative h-[74px] overflow-hidden rounded-[10px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.92rem] font-bold leading-tight text-[#121b44]">{project.name}</p>
                  <p className="mt-1 text-[11px] text-[#7680af]">{project.location}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <MobileProgressBar value={project.progress} />
                    </div>
                    <span className="text-[11px] font-bold text-[#121b44]">{project.progress}%</span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                    <InfoCell label="Total Distance" value={`${project.totalLengthKm} KM`} />
                    <InfoCell label="Work Completed" value={`${project.completedKm} KM`} />
                  </div>
                </div>
                <ChevronRight className="mt-5 h-[18px] w-[18px] text-[#6f76a7]" />
              </Link>
            ))}
            {visibleProjects.length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-[#e2e7fb] px-4 py-5 text-sm text-[#7680af]">
                No client-visible projects are assigned yet. Admin permission controls need to publish a project here first.
              </p>
            ) : null}
          </div>
        </MobileCard>
      </div>
    </MobileShell>
  );
}

export function ClientProjectsMobileScreen() {
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const visibleProjects = getProjectsForUser(ops, currentUser);
  const activeProjects = visibleProjects.filter((project) => project.status === "Active");
  const completedProjects = visibleProjects.filter((project) => project.status === "Completed");
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/projects"
      title="Project Details"
      leftMode="back"
      backHref="/app/client"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <MobileSearchBar placeholder="Search projects..." />
          <Link href="/app/client/projects/new" className="inline-flex min-h-[52px] items-center justify-center rounded-[10px] border border-[#cabdff] bg-white px-3 text-sm font-bold text-[#5c2dff] shadow-[0_8px_18px_rgba(44,54,96,0.04)]">
            <Plus className="mr-1 h-4 w-4" />
            Add New
          </Link>
        </div>
        <MobileCard className="p-3">
          <MobileTabBar
            items={[
              `All (${visibleProjects.length})`,
              `Active (${activeProjects.length})`,
              `Completed (${completedProjects.length})`
            ]}
            active={`All (${visibleProjects.length})`}
            onChange={() => undefined}
          />
          <div className="mt-4 space-y-3">
            {visibleProjects.map((project) => (
              <Link key={project.id} href="/app/client/settings" className="grid grid-cols-[74px_1fr_auto] gap-3 rounded-[10px] border border-[#e7ebff] p-3">
                <div className="relative h-[74px] overflow-hidden rounded-[9px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.9rem] font-bold leading-snug text-[#121b44]">{project.name}</p>
                  <p className="mt-1 text-xs text-[#7880ac]">{project.location}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <MobileProgressBar value={project.progress} />
                    </div>
                    <span className="text-xs font-bold text-[#121b44]">{project.progress}%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-[#737da9]">
                    <span>{formatInr(project.budget)}</span>
                    <span>{project.totalLengthKm} KM</span>
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const project = getPrimaryProjectForUser(ops, currentUser);
  return (
    <MobileShell
      role="client"
      activeHref="/app/client/projects"
      title="Project Settings"
      subtitle={project?.name ?? "Project"}
      backHref="/app/client/projects"
      leftMode="back"
      bottomNav={false}
    >
      <div className="space-y-6">
        <MobileCard className="grid grid-cols-[88px_1fr_auto] gap-4 p-4">
          <div className="relative h-[88px] overflow-hidden rounded-[20px]">
            <Image src={project?.image ?? projects[0]!.image} alt={project?.name ?? "Project"} fill className="object-cover" />
          </div>
          <div>
            <p className="text-[1.22rem] font-semibold text-[#121b44]">{project?.name ?? "Project"}</p>
            <p className="mt-1 text-sm text-[#7780ad]">{project?.location ?? "Kerala"}</p>
            <MobilePill tone={project?.status === "Completed" ? "blue" : project?.status === "Delayed" ? "orange" : "green"} className="mt-3">
              {project?.status ?? "Active"}
            </MobilePill>
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
  const ops = useOpsStore((state) => state);
  const [saved, setSaved] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
          ops.addProject({
            code: `TLGO-PRJ-${String(Date.now()).slice(-6)}`,
            name: projectName || "New Managed Project",
            type: "Enterprise Operations Project",
            location: location || "Kerala",
            client: "Reliable Infra Pvt. Ltd.",
            image: projects[0]!.image,
            status: "Active",
            progress: 0,
            budget: 2500000,
            spent: 0,
            totalLengthKm: Number(distanceKm || "1"),
            completedKm: 0,
            startDate: startDate || "20 May 2026",
            endDate: endDate || "20 Jun 2026",
            manager: "Vishnu Prasad",
            siteInCharge: "Arjun Nair",
            coordinates: projects[0]!.coordinates,
            accent: "cyan"
          });
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="space-y-4">
            <MobileUploadBox title="Upload Image" detail="JPG, PNG up to 5MB" />
            <MobileInput label="Project Name" placeholder="Enter project name" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            <MobileInput label="Location" placeholder="Enter project location" value={location} onChange={(event) => setLocation(event.target.value)} />
            <MobileInput label="Total Distance (KM)" placeholder="Enter total distance" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} />
            <MobileInput label="Start Date" placeholder="Select start date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <MobileInput label="Expected End Date" placeholder="Select end date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const primaryProject = getPrimaryProjectForUser(ops, currentUser);
  const documentRecords = getDocumentRecords(ops, currentUser, primaryProject?.id);
  const approvedDocs = documentRecords.filter((document) => document.status === "Approved");
  const pendingDocs = documentRecords.filter((document) => document.status === "Pending");
  const rejectedDocs = documentRecords.filter((document) => document.status === "Rejected");
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
                <p className="text-[1.35rem] font-semibold text-[#121b44]">{primaryProject?.name ?? "Project"}</p>
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
          <MobileMetricCard icon={<FolderOpen className="h-6 w-6" />} label="Total Documents" value={String(documentRecords.length)} meta="Visible to client" />
          <MobileMetricCard icon={<CheckCircle2 className="h-6 w-6" />} label="Approved" value={String(approvedDocs.length)} meta="Documents" accent="text-[#18aa5d]" />
          <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value={String(pendingDocs.length)} meta="Documents" accent="text-[#ff8a00]" />
          <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Rejected" value={String(rejectedDocs.length)} meta="Documents" accent="text-[#ff4f63]" />
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const primaryProject = getPrimaryProjectForUser(ops, currentUser);
  const [saved, setSaved] = useState(false);
  const [documentType, setDocumentType] = useState("PDF");
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
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
          ops.addProjectDocument({
            name: documentName || "New client document",
            projectId: primaryProject?.id ?? ops.managedProjects[0]!.id,
            type: documentType as "PDF" | "DOC" | "XLS" | "JPG" | "ZIP",
            category: "client",
            authorUserId: currentUser.id,
            sizeLabel: "1.0 MB",
            description,
            visibilityRoles: ["admin", "client", "engineer", "supervisor"]
          });
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="space-y-4">
            <MobileSelect
              label="Document Type"
              defaultValue={documentType}
              onClick={() =>
                setDocumentType((value) =>
                  value === "PDF" ? "DOC" : value === "DOC" ? "XLS" : value === "XLS" ? "JPG" : "PDF"
                )
              }
            />
            <MobileInput label="Document Name" placeholder="Enter document name" value={documentName} onChange={(event) => setDocumentName(event.target.value)} />
            <MobileUploadBox title="Upload File" detail="Drag & drop file here or choose file" />
            <MobileTextArea label="Description (Optional)" placeholder="Enter description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const visibleProjectIds = getProjectsForUser(ops, currentUser).map((project) => project.id);
  const workerRecords = getWorkerRecords(ops).filter(
    (worker) =>
      worker.badge !== "Client" &&
      userById(ops, worker.id)?.projectIds.some((projectId) => visibleProjectIds.includes(projectId))
  );
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const project = getPrimaryProjectForUser(ops, currentUser);
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const project = getPrimaryProjectForUser(ops, currentUser);
  const [percent, setPercent] = useState(project?.progress ?? 0);
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
        <button
          type="button"
          onClick={() => {
            if (project) {
              ops.updateProject(project.id, {
                progress: percent,
                completedKm: Number(((project.totalLengthKm * percent) / 100).toFixed(1))
              });
            }
          }}
          className="inline-flex min-h-[58px] w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-5 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_rgba(92,45,255,0.26)]"
        >
          Save Location
        </button>
      </div>
    </MobileShell>
  );
}

export function ClientProfileMobileScreen() {
  const currentUser = useOpsStore((state) => getCurrentUser(state));
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
            <MobileInput label="Company Name" defaultValue={currentUser.company} />
            <MobileInput label="Email" defaultValue={currentUser.email} />
            <MobileInput label="Phone" defaultValue={currentUser.phone} />
            <MobileInput label="Address" defaultValue="123, Business Park, Kochi, Kerala, India" />
            <MobileInput label="Website" defaultValue="www.reliableinfra.com" />
            <MobileInput label="Contact Person" defaultValue={currentUser.managerName} />
            <MobileInput label="Designation" defaultValue={currentUser.designation} />
          </div>
        </MobileCard>
        <MobilePrimaryButton href="/app/client">Save Changes</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}

export function EngineerDashboardMobileScreen() {
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const myProjects = getProjectsForUser(ops, currentUser);
  const myTasks = getTaskRecords(ops, currentUser.id);
  const myAttendance = ops.attendance.filter((record) => record.userId === currentUser.id);
  const myApprovals = getApprovalQueue(ops).filter(
    (item) => item.projectId && currentUser.projectIds.includes(item.projectId)
  );
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer"
      title={`Hello, ${currentUser.fullName}`}
      subtitle={currentUser.designation}
      rightSlot={
        <div className="flex items-center gap-3">
          <div className="text-center">
            <MessageCircle className="mx-auto h-5 w-5 text-[#17204c]" />
            <p className="mt-1 text-xs font-semibold text-[#17204c]">Live Chat</p>
          </div>
          <button type="button" className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[#e4e7fb] bg-white text-[#18214d]">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3b3b] px-1 text-[10px] font-semibold text-white">{ops.chatMessages.length}</span>
          </button>
          <MobileAvatar label={currentUser.fullName} size={48} />
        </div>
      }
    >
      <div className="space-y-4">
        <MobileGradientCard className="p-[14px]">
          <div className="grid grid-cols-5 gap-1 divide-x divide-white/20">
            <BigGradientStat label="Assigned" value={String(myProjects.length).padStart(2, "0")} />
            <BigGradientStat label="Tasks" value={String(myTasks.length).padStart(2, "0")} />
            <BigGradientStat label="Attendance" value={`${myAttendance.length.toString().padStart(2, "0")}/${Math.max(myProjects.length * 5, 1)}`} />
            <BigGradientStat label="Visits" value={String(myProjects.filter((project) => project.progress > 0).length).padStart(2, "0")} />
            <BigGradientStat label="Approvals" value={String(myApprovals.length).padStart(2, "0")} />
          </div>
        </MobileGradientCard>

        <div className="grid grid-cols-5 gap-2">
          <MobileActionTile href="/app/engineer/projects" icon={<Folder className="h-6 w-6" />} title="Current Project" subtitle="Open" />
          <MobileActionTile href="/app/engineer/attendance" icon={<CalendarDays className="h-6 w-6" />} title="Attendance" subtitle="GPS mark" />
          <MobileActionTile href="/app/engineer/reports" icon={<CalendarRange className="h-6 w-6" />} title="Calendar" subtitle="Events" />
          <MobileActionTile href="/app/chat" icon={<MessageCircle className="h-6 w-6" />} title="Live Chat" subtitle="Team" />
          <MobileActionTile href="/app/admin/staff/eng-arjun/assign-task" icon={<ListTodo className="h-6 w-6" />} title="Assigned Tasks" subtitle="Update" />
          <MobileActionTile href="/app/engineer/shift-report" icon={<FileText className="h-6 w-6" />} title="Daily Report" subtitle="Submit" />
          <MobileActionTile href="/app/admin/map" icon={<Pin className="h-6 w-6" />} title="Site Visit" subtitle="Add/View" />
          <MobileActionTile href="/app/engineer/documents" icon={<Folder className="h-6 w-6" />} title="Documents" subtitle="Docs" />
          <MobileActionTile href="/app/engineer/finance-request" icon={<IndianRupee className="h-6 w-6" />} title="Material" subtitle="Request" />
          <MobileActionTile href="/app/engineer/leave" icon={<FilePlus2 className="h-6 w-6" />} title="Requests" subtitle="Raise" />
        </div>

        <MobileCard className="p-[14px]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[1.08rem] font-semibold text-[#121b44]">My Projects</h3>
            <Link href="/app/engineer/projects" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
          </div>
          <div className="space-y-3">
            {myProjects.slice(0, 3).map((project) => (
              <Link key={project.id} href="/app/engineer/projects" className="grid grid-cols-[78px_1fr_auto] gap-3 rounded-[18px] border border-[#e7ebff] p-3">
                <div className="relative h-[78px] overflow-hidden rounded-[14px]">
                  <Image src={project.image} alt={project.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.98rem] font-semibold text-[#121b44]">{project.name}</p>
                  <p className="mt-1 text-[11px] text-[#7d85b0]">{project.location}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <MobileProgressBar value={project.progress} />
                    </div>
                    <span className="text-[11px] font-semibold text-[#121b44]">{project.progress}%</span>
                  </div>
                </div>
                <MobilePill tone={project.status === "Active" ? "green" : project.status === "Delayed" ? "orange" : "blue"}>{project.status === "Delayed" ? "Planning" : project.status}</MobilePill>
              </Link>
            ))}
          </div>
        </MobileCard>

        <div className="grid gap-4">
          <CalendarCard />
          <MobileCard className="p-[14px]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[1.08rem] font-semibold text-[#121b44]">Today's Tasks</h3>
              <Link href="/app/admin/staff/eng-arjun/assign-task" className="text-sm font-semibold text-[#5c2dff]">View All</Link>
            </div>
            <div className="space-y-3">
              {myTasks.map((task) => (
                <div key={task.id} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[16px] border border-[#e8ebff] p-3">
                  <CircleDot className={cn("mt-1 h-4 w-4", task.status === "Completed" ? "text-[#18aa5d]" : task.status === "Blocked" ? "text-[#ff4f63]" : "text-[#c0c5e6]")} />
                  <div>
                    <p className="text-[13px] font-semibold text-[#17204c]">{task.title}</p>
                    <p className="mt-1 text-[11px] text-[#7d85b0]">{getPrimaryProjectForUser(ops, currentUser)?.name}</p>
                  </div>
                  <div className="text-right text-[11px]">
                    <p className="font-semibold text-[#5c2dff]">{task.time}</p>
                    <MobilePill tone={task.status === "Completed" ? "green" : task.status === "In Progress" ? "orange" : task.status === "Blocked" ? "red" : "slate"} className="mt-1.5">
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const worker = getWorkerRecords(ops).find((item) => item.id === currentUser.id) ?? getWorkerRecords(ops)[0];
  const workerProject = getPrimaryProjectForUser(ops, currentUser);
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
              <p className="mt-2 text-[1.08rem] text-[#6772a2]">{worker.role}  -  {worker.status}</p>
              <div className="mt-4 grid gap-3 text-base text-[#18214d]">
                <p><span className="font-semibold">Employee ID</span>  {currentUser.employeeCode}</p>
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
                ["Full Name", currentUser.fullName],
                ["Date of Birth", "15 Aug 1993"],
                ["Gender", "Male"],
                ["Address", "Puthenangadi House, Kottayam, Kerala - 686001"]
              ]}
            />
            <InfoGrid
              title="Job Information"
              items={[
                ["Designation", currentUser.designation],
                ["Department", currentUser.department],
                ["Reporting To", currentUser.managerName],
                ["Work Location", workerProject?.name ?? currentUser.site],
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const visibleReports = getVisibleReports(ops, currentUser);
  const visibleProjects = getProjectsForUser(ops, currentUser);
  const primaryProject = getPrimaryProjectForUser(ops, currentUser);
  const [reviewRequested, setReviewRequested] = useState(false);
  const approvedReports = visibleReports.filter((report) => report.status === "approved");
  const pendingReports = visibleReports.filter((report) => report.status === "pending");
  const rejectedReports = visibleReports.filter((report) => report.status === "rejected");
  const dailyReports = visibleReports.filter((report) => report.type === "daily");
  const weeklyReports = visibleReports.filter((report) => report.type === "weekly");
  const monthlyReports = visibleReports.filter((report) => report.type === "monthly");
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
          <MobileAvatar label={currentUser.fullName} size={46} />
          <div className="text-right">
            <p className="text-base font-bold text-[#17204c]">{currentUser.fullName}</p>
            <p className="text-xs text-[#7d85b0]">{currentUser.designation}</p>
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
            <MobileMetricCard icon={<FileText className="h-6 w-6" />} label="Total Reports" value={String(visibleReports.length)} meta="Client visible" />
            <MobileMetricCard icon={<CheckCircle2 className="h-6 w-6" />} label="Approved" value={String(approvedReports.length)} meta={`${visibleReports.length ? Math.round((approvedReports.length / visibleReports.length) * 100) : 0}%`} accent="text-[#18aa5d]" />
            <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value={String(pendingReports.length)} meta={`${visibleReports.length ? Math.round((pendingReports.length / visibleReports.length) * 100) : 0}%`} accent="text-[#ff8a00]" />
            <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Rejected" value={String(rejectedReports.length)} meta={`${visibleReports.length ? Math.round((rejectedReports.length / visibleReports.length) * 100) : 0}%`} accent="text-[#ff4f63]" />
          </div>
          <div className="mt-5 grid gap-4">
            <MobileSelect label="Date Range" defaultValue="Last visible submissions" />
            <MobileSelect label="Project" defaultValue={primaryProject?.name ?? "Assigned projects"} />
            <MobileSelect label="Report Type" defaultValue="All visible types" />
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
            {visibleReports.slice(0, 5).map((report) => {
              const project = projectById(ops, report.projectId);
              const author = userById(ops, report.userId);
              return (
              <div key={report.id} className="grid grid-cols-[62px_1fr_auto] gap-3 border-b border-[#edf0f7] pb-3 last:border-b-0 last:pb-0">
                <div className="relative h-[62px] overflow-hidden rounded-[10px]">
                  <Image src={project?.image ?? projects[0]!.image} alt={project?.name ?? report.title} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-bold text-[#17204c]">{report.title}</p>
                  <p className="mt-1 text-xs text-[#7d85b0]">{`${report.submittedAt}  -  ${reportTypeLabel(report.type)}`}</p>
                  <p className="mt-1 text-xs text-[#7d85b0]">{author?.fullName ?? "TELGO Team"}</p>
                </div>
                <div className="grid content-start justify-items-end gap-3">
                  <MobilePill tone={reportStatusTone(report.status)}>
                    {reportStatusLabel(report.status)}
                  </MobilePill>
                  <FileText className="h-5 w-5 text-[#5c2dff]" />
                </div>
              </div>
            );})}
            {visibleReports.length === 0 ? (
              <p className="rounded-[12px] border border-dashed border-[#e2e7fb] px-4 py-5 text-sm text-[#7680af]">
                No reports are visible for this client until admin permissions publish them.
              </p>
            ) : null}
          </div>
        </MobileCard>

        <MobileCard>
          <div className="grid grid-cols-2 gap-3">
            <MobileMetricCard icon={<FileText className="h-6 w-6" />} label="Daily Reports" value={String(dailyReports.length)} meta={`${visibleProjects.length} projects`} />
            <MobileMetricCard icon={<FileCheck2 className="h-6 w-6" />} label="Weekly Reports" value={String(weeklyReports.length)} meta="Admin reviewed" accent="text-[#18aa5d]" />
            <MobileMetricCard icon={<CalendarDays className="h-6 w-6" />} label="Monthly Reports" value={String(monthlyReports.length)} meta="Visible cadence" accent="text-[#ff8a00]" />
            <MobileMetricCard icon={<FileSpreadsheet className="h-6 w-6" />} label="Pending Review" value={String(pendingReports.length)} meta="Admin queue" accent="text-[#337dff]" />
          </div>
        </MobileCard>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              if (!primaryProject) return;
              ops.requestClientReview(primaryProject.id);
              setReviewRequested(true);
            }}
            className="inline-flex min-h-[46px] w-full items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-4 text-[0.94rem] font-bold text-white shadow-[0_12px_24px_rgba(92,45,255,0.2)]"
          >
            Request Admin Review
          </button>
          {reviewRequested ? (
            <p className="text-center text-sm font-semibold text-[#18aa5d]">
              Review request sent to admin control center.
            </p>
          ) : null}
        </div>
      </div>
    </MobileShell>
  );
}

export function EngineerReportsMobileScreen() {
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const visibleReports = getVisibleReports(ops, currentUser);
  const visibleProjects = getProjectsForUser(ops, currentUser);
  const primaryProject = getPrimaryProjectForUser(ops, currentUser);
  const approvedReports = visibleReports.filter((report) => report.status === "approved");
  const pendingReports = visibleReports.filter((report) => report.status === "pending");
  const rejectedReports = visibleReports.filter((report) => report.status === "rejected");
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
          <MobileAvatar label={currentUser.fullName} size={46} />
          <div className="text-right">
            <p className="text-lg font-semibold text-[#17204c]">{currentUser.fullName}</p>
            <p className="text-sm text-[#7d85b0]">{currentUser.designation}</p>
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
            <MobileMetricCard icon={<FileText className="h-6 w-6" />} label="Total Reports" value={String(visibleReports.length)} meta={primaryProject?.name ?? "Assigned projects"} />
            <MobileMetricCard icon={<CheckCircle2 className="h-6 w-6" />} label="Approved" value={String(approvedReports.length)} meta={`${visibleReports.length ? Math.round((approvedReports.length / visibleReports.length) * 100) : 0}%`} accent="text-[#18aa5d]" />
            <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value={String(pendingReports.length)} meta={`${visibleReports.length ? Math.round((pendingReports.length / visibleReports.length) * 100) : 0}%`} accent="text-[#ff8a00]" />
            <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Rejected" value={String(rejectedReports.length)} meta={`${visibleReports.length ? Math.round((rejectedReports.length / visibleReports.length) * 100) : 0}%`} accent="text-[#ff4f63]" />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MobileSelect label="Date Range" defaultValue="Latest submissions" />
            <MobileSelect label="Project" defaultValue={primaryProject?.name ?? "Assigned projects"} />
            <MobileSelect label="Report Type" defaultValue="All assigned types" />
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
            {visibleReports.slice(0, 5).map((report) => {
              const project = projectById(ops, report.projectId);
              return (
              <div key={report.id} className="grid grid-cols-[74px_1fr_auto] gap-3 rounded-[22px] border border-[#e8ebff] p-4">
                <div className="relative h-[74px] overflow-hidden rounded-[18px]">
                  <Image src={project?.image ?? projects[0]!.image} alt={project?.name ?? report.title} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-semibold text-[#17204c]">{report.title}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">{`${report.submittedAt}  -  ${reportTypeLabel(report.type)}`}</p>
                  <p className="mt-1 text-sm text-[#7d85b0]">{project?.name ?? "Project"}</p>
                </div>
                <div className="grid content-start justify-items-end gap-3">
                  <MobilePill tone={reportStatusTone(report.status)}>
                    {reportStatusLabel(report.status)}
                  </MobilePill>
                  <FileText className="h-5 w-5 text-[#5c2dff]" />
                </div>
              </div>
            );})}
            {visibleReports.length === 0 ? (
              <p className="rounded-[18px] border border-dashed border-[#e2e7fb] px-4 py-5 text-sm text-[#7680af]">
                No reports are available yet. Submit one from the daily report workflow to push it into the admin review queue.
              </p>
            ) : null}
          </div>
        </MobileCard>

        <MobileCard>
          <div className="grid grid-cols-2 gap-3">
            <MobileMetricCard icon={<FileText className="h-6 w-6" />} label="Daily Reports" value={String(visibleReports.filter((report) => report.type === "daily").length)} meta={`${visibleProjects.length} projects`} />
            <MobileMetricCard icon={<FileCheck2 className="h-6 w-6" />} label="Weekly Reports" value={String(visibleReports.filter((report) => report.type === "weekly").length)} meta="Submitted" accent="text-[#18aa5d]" />
            <MobileMetricCard icon={<CalendarDays className="h-6 w-6" />} label="Monthly Reports" value={String(visibleReports.filter((report) => report.type === "monthly").length)} meta="Submitted" accent="text-[#ff8a00]" />
            <MobileMetricCard icon={<FileClock className="h-6 w-6" />} label="Admin Queue" value={String(pendingReports.length)} meta="Pending review" accent="text-[#337dff]" />
          </div>
        </MobileCard>

        <MobilePrimaryButton href="/app/engineer/shift-report">Submit New Report</MobilePrimaryButton>
      </div>
    </MobileShell>
  );
}

export function ChatMobileScreen() {
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const chatProject = getPrimaryProjectForUser(ops, currentUser);
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
    const message = ops.addChatMessage({
      author: currentUser.fullName,
      role: currentUser.role === "finance" ? "Finance" : currentUser.role === "admin" ? "Admin" : "Site Engineer",
      body,
      tone: currentUser.role === "finance" ? "violet" : currentUser.role === "admin" ? "amber" : "blue",
      reactions: 0
    });
    setBody("");
    await guardedSupabaseWrite(
      supabase.from("messages").insert({
        project_id: chatProject?.id ?? ops.managedProjects[0]!.id,
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
          {ops.chatMessages.slice(-5).map((message, index) => {
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
      managedProjects: state.managedProjects,
      markAttendance: state.markAttendance
    }))
  );
  const currentUser = getCurrentUser(ops);
  const project = ops.managedProjects.find((item) => item.id === ops.activeAssignments[currentUser.id]) ?? ops.managedProjects[0];
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const project = getPrimaryProjectForUser(ops, currentUser);
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
          if (project) {
            ops.addFinanceRequest({
              requesterId: currentUser.id,
              projectId: project.id,
              title: "HDD bearing replacement",
              description: "Advance or reimbursement request raised from mobile form.",
              amount: 12000,
              urgency: "urgent",
              attachmentName: "mobile-finance-request.jpg"
            });
          }
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="space-y-4">
            <MobileSelect label="Project" defaultValue={project?.name ?? "Select project"} />
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
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
          ops.requestLeave({
            userId: currentUser.id,
            startDate: "20 May 2026",
            endDate: "22 May 2026",
            reason: "Family function"
          });
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const project = getPrimaryProjectForUser(ops, currentUser);
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
          if (project) {
            ops.addShiftReport({
              userId: currentUser.id,
              projectId: project.id,
              metersDrilled: 245,
              fuelUsedL: 32,
              notes: "Mobile daily shift report submitted from engineer dashboard.",
              safetyIssue: "No critical issue reported.",
              photoName: "mobile-shift-upload.jpg"
            });
          }
          setSaved(true);
        }}
      >
        <MobileCard>
          <div className="space-y-4">
            <MobileSelect label="Project" defaultValue={project?.name ?? "Select project"} />
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

export function EngineerLogsMobileScreen() {
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const project = getPrimaryProjectForUser(ops, currentUser);
  const recentDocuments = getDocumentRecords(ops, currentUser, project?.id).slice(0, 3);
  return (
    <MobileShell
      role="engineer"
      activeHref="/app/engineer/logs"
      title="Quick Site Update"
      subtitle="Capture work logs, tasks and supporting files"
      backHref="/app/engineer"
      leftMode="back"
      bottomNav={false}
    >
      <div className="space-y-4">
        <MobileCard>
          <MobileSectionTitle title="Log Actions" />
          <div className="grid grid-cols-4 gap-2">
            <MobileActionTile href="/app/engineer/attendance" icon={<CalendarDays className="h-6 w-6" />} title="Attendance" subtitle="Check-in" />
            <MobileActionTile href="/app/admin/staff/eng-arjun/assign-task" icon={<ListTodo className="h-6 w-6" />} title="Tasks" subtitle="Update" />
            <MobileActionTile href="/app/engineer/shift-report" icon={<FileText className="h-6 w-6" />} title="Daily Report" subtitle="Upload" />
            <MobileActionTile href="/app/engineer/documents/new" icon={<Upload className="h-6 w-6" />} title="Documents" subtitle="Add File" />
          </div>
        </MobileCard>

        <MobileCard>
          <div className="grid gap-4">
            <MobileSelect label="Project" defaultValue={project?.name ?? "Select project"} />
            <MobileSelect label="Log Type" defaultValue="Progress Update" />
            <MobileTextArea label="Update Notes" placeholder="Work completed up to manhole no. 45, cable team moved to next stretch..." rows={5} />
            <div className="grid grid-cols-2 gap-3">
              <MobileInput label="Progress (%)" defaultValue="72" />
              <MobileInput label="Distance Covered (KM)" defaultValue="13.40" />
            </div>
            <MobileUploadBox title="Attach Site Photo or Document" detail="Images, drawings, checklist or measurement proof" />
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[1rem] font-semibold text-[#121b44]">Recent Updates</h3>
            <Link href="/app/engineer/reports" className="text-sm font-semibold text-[#5c2dff]">View History</Link>
          </div>
          <div className="space-y-3">
            {[
              ["09:15 AM", "Attendance marked with GPS at current site", "Completed"],
              ...recentDocuments.map((document) => [document.meta.split("  - ")[0] ?? "Today", `${document.name} uploaded to project workspace`, document.status === "Approved" ? "Synced" : "In Review"] as const)
            ].map(([time, detail, state]) => (
              <div key={detail} className="grid grid-cols-[auto_1fr_auto] gap-3 rounded-[16px] border border-[#e8ebff] p-3">
                <div className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#f3efff] text-[#6a35ff]">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#17204c]">{detail}</p>
                  <p className="mt-1 text-[10px] text-[#7d85b0]">{time}</p>
                </div>
                <MobilePill tone={state === "Completed" ? "green" : state === "Synced" ? "blue" : "orange"}>
                  {state}
                </MobilePill>
              </div>
            ))}
          </div>
        </MobileCard>

        <MobilePrimaryButton href="/app/engineer/shift-report">Save Quick Update</MobilePrimaryButton>
      </div>
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
  const ops = useOpsStore((state) => state);
  const currentUser = getCurrentUser(ops);
  const primaryProject = getPrimaryProjectForUser(ops, currentUser);
  const documentRecords = getDocumentRecords(ops, currentUser, primaryProject?.id);
  const approvedDocs = documentRecords.filter((document) => document.status === "Approved");
  const pendingDocs = documentRecords.filter((document) => document.status === "Pending");
  const rejectedDocs = documentRecords.filter((document) => document.status === "Rejected");
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
        <MobileMetricCard icon={<FolderOpen className="h-6 w-6" />} label="Total Documents" value={String(documentRecords.length)} meta="Total" />
        <MobileMetricCard icon={<CheckCircle2 className="h-6 w-6" />} label="Approved" value={String(approvedDocs.length)} meta="Documents" accent="text-[#18aa5d]" />
        <MobileMetricCard icon={<Clock3 className="h-6 w-6" />} label="Pending" value={String(pendingDocs.length)} meta="Documents" accent="text-[#ff8a00]" />
        <MobileMetricCard icon={<ShieldX className="h-6 w-6" />} label="Rejected" value={String(rejectedDocs.length)} meta="Documents" accent="text-[#ff4f63]" />
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
  const cells = [
    null,
    null,
    null,
    null,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31
  ];
  return (
    <MobileCard className="h-full p-[14px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-[18px] w-[18px] text-[#6a35ff]" />
          <p className="text-[1.02rem] font-semibold text-[#121b44]">Attendance Overview</p>
        </div>
        <p className="text-[13px] font-semibold text-[#5c2dff]">May 2025</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-[#7b84af]">
        {days.map((day) => (
          <span key={day}>{day}</span>
        ))}
        {cells.map((value, index) => (
          <span
            key={`${value ?? "empty"}-${index}`}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full justify-self-center text-[13px] font-medium",
              value === null && "text-transparent",
              value === 16
                ? "bg-[#5c2dff] text-white"
                : value === 19
                  ? "bg-[#e8f9ef] text-[#18aa5d]"
                  : value === 22
                    ? "bg-[#fff2e3] text-[#ff8a00]"
                    : "text-[#1c2450]"
            )}
          >
            {value ?? "0"}
          </span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#6d78a9]">
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
              <p className="mt-1 text-sm text-[#7d85b0]">{projects[0]!.name}</p>
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
    <div className="px-2 first:pl-0">
      <p className="text-[1.08rem] font-bold leading-none tracking-normal">{value}</p>
      <p className="mt-1.5 text-[0.62rem] font-semibold leading-tight text-white/85">{label}</p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#7a84b0]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-[#17204c]">{value}</p>
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
      {title ? <h3 className="mb-3 text-[1.08rem] font-semibold text-[#121b44]">{title}</h3> : null}
      <div className="space-y-2.5 rounded-[18px] border border-[#e8ebff] p-3">
        {items.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[108px_1fr] gap-3 border-b border-[#edf0ff] pb-2.5 last:border-b-0 last:pb-0">
            <p className="text-[12px] text-[#7f87b0]">{label}</p>
            <p className="text-[13px] font-semibold text-[#17204c]">{value}</p>
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
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", dotTone)} />
        <span className="truncate">{label}</span>
      </div>
      {value ? <span className="mt-1 block truncate font-bold text-[#17204c]">{value}</span> : null}
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
