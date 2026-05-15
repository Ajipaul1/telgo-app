export type AccessDirectoryEntry = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "supervisor" | "engineer" | "client" | "finance";
  designation: string;
  phone: string;
  accessStatus: "active" | "pending" | "blocked";
  assignedProjectIds: string[];
  pinStatus: "ready" | "reset_required" | "removed";
  lastSeen: string;
};

export type PendingApprovalRequest = {
  id: string;
  type: "access" | "leave" | "report";
  requesterName: string;
  email: string;
  requestedRole: string;
  projectName: string;
  submittedAt: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
};

export type YesterdayReportItem = {
  id: string;
  projectId: string;
  projectName: string;
  submittedBy: string;
  role: string;
  submittedAt: string;
  summary: string;
  progressText: string;
  imageCount: number;
  status: "pending_review" | "approved" | "synced";
};

export type ClientAccessEntry = {
  id: string;
  clientName: string;
  email: string;
  accessStatus: "approved" | "not_assigned";
  projectId: string | null;
  projectName: string | null;
  lastShare: string;
};

export type EngineerTaskItem = {
  id: string;
  assigneeEmail: string;
  assigneeRole: "engineer" | "supervisor";
  title: string;
  detail: string;
  dueLabel: string;
  priority: "high" | "medium" | "low";
  projectId: string;
  status: "today" | "done" | "blocked";
};

export type LeaveRequestItem = {
  id: string;
  employeeName: string;
  email: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "approved" | "pending" | "rejected";
};

export type WorkerRosterItem = {
  id: string;
  name: string;
  designation: string;
  phone: string;
  projectId: string;
  projectName: string;
  workerStatus: "live" | "offline" | "leave";
};

export type PwdDocumentItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  uploadedBy: string;
  uploadedAt: string;
  fileType: string;
  category: "PWD Permission" | "Client Document" | "Progress Photo" | "Drawing";
};

export const accessDirectorySeed: AccessDirectoryEntry[] = [
  {
    id: "access-aji-admin",
    name: "Aji Paul",
    email: "ajipaul96@gmail.com",
    role: "admin",
    designation: "Admin Controller",
    phone: "+91 62825 20339",
    accessStatus: "active",
    assignedProjectIds: ["vadakkekotta-sn-cable", "ernakulam-mg-road-duct"],
    pinStatus: "ready",
    lastSeen: "Today, 01:38 PM"
  },
  {
    id: "access-arjun",
    name: "Arjun Nair",
    email: "arjun@telgopower.in",
    role: "engineer",
    designation: "Site Engineer",
    phone: "+91 70120 11234",
    accessStatus: "active",
    assignedProjectIds: ["vadakkekotta-sn-cable"],
    pinStatus: "ready",
    lastSeen: "Today, 09:15 AM"
  },
  {
    id: "access-nikhil",
    name: "Nikhil Raj",
    email: "nikhil@telgopower.in",
    role: "engineer",
    designation: "Site Engineer",
    phone: "+91 94972 44310",
    accessStatus: "active",
    assignedProjectIds: ["kolenchery-ernakulam-link"],
    pinStatus: "ready",
    lastSeen: "Today, 10:18 AM"
  },
  {
    id: "access-vishnu",
    name: "Vishnu Prasad",
    email: "vishnu@telgopower.in",
    role: "supervisor",
    designation: "Supervisor",
    phone: "+91 85900 11772",
    accessStatus: "active",
    assignedProjectIds: ["kannur-pwd-corridor"],
    pinStatus: "ready",
    lastSeen: "Today, 11:20 AM"
  },
  {
    id: "access-major",
    name: "Major Joseph",
    email: "major.client@metroinfra.in",
    role: "client",
    designation: "Client Representative",
    phone: "+91 94462 88021",
    accessStatus: "active",
    assignedProjectIds: ["vadakkekotta-sn-cable"],
    pinStatus: "ready",
    lastSeen: "Yesterday, 07:10 PM"
  },
  {
    id: "access-finance",
    name: "Anitha R",
    email: "anitha.finance@telgopower.in",
    role: "finance",
    designation: "Finance Lead",
    phone: "+91 98955 00114",
    accessStatus: "active",
    assignedProjectIds: ["kottayam-ring-main", "ernakulam-mg-road-duct"],
    pinStatus: "ready",
    lastSeen: "Today, 12:02 PM"
  }
];

