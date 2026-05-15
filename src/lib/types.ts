export type Role = "admin" | "engineer" | "finance" | "client" | "supervisor";

export type StatusTone =
  | "cyan"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "violet"
  | "slate";

export type ProjectStatus = "On Track" | "At Risk" | "Active" | "Completed" | "Delayed";

export type ProjectProgressUpdate = {
  id: string;
  label: string;
  detail: string;
  recordedAt: string;
  metersCompleted: number;
};

export type ProjectCorridor = {
  startLabel: string;
  endLabel: string;
  startCoordinates: [number, number];
  endCoordinates: [number, number];
  totalMeters: number;
  completedMeters: number;
  geofenceMeters: number;
  progressUpdates: ProjectProgressUpdate[];
};

export type Project = {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  client: string;
  image: string;
  status: ProjectStatus;
  progress: number;
  budget: number;
  spent: number;
  totalLengthKm: number;
  completedKm: number;
  startDate: string;
  endDate: string;
  manager: string;
  siteInCharge: string;
  coordinates: [number, number];
  accent: StatusTone;
  corridor?: ProjectCorridor;
};

export type Engineer = {
  id: string;
  name: string;
  role: string;
  site: string;
  location: string;
  status: "Active" | "Idle" | "Inactive" | "Stagnant" | "Moving";
  lastUpdate: string;
  distance?: string;
  speed?: string;
  battery?: number;
  avatar: string;
};

export type Activity = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  tone: StatusTone;
  amount?: string;
};

export type Alert = {
  id: string;
  title: string;
  project: string;
  location: string;
  severity: "Critical" | "High" | "Warning" | "Resolved";
  detail: string;
  time: string;
};

export type Approval = {
  id: string;
  category: "Attendance" | "Finance" | "Leave" | "Overtime" | "Report";
  requester: string;
  project: string;
  location?: string;
  amount?: number;
  meta: string;
  status: "Pending" | "Approved" | "Rejected";
  range?: string;
};

export type ChatMessage = {
  id: string;
  author: string;
  role: string;
  body: string;
  time: string;
  tone: StatusTone;
  images?: string[];
  reactions?: number;
};
