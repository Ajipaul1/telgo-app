"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { chatMessages, projects } from "@/lib/demo-data";
import type { ChatMessage, Role, StatusTone } from "@/lib/types";

export type DemoUser = {
  id: string;
  fullName: string;
  role: Role;
  email: string;
  phone: string;
  company: string;
  loginId: string;
  password: string;
  status: "active" | "pending" | "inactive";
  projectIds: string[];
  site: string;
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

type OpsState = {
  currentUserId: string;
  forceOffline: boolean;
  users: DemoUser[];
  accessRequests: AccessRequest[];
  activeAssignments: Record<string, string>;
  attendance: AttendanceRecord[];
  financeRequests: FinanceRequest[];
  shiftReports: ShiftReport[];
  chatMessages: ChatMessage[];
  notifications: AppNotification[];
  login: (identifier: string, password: string, fallbackRole: Role) => DemoUser;
  signOut: () => void;
  setForceOffline: (value: boolean) => void;
  requestAccess: (request: Omit<AccessRequest, "id" | "status" | "createdAt">) => string;
  approveAccessRequest: (requestId: string, projectId: string) => AccessRequest | undefined;
  rejectAccessRequest: (requestId: string) => void;
  setActiveAssignment: (userId: string, projectId: string) => void;
  markAttendance: (record: Omit<AttendanceRecord, "id">) => string;
  addFinanceRequest: (request: Omit<FinanceRequest, "id" | "createdAt" | "status">) => string;
  decideFinanceRequest: (id: string, status: "approved" | "rejected" | "paid") => void;
  addShiftReport: (report: Omit<ShiftReport, "id" | "createdAt">) => string;
  addChatMessage: (message: Omit<ChatMessage, "id" | "time" | "tone"> & { tone?: StatusTone }) => ChatMessage;
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  requestClientReview: (projectId: string) => void;
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
    id: "vishnu",
    fullName: "Vishnu Prasad",
    role: "admin",
    email: "admin@telgo.test",
    phone: "+91 98470 11001",
    company: "Telgo Power Projects",
    loginId: "admin@telgo.test",
    password: "TelgoAdmin#2026",
    status: "active",
    projectIds: projects.map((project) => project.id),
    site: "Kerala Operations HQ"
  },
  {
    id: "anitha",
    fullName: "Anitha R.",
    role: "finance",
    email: "finance@telgo.test",
    phone: "+91 98470 11002",
    company: "Telgo Power Projects",
    loginId: "finance@telgo.test",
    password: "TelgoFin#2026",
    status: "active",
    projectIds: ["cial-33kv", "panangad-hdd", "rdss-imperial"],
    site: "Kochi Finance Desk"
  },
  {
    id: "arjun",
    fullName: "Arjun Nair",
    role: "engineer",
    email: "engineer@telgo.test",
    phone: "+91 98470 11003",
    company: "Telgo Power Projects",
    loginId: "engineer@telgo.test",
    password: "TelgoEng#2026",
    status: "active",
    projectIds: ["panangad-hdd", "cial-33kv"],
    site: "Panangad HDD Crossing"
  },
  {
    id: "client-cial",
    fullName: "CIAL Client Desk",
    role: "client",
    email: "client@telgo.test",
    phone: "+91 98470 11004",
    company: "CIAL Projects",
    loginId: "client@telgo.test",
    password: "TelgoClient#2026",
    status: "active",
    projectIds: ["cial-33kv"],
    site: "CIAL 33kV UG Cable Laying"
  }
];

const seedRequests: AccessRequest[] = [
  {
    id: "req-engineer-aneesh",
    fullName: "Aneesh P. Menon",
    phone: "+91 98955 42318",
    email: "aneesh.menon@telgo.test",
    companyName: "Telgo Power Projects",
    site: "Panangad HDD Crossing",
    requestedRole: "engineer",
    accessPurpose: "site monitoring",
    status: "pending",
    createdAt: "10 May 2026, 08:42 AM"
  },
  {
    id: "req-finance-meera",
    fullName: "Meera Joseph",
    phone: "+91 98461 30215",
    email: "meera.finance@telgo.test",
    companyName: "Telgo Power Projects",
    site: "Kochi Finance Desk",
    requestedRole: "finance",
    accessPurpose: "finance approvals",
    status: "pending",
    createdAt: "10 May 2026, 09:10 AM"
  },
  {
    id: "req-client-cial",
    fullName: "Rahul Varghese",
    phone: "+91 98461 80144",
    email: "rahul.cial@client.test",
    companyName: "CIAL Project Office",
    site: "CIAL 33kV UG Cable Laying",
    requestedRole: "client",
    accessPurpose: "client transparency",
    status: "pending",
    createdAt: "10 May 2026, 09:18 AM"
  }
];

