"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { chatMessages as demoChatMessages, projects as demoProjects } from "@/lib/demo-data";
import type { ChatMessage, Project, Role, StatusTone } from "@/lib/types";

export type DemoUser = {
  id: string;
  fullName: string;
  role: Role;
  designation: string;
  department: string;
  email: string;
  phone: string;
  company: string;
  loginId: string;
  password: string;
  status: "active" | "pending" | "inactive";
  projectIds: string[];
  site: string;
  joinedAt: string;
  employeeCode: string;
  managerName: string;
  emergencyContact: string;
  workStatus: "online" | "offline" | "on_site" | "on_leave";
  avatar?: string | null;
};

export type AccessRequest = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  companyName: string;
  site: string;
  requestedRole: Role;
  accessPurpose: string;
  documentPath?: string | null;
  status: "pending" | "approved" | "rejected";
  assignedProjectId?: string;
  loginId?: string;
  password?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type AttendanceRecord = {
  id: string;
  userId: string;
  projectId: string;
  checkInAt: string;
  checkOutAt?: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  distanceFromSiteM: number;
  withinGeofence: boolean;
  status: "pending_approval" | "approved" | "queued";
};

export type FinanceRequest = {
  id: string;
  requesterId: string;
  projectId: string;
  title: string;
  description: string;
  amount: number;
  urgency: "normal" | "urgent";
  attachmentName?: string;
  status: "draft" | "pending" | "approved" | "rejected" | "paid";
  createdAt: string;
};

export type ShiftReport = {
  id: string;
  userId: string;
  projectId: string;
  metersDrilled: number;
  fuelUsedL: number;
  notes: string;
  safetyIssue: string;
  photoName?: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  targetRole: Role | "all";
  title: string;
  body: string;
  type: "chat" | "approval" | "finance" | "client" | "system";
  createdAt: string;
  read: boolean;
};

export type ManagedTask = {
  id: string;
  title: string;
  detail: string;
  projectId: string;
  assigneeUserId: string;
  assignedByUserId: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed" | "upcoming" | "blocked";
  dueAt: string;
  taskType: string;
  location?: string;
  notes?: string;
  attachmentName?: string;
  createdAt: string;
};