export const pendingApprovalSeed: PendingApprovalRequest[] = [
  {
    id: "approval-request-1",
    type: "access",
    requesterName: "Midhun Paul",
    email: "midhun.engineer@telgopower.in",
    requestedRole: "Engineer",
    projectName: "Ernakulam MG Road Service Duct Modernisation",
    submittedAt: "Today, 09:05 AM",
    reason: "Waiting for admin approval before first APK login.",
    status: "pending"
  },
  {
    id: "approval-request-2",
    type: "leave",
    requesterName: "Nikhil Raj",
    email: "nikhil@telgopower.in",
    requestedRole: "Engineer",
    projectName: "Kolenchery to Ernakulam Utility Link",
    submittedAt: "Today, 08:42 AM",
    reason: "Personal leave request for tomorrow.",
    status: "pending"
  },
  {
    id: "approval-request-3",
    type: "report",
    requesterName: "Arjun Nair",
    email: "arjun@telgopower.in",
    requestedRole: "Engineer",
    projectName: "Vadakkekotta to SN Junction UG Cable Laying",
    submittedAt: "Yesterday, 06:35 PM",
    reason: "Daily corridor report awaiting review.",
    status: "pending"
  }
];

export const yesterdayReportSeed: YesterdayReportItem[] = [
  {
    id: "report-yesterday-1",
    projectId: "vadakkekotta-sn-cable",
    projectName: "Vadakkekotta to SN Junction UG Cable Laying",
    submittedBy: "Arjun Nair",
    role: "Site Engineer",
    submittedAt: "14 May 2026, 06:35 PM",
    summary: "Trench cutting, duct bedding, and cable laying completed up to the 1.8 km mark.",
    progressText: "1.8 km cumulative completion",
    imageCount: 7,
    status: "pending_review"
  },
  {
    id: "report-yesterday-2",
    projectId: "kolenchery-ernakulam-link",
    projectName: "Kolenchery to Ernakulam Utility Link",
    submittedBy: "Nikhil Raj",
    role: "Site Engineer",
    submittedAt: "14 May 2026, 05:50 PM",
    summary: "Joint pit preparation completed and duct pull route cleared for the next segment.",
    progressText: "2 km corridor completed",
    imageCount: 4,
    status: "approved"
  },
  {
    id: "report-yesterday-3",
    projectId: "kottayam-ring-main",
    projectName: "Kottayam Ring Main Cable Upgrade",
    submittedBy: "Anand S",
    role: "Line Engineer",
    submittedAt: "14 May 2026, 05:10 PM",
    summary: "Inspection notes uploaded with restoration photo proof and trench closeout records.",
    progressText: "900 m cumulative completion",
    imageCount: 5,
    status: "synced"
  }
];

export const clientAccessSeed: ClientAccessEntry[] = [
  {
    id: "client-major",
    clientName: "Major Joseph",
    email: "major.client@metroinfra.in",
    accessStatus: "approved",
    projectId: "vadakkekotta-sn-cable",
    projectName: "Vadakkekotta to SN Junction UG Cable Laying",
    lastShare: "Today, 12:15 PM"
  },
  {
    id: "client-bineesh",
    clientName: "Bineesh Varghese",
    email: "bineesh.client@utilitycorridor.in",
    accessStatus: "approved",
    projectId: "kolenchery-ernakulam-link",
    projectName: "Kolenchery to Ernakulam Utility Link",
    lastShare: "Yesterday, 05:45 PM"
  },
  {
    id: "client-unassigned-1",
    clientName: "Metro Review Desk",
    email: "reviewdesk@metroinfra.in",
    accessStatus: "not_assigned",
    projectId: null,
    projectName: null,
    lastShare: "Not shared yet"
  }
];