const seedFinanceRequests: FinanceRequest[] = [
  {
    id: "fin-hdd-bearing",
    requesterId: "arjun",
    projectId: "panangad-hdd",
    title: "HDD bearing replacement",
    description: "Urgent replacement needed before evening pullback.",
    amount: 12000,
    urgency: "urgent",
    attachmentName: "bearing-invoice-panangad.jpg",
    status: "pending",
    createdAt: "10 May 2026, 10:05 AM"
  }
];

const seedNotifications: AppNotification[] = [
  {
    id: "note-finance-tag",
    targetRole: "finance",
    title: "Tagged in project chat",
    body: "@Finance Need diesel approval for HDD machine.",
    type: "chat",
    createdAt: "10 May 2026, 10:12 AM",
    read: false
  },
  {
    id: "note-admin-site",
    targetRole: "admin",
    title: "New site activity",
    body: "Panangad HDD Crossing has live attendance and finance activity.",
    type: "system",
    createdAt: "10 May 2026, 10:15 AM",
    read: false
  }
];

const fallbackByRole: Record<Role, string> = {
  admin: "vishnu",
  engineer: "arjun",
  finance: "anitha",
  client: "client-cial",
  supervisor: "vishnu"
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

export const useOpsStore = create<OpsState>()(
  persist(
    (set, get) => ({
      currentUserId: "arjun",
      forceOffline: false,
      users: seedUsers,
      accessRequests: seedRequests,
      activeAssignments: {
        arjun: "panangad-hdd",
        anitha: "cial-33kv",
        vishnu: "cial-33kv",
        "client-cial": "cial-33kv"
      },
      attendance: [],
      financeRequests: seedFinanceRequests,
      shiftReports: [],
      chatMessages: [
        ...chatMessages,
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
      signOut: () => set({ currentUserId: "arjun" }),
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
        const user: DemoUser = {
          id: userId,
          fullName: request.fullName,
          role: request.requestedRole,
          email: request.email,
          phone: request.phone,
          company: request.companyName,
          loginId: credentials.loginId,
          password: credentials.password,
          status: "active",
          projectIds: [projectId],
          site: request.site
        };
        set((state) => ({
          accessRequests: state.accessRequests.map((item) =>
            item.id === requestId ? approved : item
          ),
          users: state.users.some((item) => item.email === user.email)
            ? state.users
            : [user, ...state.users],
          activeAssignments: {
            ...state.activeAssignments,
            [user.id]: projectId
          },
          notifications: [
            {
              id: `note-approval-${Date.now()}`,
              targetRole: request.requestedRole,
              title: "Access approved",
              body: `${request.fullName} assigned to ${projects.find((project) => project.id === projectId)?.name ?? request.site}.`,
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
              ? { ...item, status: "rejected", reviewedAt: nowText(), reviewedBy: state.currentUserId }
              : item
          )
        })),
      setActiveAssignment: (userId, projectId) =>
        set((state) => ({
          activeAssignments: {
            ...state.activeAssignments,
            [userId]: projectId
          }
        })),
      markAttendance: (record) => {
        const id = `att-${Date.now()}`;
        set((state) => ({
          attendance: [{ ...record, id }, ...state.attendance],
          notifications: [
            {
              id: `note-att-${Date.now()}`,
              targetRole: "admin",
              title: "Attendance marked",
              body: `${state.users.find((user) => user.id === record.userId)?.fullName ?? "Engineer"} checked in ${record.withinGeofence ? "inside" : "outside"} geofence.`,
              type: "approval",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
      },
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
        set((state) => ({
          financeRequests: state.financeRequests.map((item) =>
            item.id === id ? { ...item, status } : item
          ),
          notifications: [
            {
              id: `note-fin-decision-${Date.now()}`,
              targetRole: "engineer",
              title: status === "approved" ? "Finance approved" : "Finance updated",
              body:
                status === "approved"
                  ? "Approved. Funds ready."
                  : `Finance request ${status}.`,
              type: "finance",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        })),
      addShiftReport: (report) => {
        const id = `shift-${Date.now()}`;
        set((state) => ({
          shiftReports: [{ ...report, id, createdAt: nowText() }, ...state.shiftReports],
          notifications: [
            {
              id: `note-shift-${Date.now()}`,
              targetRole: "admin",
              title: "End shift report submitted",
              body: `${state.users.find((user) => user.id === report.userId)?.fullName ?? "Engineer"} submitted meterage, fuel and safety notes.`,
              type: "system",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }));
        return id;
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
              body: `${projects.find((project) => project.id === projectId)?.name ?? "Project"} needs admin review.`,
              type: "client",
              createdAt: nowText(),
              read: false
            },
            ...state.notifications
          ]
        }))
    }),
    {
      name: "telgo-ops-workflow",
      version: 1
    }
  )
);

export function getCurrentUser(state: Pick<OpsState, "users" | "currentUserId">) {
  return state.users.find((user) => user.id === state.currentUserId) ?? seedUsers[2];
}
