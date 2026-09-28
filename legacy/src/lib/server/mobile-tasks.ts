import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManagedTask } from "@/store/ops-store";

type TaskRow = Record<string, unknown>;

type TaskMetadata = {
  detail?: string;
  taskType?: string;
  location?: string;
  notes?: string;
  attachmentName?: string;
  assignedByUserId?: string;
};

const TASKS_SETUP_MESSAGE =
  "Supabase task tables are not available yet. Run the bundled Supabase migrations to enable real task management.";

export async function listRealTasks(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTasksTableError(error)) {
      return {
        tasks: [] as ManagedTask[],
        message: TASKS_SETUP_MESSAGE
      };
    }
    throw error;
  }

  return {
    tasks: (data ?? []).map((row) => toManagedTask(row as TaskRow)),
    message: null
  };
}

export async function createRealTask(
  supabase: SupabaseClient,
  input: Omit<ManagedTask, "id" | "createdAt">
) {
  const payload = toTaskTablePayload(input);
  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (isMissingTasksTableError(error)) {
      throw new Error(TASKS_SETUP_MESSAGE);
    }
    throw error;
  }

  return toManagedTask(data as TaskRow);
}

export async function updateRealTask(
  supabase: SupabaseClient,
  taskId: string,
  updates: Partial<ManagedTask>
) {
  const payload = toTaskTablePayload(updates, { allowPartial: true });
  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) {
    if (isMissingTasksTableError(error)) {
      throw new Error(TASKS_SETUP_MESSAGE);
    }
    throw error;
  }

  return toManagedTask(data as TaskRow);
}

export function toManagedTask(row: TaskRow): ManagedTask {
  const metadata = parseTaskDescription(row.description);
  return {
    id: String(row.id ?? `task-${Date.now()}`),
    title: String(row.title ?? "Task"),
    detail: metadata.detail ?? String(row.description ?? "Task detail to be confirmed."),
    projectId: String(row.project_id ?? ""),
    assigneeUserId: String(row.assigned_to ?? ""),
    assignedByUserId: metadata.assignedByUserId ?? "admin",
    priority: fromDbPriority(row.priority),
    status: fromDbStatus(row.status),
    dueAt: formatDueAt(row.due_at),
    taskType: metadata.taskType ?? "Inspection",
    location: metadata.location,
    notes: metadata.notes,
    attachmentName: metadata.attachmentName,
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

function toTaskTablePayload(
  input: Partial<ManagedTask>,
  options: { allowPartial?: boolean } = {}
) {
  const allowPartial = options.allowPartial ?? false;
  const payload: Record<string, unknown> = {};
  const metadata: TaskMetadata = {};

  const setField = (key: string, value: unknown) => {
    if (allowPartial) {
      if (value !== undefined) payload[key] = value;
      return;
    }
    payload[key] = value ?? null;
  };

  if ("detail" in input) metadata.detail = input.detail;
  if ("taskType" in input) metadata.taskType = input.taskType;
  if ("location" in input) metadata.location = input.location;
  if ("notes" in input) metadata.notes = input.notes;
  if ("attachmentName" in input) metadata.attachmentName = input.attachmentName;
  if ("assignedByUserId" in input) metadata.assignedByUserId = input.assignedByUserId;

  setField("project_id", input.projectId);
  setField("assigned_to", input.assigneeUserId);
  setField("title", input.title);
  if (!allowPartial || Object.keys(metadata).length > 0 || input.detail !== undefined) {
    setField("description", stringifyTaskDescription(metadata, input.detail));
  }
  setField("priority", toDbPriority(input.priority));
  setField("status", toDbStatus(input.status));
  setField("due_at", normalizeDueAt(input.dueAt));

  return payload;
}

function parseTaskDescription(value: unknown): TaskMetadata {
  const text = String(value ?? "").trim();
  if (!text) return {};
  if (!text.startsWith("{")) {
    return { detail: text };
  }

  try {
    const parsed = JSON.parse(text) as TaskMetadata;
    return typeof parsed === "object" && parsed ? parsed : { detail: text };
  } catch {
    return { detail: text };
  }
}

function stringifyTaskDescription(metadata: TaskMetadata, fallbackDetail?: string) {
  const payload: TaskMetadata = {
    detail: metadata.detail ?? fallbackDetail ?? "Task detail to be confirmed.",
    taskType: metadata.taskType,
    location: metadata.location,
    notes: metadata.notes,
    attachmentName: metadata.attachmentName,
    assignedByUserId: metadata.assignedByUserId
  };

  return JSON.stringify(payload);
}

function toDbPriority(priority: ManagedTask["priority"] | undefined) {
  switch (priority) {
    case "low":
      return "low";
    case "high":
      return "high";
    case "medium":
    default:
      return "medium";
  }
}

function fromDbPriority(value: unknown): ManagedTask["priority"] {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "low":
      return "low";
    case "high":
      return "high";
    case "normal":
    case "medium":
    default:
      return "medium";
  }
}

function toDbStatus(status: ManagedTask["status"] | undefined) {
  switch (status) {
    case "completed":
      return "completed";
    case "in_progress":
    case "blocked":
      return "in_progress";
    case "upcoming":
    case "pending":
    default:
      return "pending";
  }
}

function fromDbStatus(value: unknown): ManagedTask["status"] {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "completed":
      return "completed";
    case "in_progress":
      return "in_progress";
    case "pending":
    default:
      return "pending";
  }
}

function normalizeDueAt(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}$/i.test(text)) {
    return new Date(text).toISOString();
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function formatDueAt(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "Due date pending";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function isMissingTasksTableError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return [
    "could not find the table 'public.tasks' in the schema cache",
    'relation "public.tasks" does not exist',
    'relation "tasks" does not exist'
  ].some((fragment) => message.includes(fragment));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}