export const engineerTaskSeed: EngineerTaskItem[] = [
  {
    id: "task-1",
    assigneeEmail: "arjun@telgopower.in",
    assigneeRole: "engineer",
    title: "Complete corridor progress photos",
    detail: "Upload trench, duct, cable, and barricading photos before shift closeout.",
    dueLabel: "Today - 06:00 PM",
    priority: "high",
    projectId: "vadakkekotta-sn-cable",
    status: "today"
  },
  {
    id: "task-2",
    assigneeEmail: "nikhil@telgopower.in",
    assigneeRole: "engineer",
    title: "Confirm 2 km duct continuity report",
    detail: "Send continuity confirmation and updated route log for the Kolenchery segment.",
    dueLabel: "Today - 05:30 PM",
    priority: "medium",
    projectId: "kolenchery-ernakulam-link",
    status: "today"
  },
  {
    id: "task-3",
    assigneeEmail: "vishnu@telgopower.in",
    assigneeRole: "supervisor",
    title: "Follow up PWD permission letter",
    detail: "Collect signed permission response and update the Kannur project blocker note.",
    dueLabel: "Today - 04:45 PM",
    priority: "high",
    projectId: "kannur-pwd-corridor",
    status: "blocked"
  }
];

export const leaveRequestSeed: LeaveRequestItem[] = [
  {
    id: "leave-1",
    employeeName: "Nikhil Raj",
    email: "nikhil@telgopower.in",
    startDate: "16 May 2026",
    endDate: "16 May 2026",
    reason: "Personal work",
    status: "pending"
  },
  {
    id: "leave-2",
    employeeName: "Anand S",
    email: "anand@telgopower.in",
    startDate: "19 May 2026",
    endDate: "20 May 2026",
    reason: "Approved weekend leave",
    status: "approved"
  }
];

export const workerRosterSeed: WorkerRosterItem[] = [
  {
    id: "worker-1",
    name: "Arjun Nair",
    designation: "Site Engineer",
    phone: "+91 70120 11234",
    projectId: "vadakkekotta-sn-cable",
    projectName: "Vadakkekotta to SN Junction UG Cable Laying",
    workerStatus: "live"
  },
  {
    id: "worker-2",
    name: "Nikhil Raj",
    designation: "Site Engineer",
    phone: "+91 94972 44310",
    projectId: "kolenchery-ernakulam-link",
    projectName: "Kolenchery to Ernakulam Utility Link",
    workerStatus: "live"
  },
  {
    id: "worker-3",
    name: "Vishnu Prasad",
    designation: "Supervisor",
    phone: "+91 85900 11772",
    projectId: "kannur-pwd-corridor",
    projectName: "Kannur PWD Roadside Duct Corridor",
    workerStatus: "offline"
  },
  {
    id: "worker-4",
    name: "Anand S",
    designation: "Line Engineer",
    phone: "+91 97450 81524",
    projectId: "kottayam-ring-main",
    projectName: "Kottayam Ring Main Cable Upgrade",
    workerStatus: "live"
  }
];

export const pwdDocumentSeed: PwdDocumentItem[] = [
  {
    id: "doc-1",
    title: "Kannur PWD Permission Follow-up Note",
    projectId: "kannur-pwd-corridor",
    projectName: "Kannur PWD Roadside Duct Corridor",
    uploadedBy: "Vishnu Prasad",
    uploadedAt: "15 May 2026, 09:45 AM",
    fileType: "PDF",
    category: "PWD Permission"
  },
  {
    id: "doc-2",
    title: "Vadakkekotta Client Progress Package",
    projectId: "vadakkekotta-sn-cable",
    projectName: "Vadakkekotta to SN Junction UG Cable Laying",
    uploadedBy: "Arjun Nair",
    uploadedAt: "15 May 2026, 04:35 PM",
    fileType: "ZIP",
    category: "Client Document"
  },
  {
    id: "doc-3",
    title: "Kolenchery Route Drawing Rev-02",
    projectId: "kolenchery-ernakulam-link",
    projectName: "Kolenchery to Ernakulam Utility Link",
    uploadedBy: "Nikhil Raj",
    uploadedAt: "14 May 2026, 02:10 PM",
    fileType: "DWG",
    category: "Drawing"
  }
];