export type LeaveRequest = {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type ProjectDocument = {
  id: string;
  name: string;
  projectId: string;
  type: "PDF" | "DOC" | "XLS" | "JPG" | "ZIP";
  category: "permission" | "report" | "photo" | "drawing" | "approval" | "client";
  status: "approved" | "pending" | "rejected";
  authorUserId: string;
  uploadedAt: string;
  sizeLabel: string;
  description?: string;
  visibilityRoles: Role[];
};

export type ProjectReport = {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  summary: string;
  type: "daily" | "weekly" | "monthly";
  status: "pending" | "approved" | "rejected";
  progressPercent: number;
  imageCount: number;
  submittedAt: string;
};

export type ClientPermission = {
  id: string;
  clientUserId: string;
  projectId: string;
  status: "approved" | "paused";
  canViewDocuments: boolean;
  canViewReports: boolean;
  canViewTracking: boolean;
  canChat: boolean;
};

export type ProjectSyncStatus = "demo" | "syncing" | "supabase" | "error";
export type TaskSyncStatus = "demo" | "syncing" | "supabase" | "error";

export type GeolocationState = {
  permission: "prompt" | "granted" | "denied";
  position: any | null;
  error: any | null;
};

export type OpsState = {
  currentUserId: string;
  forceOffline: boolean;
  users: DemoUser[];
  managedProjects: Project[];
  projectSyncStatus: ProjectSyncStatus;
  projectSyncError: string | null;
  accessRequests: AccessRequest[];
  activeAssignments: Record<string, string>;
  attendance: AttendanceRecord[];
  financeRequests: FinanceRequest[];
  shiftReports: ShiftReport[];
  chatMessages: ChatMessage[];
  notifications: AppNotification[];
  tasks: ManagedTask[];
  taskSyncStatus: TaskSyncStatus;
  taskSyncError: string | null;
  leaveRequests: LeaveRequest[];
  projectDocuments: ProjectDocument[];
  projectReports: ProjectReport[];
  clientPermissions: ClientPermission[];
  liveLocation: GeolocationState;
  replaceManagedProjects: (
    projects: Project[],
    source?: Exclude<ProjectSyncStatus, "syncing" | "error">
  ) => void;
  setProjectSyncState: (status: ProjectSyncStatus, error?: string | null) => void;
  replaceTasks: (
    tasks: ManagedTask[],
    source?: Exclude<TaskSyncStatus, "syncing" | "error">
  ) => void;
  setTaskSyncState: (status: TaskSyncStatus, error?: string | null) => void;
  replaceAccessRequests: (requests: AccessRequest[]) => void;
  replaceProjectDocuments: (documents: ProjectDocument[]) => void;
  login: (identifier: string, password: string, fallbackRole: Role) => DemoUser;
  signOut: () => void;
  setForceOffline: (value: boolean) => void;
  requestAccess: (request: Omit<AccessRequest, "id" | "status" | "createdAt">) => string;
  approveAccessRequest: (requestId: string, projectId: string) => AccessRequest | undefined;
  rejectAccessRequest: (requestId: string) => void;
  setActiveAssignment: (userId: string, projectId: string) => void;
  markAttendance: (record: Omit<AttendanceRecord, "id">) => string;
  reviewAttendance: (id: string, status: "approved" | "queued") => void;
  addFinanceRequest: (request: Omit<FinanceRequest, "id" | "createdAt" | "status">) => string;
  decideFinanceRequest: (id: string, status: "approved" | "rejected" | "paid") => void;
  addShiftReport: (report: Omit<ShiftReport, "id" | "createdAt">) => Promise<string>;
  addChatMessage: (
    message: Omit<ChatMessage, "id" | "time" | "tone"> & { tone?: StatusTone }
  ) => ChatMessage;
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  requestClientReview: (projectId: string) => void;
  addProject: (
    project: Omit<Project, "id"> & {
      id?: string;
    }
  ) => string;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  assignTask: (
    task: Omit<ManagedTask, "id" | "createdAt" | "assignedByUserId"> & {
      assignedByUserId?: string;
    }
  ) => string;
  updateTask: (taskId: string, updates: Partial<ManagedTask>) => void;
  removeTask: (taskId: string) => void;
  requestLeave: (request: Omit<LeaveRequest, "id" | "status" | "createdAt">) => string;
  decideLeaveRequest: (id: string, status: "approved" | "rejected") => void;
  addProjectDocument: (
    document: Omit<ProjectDocument, "id" | "uploadedAt" | "status"> & {
      status?: ProjectDocument["status"];
    }
  ) => string;
  reviewProjectDocument: (
    id: string,
    status: "approved" | "rejected"
  ) => void;
  removeProjectDocument: (id: string) => void;
  addProjectReport: (
    report: Omit<ProjectReport, "id" | "submittedAt" | "status"> & {
      status?: ProjectReport["status"];
    }
  ) => string;
  reviewProjectReport: (id: string, status: "approved" | "rejected") => void;
  removeUserAccess: (userId: string) => void;
  setUserWorkStatus: (userId: string, workStatus: DemoUser["workStatus"]) => void;
  upsertClientPermission: (
    permission: Omit<ClientPermission, "id"> & { id?: string }
  ) => string;
  setLiveLocation: (location: GeolocationState) => void;
  markNotificationRead: (id: string) => void;
};

const nowText = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

const seedUsers: DemoUser[] = [
  {
    id: "admin-vishnu",
    fullName: "Vishnu Prasad",
    role: "admin",
    designation: "Operations Administrator",
    department: "Operations",
    email: "admin@telgo.test",
    phone: "+91 98470 11001",
    company: "Telgo Operations",
    loginId: "admin@telgo.test",
    password: "TelgoAdmin#2026",
    status: "active",
    projectIds: demoProjects.map((project) => project.id),
    site: "Kerala Operations HQ",
    joinedAt: "04 Jan 2024",
    employeeCode: "ADM-0001",
    managerName: "Board",
    emergencyContact: "HQ Control Room",
    workStatus: "online"
  },
  {
    id: "eng-arjun",
    fullName: "Arjun Nair",
    role: "engineer",
    designation: "Site Engineer",
    department: "Operations",
    email: "engineer@telgo.test",
    phone: "+91 98470 11003",
    company: "Telgo Operations",
    loginId: "engineer@telgo.test",
    password: "TelgoEng#2026",
    status: "active",
    projectIds: ["vadakkekotta-sn-cable"],
    site: "Kottayam Utility Expansion",
    joinedAt: "12 Apr 2024",
    employeeCode: "ENG-1007",
    managerName: "Manu Mohan",
    emergencyContact: "Anu Nair  +91 98765 11110",
    workStatus: "on_site"
  },
  {
    id: "eng-vishnu",
    fullName: "Vishnu P",
    role: "engineer",
    designation: "Junior Engineer",
    department: "Operations",
    email: "vishnu.p@company.com",
    phone: "+91 91234 56789",
    company: "Telgo Operations",
    loginId: "vishnu.p@company.com",
    password: "TelgoEng#2202",
    status: "active",
    projectIds: ["kolenchery-ernakulam-link"],
    site: "Kozhikode Road Network",
    joinedAt: "18 Mar 2024",
    employeeCode: "ENG-1011",
    managerName: "Rajeev R",
    emergencyContact: "Home Contact  +91 91234 00001",
    workStatus: "online"
  },
  {
    id: "eng-rajeev",
    fullName: "Rajeev R",
    role: "supervisor",
    designation: "Project Supervisor",
    department: "Operations",
    email: "supervisor@telgo.test",
    phone: "+91 98470 11223",
    company: "Telgo Operations",
    loginId: "supervisor@telgo.test",
    password: "TelgoSup#2026",
    status: "active",
    projectIds: ["kannur-pwd-corridor"],
    site: "Thrissur Drainage Project",
    joinedAt: "15 Feb 2024",
    employeeCode: "SUP-2034",
    managerName: "Vishnu Prasad",
    emergencyContact: "Field Control  +91 98470 11990",
    workStatus: "on_site"
  },
  {
    id: "eng-divya",
    fullName: "Divya S",
    role: "finance",
    designation: "Finance Controller",
    department: "Finance",
    email: "finance@telgo.test",
    phone: "+91 90375 55667",
    company: "Telgo Operations",
    loginId: "finance@telgo.test",
    password: "TelgoFin#2026",
    status: "active",
    projectIds: ["vadakkekotta-sn-cable", "kolenchery-ernakulam-link", "ernakulam-mg-road-duct"],
    site: "Kochi Finance Desk",
    joinedAt: "22 Feb 2024",
    employeeCode: "FIN-3012",
    managerName: "Vishnu Prasad",
    emergencyContact: "Finance Desk  +91 90375 55660",
    workStatus: "online"
  },
  {
    id: "eng-jithin",
    fullName: "Jithin Jose",
    role: "engineer",
    designation: "Quality Engineer",
    department: "Operations",
    email: "jithin.j@company.com",
    phone: "+91 93456 77890",
    company: "Telgo Operations",
    loginId: "jithin.j@company.com",
    password: "TelgoEng#7789",
    status: "active",
    projectIds: ["ernakulam-mg-road-duct"],
    site: "Alappuzha Sewerage Works",
    joinedAt: "12 Sep 2023",
    employeeCode: "ENG-1021",
    managerName: "Rajeev R",
    emergencyContact: "Home Contact  +91 93456 77891",
    workStatus: "offline"
  },
  {
    id: "eng-manu",
    fullName: "Manu Mohan",
    role: "supervisor",
    designation: "Project Manager",
    department: "Operations",
    email: "manu.m@company.com",
    phone: "+91 95443 22110",
    company: "Telgo Operations",
    loginId: "manu.m@company.com",
    password: "TelgoSup#2211",
    status: "active",
    projectIds: ["vadakkekotta-sn-cable"],
    site: "Kottayam Utility Expansion",
    joinedAt: "05 Dec 2023",
    employeeCode: "SUP-2040",
    managerName: "Vishnu Prasad",
    emergencyContact: "Field Control  +91 95443 22111",
    workStatus: "on_leave"
  },
  {
    id: "client-reliable",
    fullName: "Reliable Infra Pvt. Ltd.",
    role: "client",
    designation: "Client Desk",
    department: "Client",
    email: "client@telgo.test",
    phone: "+91 98765 43210",
    company: "Reliable Infra Pvt. Ltd.",
    loginId: "client@telgo.test",
    password: "TelgoClient#2026",
    status: "active",
    projectIds: ["vadakkekotta-sn-cable", "kolenchery-ernakulam-link", "kannur-pwd-corridor", "kottayam-ring-main", "ernakulam-mg-road-duct"],
    site: "Client Transparency Portal",
    joinedAt: "10 Jan 2024",
    employeeCode: "CLI-5001",
    managerName: "Client Director",
    emergencyContact: "Rakesh Nair  +91 98765 43211",
    workStatus: "online"
  }
];

const seedAccessRequests: AccessRequest[] = [
  {
    id: "req-engineer-aneesh",
    fullName: "Aneesh P. Menon",
    phone: "+91 98955 42318",
    email: "aneesh.menon@telgo.test",
    companyName: "Telgo Operations",
    site: "Kottayam Utility Expansion",
    requestedRole: "engineer",
    accessPurpose: "Site monitoring and daily reporting",
    status: "pending",
    createdAt: "20 May 2026, 08:42 AM"
  },
  {
    id: "req-finance-meera",
    fullName: "Meera Joseph",
    phone: "+91 98461 30215",
    email: "meera.finance@telgo.test",
    companyName: "Telgo Operations",
    site: "Kochi Finance Desk",
    requestedRole: "finance",
    accessPurpose: "Finance approvals and reimbursement review",
    status: "pending",
    createdAt: "20 May 2026, 09:10 AM"
  },
  {
    id: "req-client-rahul",
    fullName: "Rahul Varghese",
    phone: "+91 98461 80144",
    email: "rahul.client@reliableinfra.com",
    companyName: "Reliable Infra Pvt. Ltd.",
    site: "Client Transparency Portal",
    requestedRole: "client",
    accessPurpose: "Project transparency and document review",
    status: "pending",
    createdAt: "20 May 2026, 09:18 AM"
  }
];

const seedAttendance: AttendanceRecord[] = [
  {
    id: "att-arjun-today",
    userId: "eng-arjun",
    projectId: "vadakkekotta-sn-cable",
    checkInAt: "2026-05-20T09:15:00+05:30",
    latitude: 9.9538,
    longitude: 76.3428,
    accuracyM: 9,
    distanceFromSiteM: 32,
    withinGeofence: true,
    status: "approved"
  },
  {
    id: "att-rajeev-today",
    userId: "eng-rajeev",
    projectId: "kannur-pwd-corridor",
    checkInAt: "2026-05-20T08:55:00+05:30",
    latitude: 11.8772,
    longitude: 75.3918,
    accuracyM: 11,
    distanceFromSiteM: 48,
    withinGeofence: true,
    status: "approved"
  },
  {
    id: "att-vishnu-review",
    userId: "eng-vishnu",
    projectId: "kolenchery-ernakulam-link",
    checkInAt: "2026-05-20T09:24:00+05:30",
    latitude: 10.019,
    longitude: 76.4821,
    accuracyM: 18,
    distanceFromSiteM: 214,
    withinGeofence: false,
    status: "pending_approval"
  }
];

const seedFinanceRequests: FinanceRequest[] = [
  {
    id: "fin-bearing",
    requesterId: "eng-arjun",
    projectId: "vadakkekotta-sn-cable",
    title: "HDD bearing replacement",
    description: "Urgent replacement needed before evening pullback.",
    amount: 12000,
    urgency: "urgent",
    attachmentName: "bearing-invoice-panangad.jpg",
    status: "pending",
    createdAt: "20 May 2026, 10:05 AM"
  },
  {
    id: "fin-diesel",
    requesterId: "eng-rajeev",
    projectId: "kannur-pwd-corridor",
    title: "Diesel advance for trenching crew",
    description: "Fuel advance needed for standby site logistics.",
    amount: 4560,
    urgency: "normal",
    attachmentName: "diesel-slip-kannur.jpg",
    status: "pending",
    createdAt: "19 May 2026, 02:20 PM"
  }
];

const seedShiftReports: ShiftReport[] = [
  {
    id: "shift-arjun-1",
    userId: "eng-arjun",
    projectId: "vadakkekotta-sn-cable",
    metersDrilled: 245,
    fuelUsedL: 32,
    notes: "Cable laying and barricading completed up to the new crossing segment.",
    safetyIssue: "No major safety issue reported.",
    photoName: "kottayam-shift-01.jpg",
    createdAt: "19 May 2026, 06:05 PM"
  },
  {
    id: "shift-jithin-1",
    userId: "eng-jithin",
    projectId: "ernakulam-mg-road-duct",
    metersDrilled: 180,
    fuelUsedL: 24,
    notes: "Urban duct service lane restored and closure photographs uploaded.",
    safetyIssue: "Traffic marshaling required until 8 PM.",
    photoName: "alappuzha-shift-02.jpg",
    createdAt: "19 May 2026, 05:48 PM"
  }
];

const seedTasks: ManagedTask[] = [
  {
    id: "task-arjun-inspection",
    title: "Site inspection at Block A",
    detail: "Check foundation quality and materials before cable pull.",
    projectId: "vadakkekotta-sn-cable",
    assigneeUserId: "eng-arjun",
    assignedByUserId: "eng-manu",
    priority: "high",
    status: "pending",
    dueAt: "20 May 2026, 09:00 AM",
    taskType: "Inspection",
    location: "Block A",
    createdAt: "20 May 2026, 08:00 AM"
  },
  {
    id: "task-arjun-quality",
    title: "Material quality check",
    detail: "Verify cement, steel and sand quality for the utility corridor.",
    projectId: "vadakkekotta-sn-cable",
    assigneeUserId: "eng-arjun",
    assignedByUserId: "eng-manu",
    priority: "medium",
    status: "in_progress",
    dueAt: "20 May 2026, 11:30 AM",
    taskType: "Quality Check",
    createdAt: "20 May 2026, 08:15 AM"
  },
  {
    id: "task-arjun-report",
    title: "Daily progress update",
    detail: "Upload site photos and update work progress before shift closeout.",
    projectId: "vadakkekotta-sn-cable",
    assigneeUserId: "eng-arjun",
    assignedByUserId: "eng-manu",
    priority: "low",
    status: "upcoming",
    dueAt: "20 May 2026, 04:00 PM",
    taskType: "Reporting",
    createdAt: "20 May 2026, 08:20 AM"
  },
  {
    id: "task-rajeev-permission",
    title: "Follow up PWD permission letter",
    detail: "Collect signed permission response and update blocker status.",
    projectId: "kannur-pwd-corridor",
    assigneeUserId: "eng-rajeev",
    assignedByUserId: "admin-vishnu",
    priority: "high",
    status: "blocked",
    dueAt: "20 May 2026, 04:45 PM",
    taskType: "Permission",
    createdAt: "20 May 2026, 07:40 AM"
  },
  {
    id: "task-vishnu-route",
    title: "Confirm duct continuity report",
    detail: "Send continuity confirmation and updated route log.",
    projectId: "kolenchery-ernakulam-link",
    assigneeUserId: "eng-vishnu",
    assignedByUserId: "eng-rajeev",
    priority: "medium",
    status: "completed",
    dueAt: "19 May 2026, 05:30 PM",
    taskType: "Verification",
    createdAt: "19 May 2026, 09:00 AM"
  }
];

const seedLeaveRequests: LeaveRequest[] = [
  {
    id: "leave-eng-nikhil",
    userId: "eng-vishnu",
    startDate: "21 May 2026",
    endDate: "21 May 2026",
    reason: "Personal leave request",
    status: "pending",
    createdAt: "20 May 2026, 08:42 AM"
  },
  {
    id: "leave-manu",
    userId: "eng-manu",
    startDate: "16 May 2026",
    endDate: "16 May 2026",
    reason: "Family function",
    status: "approved",
    createdAt: "19 May 2026, 10:05 AM",
    reviewedAt: "19 May 2026, 10:20 AM",
    reviewedBy: "admin-vishnu"
  }
];

const seedProjectDocuments: ProjectDocument[] = [
  {
    id: "doc-pwd-approval",
    name: "PWD Approval Letter.pdf",
    projectId: "vadakkekotta-sn-cable",
    type: "PDF",
    category: "permission",
    status: "approved",
    authorUserId: "eng-arjun",
    uploadedAt: "20 May 2026, 09:30 AM",
    sizeLabel: "2.4 MB",
    visibilityRoles: ["admin", "client", "engineer", "supervisor"]
  },
  {
    id: "doc-inspection",
    name: "Site Inspection Report.docx",
    projectId: "vadakkekotta-sn-cable",
    type: "DOC",
    category: "report",
    status: "pending",
    authorUserId: "eng-arjun",
    uploadedAt: "20 May 2026, 08:15 AM",
    sizeLabel: "1.8 MB",
    visibilityRoles: ["admin", "engineer", "supervisor", "client"]
  },
  {
    id: "doc-photo",
    name: "Site Photo - Road Crossing.jpg",
    projectId: "vadakkekotta-sn-cable",
    type: "JPG",
    category: "photo",
    status: "approved",
    authorUserId: "eng-arjun",
    uploadedAt: "19 May 2026, 06:45 PM",
    sizeLabel: "3.2 MB",
    visibilityRoles: ["admin", "engineer", "supervisor", "client"]
  },
  {
    id: "doc-delivery",
    name: "Material Delivery Note.pdf",
    projectId: "kolenchery-ernakulam-link",
    type: "PDF",
    category: "approval",
    status: "approved",
    authorUserId: "eng-vishnu",
    uploadedAt: "19 May 2026, 04:20 PM",
    sizeLabel: "1.2 MB",
    visibilityRoles: ["admin", "finance", "supervisor"]
  },
  {
    id: "doc-progress",
    name: "Progress Summary.xlsx",
    projectId: "ernakulam-mg-road-duct",
    type: "XLS",
    category: "client",
    status: "rejected",
    authorUserId: "eng-jithin",
    uploadedAt: "18 May 2026, 07:10 PM",
    sizeLabel: "950 KB",
    visibilityRoles: ["admin", "finance", "client"]
  }
];

const seedProjectReports: ProjectReport[] = [
  {
    id: "report-vadakkekotta-daily",
    userId: "eng-arjun",
    projectId: "vadakkekotta-sn-cable",
    title: "Kottayam Utility Expansion",
    summary: "Trench cutting, duct bedding, and cable laying completed up to 1.8 km mark.",
    type: "daily",
    status: "approved",
    progressPercent: 72,
    imageCount: 7,
    submittedAt: "20 May 2026, 09:15 AM"
  },
  {
    id: "report-kozhikode-daily",
    userId: "eng-vishnu",
    projectId: "kolenchery-ernakulam-link",
    title: "Kozhikode Road Network",
    summary: "Joint pit preparation completed and route log updated.",
    type: "daily",
    status: "pending",
    progressPercent: 58,
    imageCount: 4,
    submittedAt: "19 May 2026, 06:30 PM"
  },
  {
    id: "report-thrissur-daily",
    userId: "eng-rajeev",
    projectId: "kannur-pwd-corridor",
    title: "Thrissur Drainage Project",
    summary: "Permission blocker note uploaded for review.",
    type: "daily",
    status: "approved",
    progressPercent: 35,
    imageCount: 2,
    submittedAt: "19 May 2026, 04:45 PM"
  },
  {
    id: "report-palakkad-weekly",
    userId: "eng-divya",
    projectId: "kottayam-ring-main",
    title: "Palakkad Water Supply Line",
    summary: "Budget closeout notes attached for completed segment.",
    type: "weekly",
    status: "rejected",
    progressPercent: 100,
    imageCount: 1,
    submittedAt: "18 May 2026, 11:20 AM"
  },
  {
    id: "report-alappuzha-daily",
    userId: "eng-jithin",
    projectId: "ernakulam-mg-road-duct",
    title: "Alappuzha Sewerage Works",
    summary: "Restoration photo proof and urban duct closeout records uploaded.",
    type: "daily",
    status: "approved",
    progressPercent: 64,
    imageCount: 5,
    submittedAt: "18 May 2026, 05:10 PM"
  }
];

const seedClientPermissions: ClientPermission[] = [
  {
    id: "client-perm-vadakkekotta",
    clientUserId: "client-reliable",
    projectId: "vadakkekotta-sn-cable",
    status: "approved",
    canViewDocuments: true,
    canViewReports: true,
    canViewTracking: true,
    canChat: true
  },
  {
    id: "client-perm-kozhikode",
    clientUserId: "client-reliable",
    projectId: "kolenchery-ernakulam-link",
    status: "approved",
    canViewDocuments: true,
    canViewReports: true,
    canViewTracking: true,
    canChat: true
  },
  {
    id: "client-perm-thrissur",
    clientUserId: "client-reliable",
    projectId: "kannur-pwd-corridor",
    status: "approved",
    canViewDocuments: true,
    canViewReports: true,
    canViewTracking: false,
    canChat: true
  }
];

const seedNotifications: AppNotification[] = [
  {
    id: "note-finance-tag",
    targetRole: "finance",
    title: "Tagged in project chat",
    body: "@Finance Need diesel approval for HDD machine.",
    type: "chat",
    createdAt: "20 May 2026, 10:12 AM",
    read: false
  },
  {
    id: "note-admin-site",
    targetRole: "admin",
    title: "New site activity",
    body: "Kottayam Utility Expansion has attendance, documents and finance activity.",
    type: "system",
    createdAt: "20 May 2026, 10:15 AM",
    read: false
  }
];

const fallbackByRole: Record<Role, string> = {
  admin: "admin-vishnu",
  engineer: "eng-arjun",
  finance: "eng-divya",
  client: "client-reliable",
  supervisor: "eng-rajeev"
};

function makeCredential(fullName: string, role: Role) {
  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
  return {
    loginId: `${slug || role}.${role}@telgo.test`,
    password: `Telgo${role[0]?.toUpperCase() ?? "U"}#${String(Date.now()).slice(-4)}`
  };
}

function getProjectName(projects: Project[], projectId: string) {
  return projects.find((project) => project.id === projectId)?.name ?? "Project";
}

function getUserName(users: DemoUser[], userId: string) {
  return users.find((user) => user.id === userId)?.fullName ?? "Team Member";
}

function normalizeProject(project: Omit<Project, "id"> & { id?: string }): Project {
  const projectId = project.id ?? `project-${Date.now()}`;
  return {
    ...project,
    id: projectId,
    spent: project.spent ?? 0,
    progress: project.progress ?? Math.round((project.completedKm / Math.max(project.totalLengthKm, 1)) * 100),
    coordinates: project.coordinates ?? demoProjects[0]!.coordinates,
    accent: project.accent ?? "cyan",
    corridor:
      project.corridor ??
      {
        startLabel: `${project.location} Start`,
        endLabel: `${project.location} End`,
        startCoordinates: demoProjects[0]!.corridor?.startCoordinates ?? demoProjects[0]!.coordinates,
        endCoordinates: demoProjects[0]!.corridor?.endCoordinates ?? demoProjects[0]!.coordinates,
        totalMeters: Math.round(project.totalLengthKm * 1000),
        completedMeters: Math.round(project.completedKm * 1000),
        geofenceMeters: 150,
        progressUpdates: []
      }
  };
}

export const useOpsStore = create<OpsState>()(
  persist(
    (set, get) => ({
      currentUserId: "eng-arjun",
      forceOffline: false,
      users: seedUsers,
      managedProjects: demoProjects,
      projectSyncStatus: "demo",
      projectSyncError: null,
      accessRequests: seedAccessRequests,
      activeAssignments: {
        "admin-vishnu": "vadakkekotta-sn-cable",
        "eng-arjun": "vadakkekotta-sn-cable",
        "eng-vishnu": "kolenchery-ernakulam-link",
        "eng-rajeev": "kannur-pwd-corridor",
        "eng-divya": "vadakkekotta-sn-cable",
        "eng-jithin": "ernakulam-mg-road-duct",
        "eng-manu": "vadakkekotta-sn-cable",
        "client-reliable": "vadakkekotta-sn-cable"
      },
      attendance: seedAttendance,
      financeRequests: seedFinanceRequests,
      shiftReports: seedShiftReports,
      chatMessages: [
        ...demoChatMessages,
        {
          id: "m-site-started",
          author: "Arjun Nair",
          role: "Site Engineer",
          body: "Hi everyone, site work started.",
          time: "10:20 AM",
          tone: "cyan",
          reactions: 0
        },
        {
          id: "m-finance-tag",
          author: "Arjun Nair",
          role: "Site Engineer",
          body: "@Finance Need diesel approval for HDD machine. @Admin please note.",
          time: "10:22 AM",
          tone: "cyan",
          reactions: 0
        }
      ],
      notifications: seedNotifications,
      tasks: seedTasks,
      taskSyncStatus: "demo",
      taskSyncError: null,
      leaveRequests: seedLeaveRequests,
      projectDocuments: seedProjectDocuments,
      projectReports: seedProjectReports,
      clientPermissions: seedClientPermissions,
      liveLocation: { permission: "prompt", position: null, error: null },
      replaceManagedProjects: (projects, source = "supabase") =>
        set(() => ({
          managedProjects: projects.map((project) => normalizeProject(project)),
          projectSyncStatus: source,
          projectSyncError: null
        })),
      setProjectSyncState: (status, error = null) =>
        set(() => ({
          projectSyncStatus: status,
          projectSyncError: error
        })),
      replaceTasks: (tasks, source = "supabase") =>
        set(() => ({
          tasks,
          taskSyncStatus: source,
          taskSyncError: null
        })),
      setTaskSyncState: (status, error = null) =>
        set(() => ({
          taskSyncStatus: status,
          taskSyncError: error
        })),
      replaceAccessRequests: (requests) =>
        set(() => ({
          accessRequests: requests
        })),
      replaceProjectDocuments: (documents) =>
        set(() => ({
          projectDocuments: documents
        })),
      login: (identifier, password, fallbackRole) => {
        const normalized = identifier.trim().toLowerCase();
        const user =
          get().users.find(
            (candidate) =>
              candidate.status === "active" &&
              [candidate.loginId, candidate.email, candidate.phone].some(
                (value) => value.toLowerCase() === normalized
              ) &&
              (!password || candidate.password === password)
          ) ?? get().users.find((candidate) => candidate.id === fallbackByRole[fallbackRole])!;
        set({ currentUserId: user.id });
        return user;
      },
      signOut: () => set({ currentUserId: "eng-arjun" }),
      setForceOffline: (value) => set({ forceOffline: value }),
      requestAccess: (request) => {
        const id = `req-${Date.now()}`;
        set((state) => ({
          accessRequests: [
            {
              ...request,
              id,
              status: "pending",
              createdAt: nowText()
            },
            ...state.accessRequests
          ],
          notifications: [
            {
              id: `note-access-${Date.now()}`,
              targetRole: "admin",
              title: "New access request",
              body: `${request.fullName} requested ${request.requestedRole} access.`,
              type: "approval",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
      },
      approveAccessRequest: (requestId, projectId) => {
        const request = get().accessRequests.find((item) => item.id === requestId);
        if (!request) return undefined;
        const credentials = makeCredential(request.fullName, request.requestedRole);
        const userId = `${request.requestedRole}-${requestId.replace(/^req-/, "")}`;
        const approved: AccessRequest = {
          ...request,
          ...credentials,
          status: "approved",
          assignedProjectId: projectId,
          reviewedAt: nowText(),
          reviewedBy: get().currentUserId
        };
        const projectName = getProjectName(get().managedProjects, projectId);
        const newUser: DemoUser = {
          id: userId,
          fullName: request.fullName,
          role: request.requestedRole,
          designation: request.requestedRole === "client" ? "Client Desk" : `${request.requestedRole[0]!.toUpperCase()}${request.requestedRole.slice(1)} User`,
          department: request.requestedRole === "finance" ? "Finance" : "Operations",
          email: request.email,
          phone: request.phone,
          company: request.companyName,
          loginId: credentials.loginId,
          password: credentials.password,
          status: "active",
          projectIds: [projectId],
          site: projectName,
          joinedAt: nowText().replace(",", ""),
          employeeCode: `${request.requestedRole.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-4)}`,
          managerName: getUserName(get().users, get().currentUserId),
          emergencyContact: `${request.fullName} Emergency`,
          workStatus: "online"
        };
        set((state) => ({
          accessRequests: state.accessRequests.map((item) =>
            item.id === requestId ? approved : item
          ),
          users: state.users.some((item) => item.email === newUser.email)
            ? state.users
            : [newUser, ...state.users],
          activeAssignments: {
            ...state.activeAssignments,
            [newUser.id]: projectId
          },
          notifications: [
            {
              id: `note-approval-${Date.now()}`,
              targetRole: request.requestedRole,
              title: "Access approved",
              body: `${request.fullName} assigned to ${projectName}.`,
              type: "approval",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return approved;
      },
      rejectAccessRequest: (requestId) =>
        set((state) => ({
          accessRequests: state.accessRequests.map((item) =>
            item.id === requestId
              ? {
                  ...item,
                  status: "rejected",
                  reviewedAt: nowText(),
                  reviewedBy: state.currentUserId
                }
              : item
          )
        })),
      setActiveAssignment: (userId, projectId) =>
        set((state) => ({
          activeAssignments: {
            ...state.activeAssignments,
            [userId]: projectId
          },
          users: state.users.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  projectIds: user.projectIds.includes(projectId)
                    ? user.projectIds
                    : [projectId, ...user.projectIds]
                }
              : user
          )
        })),
      markAttendance: (record) => {
        const id = `att-${Date.now()}`;
        set((state) => ({
          attendance: [{ ...record, id }, ...state.attendance],
          users: state.users.map((user) =>
            user.id === record.userId
              ? {
                  ...user,
                  workStatus: record.withinGeofence ? "on_site" : "online"
                }
              : user
          ),
          notifications: [
            {
              id: `note-att-${Date.now()}`,
              targetRole: "admin",
              title: "Attendance marked",
              body: `${getUserName(state.users, record.userId)} checked in ${record.withinGeofence ? "inside" : "outside"} geofence.`,
              type: "approval",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
      },
      reviewAttendance: (id, status) =>
        set((state) => ({
          attendance: state.attendance.map((item) =>
            item.id === id ? { ...item, status } : item
          )
        })),
      addFinanceRequest: (request) => {
        const id = `fin-${Date.now()}`;
        set((state) => ({
          financeRequests: [
            {
              ...request,
              id,
              status: "pending",
              createdAt: nowText()
            },
            ...state.financeRequests
          ],
          notifications: [
            {
              id: `note-fin-${Date.now()}`,
              targetRole: "finance",
              title: "New finance request",
              body: `${request.title} for INR ${request.amount.toLocaleString("en-IN")} needs review.`,
              type: "finance",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
      },
      decideFinanceRequest: (id, status) =>
        set((state) => {
          const financeRequest = state.financeRequests.find((item) => item.id === id);
          return {
            financeRequests: state.financeRequests.map((item) =>
              item.id === id ? { ...item, status } : item
            ),
            notifications: financeRequest
              ? [
                  {
                    id: `note-fin-decision-${Date.now()}`,
                    targetRole: "engineer",
                    title: status === "approved" ? "Finance approved" : "Finance updated",
                    body:
                      status === "approved"
                        ? `${financeRequest.title} approved.`
                        : `Finance request ${status}.`,
                    type: "finance",
                    createdAt: nowText(),
                    read: false
                  },
                  ...state.notifications
                ]
              : state.notifications
          };
        }),
      addShiftReport: async (report) => {
        const project = get().managedProjects.find((item) => item.id === report.projectId);
        const payload = {
          projectId: report.projectId,
          title: project?.name ?? "Daily Shift Report",
          description: report.notes || "End of shift report",
          metersDrilled: report.metersDrilled,
          fuelUsedL: report.fuelUsedL,
          notes: report.notes,
          safetyIssue: report.safetyIssue || "No critical issue reported.",
          photoPath: report.photoName || "",
          urgency: "normal" as const
        };

        try {
          const response = await fetch("/api/mobile/reports", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to submit shift report via API");
          }

          const data = await response.json();
          // Map backend snake_case keys back to camelCase frontend ShiftReport properties
          const newReport: ShiftReport = {
            id: String(data.id || `shift-${Date.now()}`),
            userId: data.user_id || report.userId,
            projectId: data.project_id || report.projectId,
            metersDrilled: Number(data.meters_drilled ?? report.metersDrilled),
            fuelUsedL: Number(data.fuel_used_l ?? report.fuelUsedL),
            notes: data.notes || report.notes,
            safetyIssue: data.safety_issue || report.safetyIssue,
            photoName: data.photo_path || report.photoName,
            createdAt: data.created_at ? new Date(data.created_at).toLocaleString("en-IN") : nowText()
          };

          set((state) => ({
            shiftReports: [newReport, ...state.shiftReports],
            projectReports: [
              {
                id: `report-${Date.now()}`,
                userId: newReport.userId,
                projectId: newReport.projectId,
                title: project?.name ?? "Project Report",
                summary: newReport.notes,
                type: "daily",
                status: "pending",
                progressPercent: project?.progress ?? 0,
                imageCount: newReport.photoName ? 1 : 0,
                submittedAt: nowText()
              },
              ...state.projectReports
            ],
            notifications: [
              {
                id: `note-shift-${Date.now()}`,
                targetRole: "admin",
                title: "End shift report submitted",
                body: `${getUserName(state.users, newReport.userId)} submitted meterage, fuel and safety notes.`,
                type: "system",
                createdAt: nowText(),
                read: false
              },
              ...state.notifications
            ]
          }));

          return newReport.id;
        } catch (error) {
          console.error("Failed to add shift report via API, falling back to local-only submission:", error);
          const localId = `shift-${Date.now()}`;
          const fallbackReport: ShiftReport = {
            ...report,
            id: localId,
            createdAt: nowText()
          };

          set((state) => ({
            shiftReports: [fallbackReport, ...state.shiftReports],
            projectReports: [
              {
                id: `report-${Date.now()}`,
                userId: fallbackReport.userId,
                projectId: fallbackReport.projectId,
                title: project?.name ?? "Project Report",
                summary: fallbackReport.notes,
                type: "daily",
                status: "pending",
                progressPercent: project?.progress ?? 0,
                imageCount: fallbackReport.photoName ? 1 : 0,
                submittedAt: nowText()
              },
              ...state.projectReports
            ],
            notifications: [
              {
                id: `note-shift-${Date.now()}`,
                targetRole: "admin",
                title: "End shift report submitted (offline)",
                body: `${getUserName(state.users, fallbackReport.userId)} submitted meterage, fuel and safety notes.`,
                type: "system",
                createdAt: nowText(),
                read: false
              },
              ...state.notifications
            ]
          }));

          return localId;
        }
      },
      addChatMessage: (message) => {
        const full: ChatMessage = {
          ...message,
          id: `msg-${Date.now()}`,
          time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
          }),
          tone: message.tone ?? "cyan"
        };
        const lower = full.body.toLowerCase();
        set((state) => ({
          chatMessages: [...state.chatMessages, full],
          notifications: [
            ...(lower.includes("@finance")
              ? [
                  {
                    id: `note-chat-fin-${Date.now()}`,
                    targetRole: "finance" as Role,
                    title: "Tagged in chat",
                    body: full.body,
                    type: "chat" as const,
                    createdAt: nowText(),
                    read: false
                  }
                ]
              : []),
            ...(lower.includes("@admin")
              ? [
                  {
                    id: `note-chat-admin-${Date.now()}`,
                    targetRole: "admin" as Role,
                    title: "Tagged in chat",
                    body: full.body,
                    type: "chat" as const,
                    createdAt: nowText(),
                    read: false
                  }
                ]
              : []),
            ...state.notifications
          ]
        }));
        return full;
      },
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: `note-${Date.now()}`,
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        })),
      requestClientReview: (projectId) =>
        set((state) => ({
          notifications: [
            {
              id: `note-client-review-${Date.now()}`,
              targetRole: "admin",
              title: "Client requested review",
              body: `${getProjectName(state.managedProjects, projectId)} needs admin review.`,
              type: "client",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        })),
      addProject: (project) => {
        const normalized = normalizeProject(project);
        set((state) => ({
          managedProjects: [normalized, ...state.managedProjects],
          notifications: [
            {
              id: `note-project-${Date.now()}`,
              targetRole: "admin",
              title: "New project added",
              body: `${normalized.name} created and ready for assignments.`,
              type: "system",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return normalized.id;
      },
      updateProject: (projectId, updates) =>
        set((state) => ({
          managedProjects: state.managedProjects.map((project) =>
            project.id === projectId
              ? normalizeProject({
                  ...project,
                  ...updates
                })
              : project
          )
        })),
      assignTask: (task) => {
        const id = `task-${Date.now()}`;
        const assignedByUserId = task.assignedByUserId ?? get().currentUserId;
        set((state) => ({
          tasks: [
            {
              ...task,
              id,
              assignedByUserId,
              createdAt: nowText()
            },
            ...state.tasks
          ],
          notifications: [
            {
              id: `note-task-${Date.now()}`,
              targetRole: state.users.find((user) => user.id === task.assigneeUserId)?.role ?? "engineer",
              title: "New task assigned",
              body: `${task.title} assigned for ${getProjectName(state.managedProjects, task.projectId)}.`,
              type: "approval",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
      },
      updateTask: (taskId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, ...updates } : task
          )
        })),
      removeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId)
        })),
      requestLeave: (request) => {
        const id = `leave-${Date.now()}`;
        set((state) => ({
          leaveRequests: [
            {
              ...request,
              id,
              status: "pending",
              createdAt: nowText()
            },
            ...state.leaveRequests
          ],
          notifications: [
            {
              id: `note-leave-${Date.now()}`,
              targetRole: "admin",
              title: "New leave request",
              body: `${getUserName(state.users, request.userId)} submitted a leave request.`,
              type: "approval",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
      },
      decideLeaveRequest: (id, status) =>
        set((state) => ({
          leaveRequests: state.leaveRequests.map((request) =>
            request.id === id
              ? {
                  ...request,
                  status,
                  reviewedAt: nowText(),
                  reviewedBy: state.currentUserId
                }
              : request
          )
        })),
      addProjectDocument: (document) => {
        const id = `doc-${Date.now()}`;
        set((state) => ({
          projectDocuments: [
            {
              ...document,
              id,
              uploadedAt: nowText(),
              status: document.status ?? "pending"
            },
            ...state.projectDocuments
          ],
          notifications: [
            {
              id: `note-doc-${Date.now()}`,
              targetRole: "admin",
              title: "New document uploaded",
              body: `${document.name} uploaded for ${getProjectName(state.managedProjects, document.projectId)}.`,
              type: "approval",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
      },
      reviewProjectDocument: (id, status) =>
        set((state) => ({
          projectDocuments: state.projectDocuments.map((document) =>
            document.id === id ? { ...document, status } : document
          )
        })),
      removeProjectDocument: (id) =>
        set((state) => ({
          projectDocuments: state.projectDocuments.filter((document) => document.id !== id)
        })),
      addProjectReport: (report) => {
        const id = `report-${Date.now()}`;
        set((state) => ({
          projectReports: [
            {
              ...report,
              id,
              submittedAt: nowText(),
              status: report.status ?? "pending"
            },
            ...state.projectReports
          ],
          notifications: [
            {
              id: `note-report-${Date.now()}`,
              targetRole: "admin",
              title: "New project report",
              body: `${report.title} submitted for review.`,
              type: "approval",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
      },
      reviewProjectReport: (id, status) =>
        set((state) => ({
          projectReports: state.projectReports.map((report) =>
            report.id === id ? { ...report, status } : report
          )
        })),
      removeUserAccess: (userId) =>
        set((state) => ({
          users: state.users.map((user) =>
            user.id === userId
              ? { ...user, status: "inactive", workStatus: "offline" }
              : user
          )
        })),
      setUserWorkStatus: (userId, workStatus) =>
        set((state) => ({
          users: state.users.map((user) =>
            user.id === userId ? { ...user, workStatus } : user
          )
        })),
      upsertClientPermission: (permission) => {
        const id = permission.id ?? `client-perm-${Date.now()}`;
        set((state) => ({
          clientPermissions: state.clientPermissions.some((item) => item.id === id)
            ? state.clientPermissions.map((item) =>
                item.id === id ? { ...item, ...permission, id } : item
              )
            : [{ ...permission, id }, ...state.clientPermissions]
        }));
        return id;
      },
      setLiveLocation: (location) => set({ liveLocation: location }),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          )
        }))
    }),
    {
      name: "telgo-ops-workflow",
      version: 2,
      partialize: (state) => {
        // Exclude liveLocation from persistence since it contains native non-serializable GeolocationPosition objects
        const { liveLocation, ...rest } = state;
        return rest;
      }
    }
  )
);

export function getCurrentUser(state: Pick<OpsState, "users" | "currentUserId">) {
  return state.users.find((user) => user.id === state.currentUserId) ?? seedUsers[1];
}
