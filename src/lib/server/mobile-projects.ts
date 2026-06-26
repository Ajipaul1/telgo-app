import type { SupabaseClient } from "@supabase/supabase-js";
import { projects as demoProjects } from "@/lib/demo-data";
import type { Project, ProjectStatus, StatusTone } from "@/lib/types";

const FALLBACK_PROJECT = demoProjects[0]!;
const PROJECTS_SETUP_MESSAGE =
  "Supabase project tables are not available yet. Run the bundled Supabase migrations to enable real project management.";

type ProjectRow = Record<string, unknown>;

export async function listRealProjects(
  supabase: SupabaseClient,
  options: { syncDemoProjects?: boolean } = {}
) {
  if (options.syncDemoProjects !== false) {
    await syncDemoProjectsToSupabase(supabase);
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingProjectsTableError(error)) {
      return {
        projects: demoProjects,
        message: PROJECTS_SETUP_MESSAGE
      };
    }
    throw error;
  }

  return {
    projects: (data ?? []).map((row) => toMobileProject(row as ProjectRow)),
    message: null
  };
}

export async function createRealProject(
  supabase: SupabaseClient,
  input: Omit<Project, "id"> & { id?: string }
) {
  const payload = toProjectTablePayload(input);
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (isMissingProjectsTableError(error)) {
      throw new Error(PROJECTS_SETUP_MESSAGE);
    }
    throw error;
  }

  return toMobileProject(data as ProjectRow);
}

export async function updateRealProject(
  supabase: SupabaseClient,
  projectId: string,
  updates: Partial<Project>
) {
  const payload = toProjectTablePayload(updates, { allowPartial: true });
  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", projectId)
    .select("*")
    .single();

  if (error) {
    if (isMissingProjectsTableError(error)) {
      throw new Error(PROJECTS_SETUP_MESSAGE);
    }
    throw error;
  }

  return toMobileProject(data as ProjectRow);
}

export async function syncDemoProjectsToSupabase(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("projects")
    .upsert(demoProjects.map((project) => toProjectTablePayload(project)), { onConflict: "id" });

  if (error && !isMissingProjectsTableError(error)) {
    throw error;
  }
}

export function toMobileProject(row: ProjectRow): Project {
  const id = String(row.id ?? "");
  const code = String(row.code ?? "").trim();
  const name = String(row.name ?? "Project").trim();
  const demoProject =
    demoProjects.find((project) => project.id === id) ??
    demoProjects.find((project) => project.code === code) ??
    demoProjects.find((project) => project.name === name) ??
    null;

  const status = fromDbStatus(row.status, demoProject?.status);
  const totalLengthKm = toNumber(row.total_length_km, demoProject?.totalLengthKm ?? 0);
  const completedKm = toNumber(row.completed_length_km, demoProject?.completedKm ?? 0);
  const derivedProgress =
    totalLengthKm > 0 ? Math.round((completedKm / totalLengthKm) * 100) : demoProject?.progress ?? 0;

  // Read description and corridor_data from database if available
  const description = row.description != null ? String(row.description) : (demoProject?.description ?? "");
  let corridorData = demoProject?.corridor;
  if (row.corridor_data) {
    try {
      corridorData = typeof row.corridor_data === "string" ? JSON.parse(row.corridor_data) : (row.corridor_data as any);
    } catch (e) {
      console.error("Failed to parse corridor_data from database:", e);
    }
  }

  let storageMaterials: any[] = [];
  if (row.storage_materials) {
    try {
      storageMaterials = typeof row.storage_materials === "string" ? JSON.parse(row.storage_materials) : (row.storage_materials as any);
    } catch (e) {
      console.error("Failed to parse storage_materials from database:", e);
    }
  } else if (demoProject && (demoProject as any).storageMaterials) {
    storageMaterials = (demoProject as any).storageMaterials;
  }

  // Resolve direct GIS fields (prioritize database corridor_data first)
  const startLabel = (corridorData as any)?.startLabel || demoProject?.startLabel || "Start Position";
  const startCoords = (corridorData as any)?.startCoords || (corridorData as any)?.startCoordinates || demoProject?.startCoords || [toNumber(row.latitude, 10.0055), toNumber(row.longitude, 76.3082)];
  const endLabel = (corridorData as any)?.endLabel || demoProject?.endLabel || "End Position";
  const endCoords = (corridorData as any)?.endCoords || (corridorData as any)?.endCoordinates || demoProject?.endCoords || [toNumber(row.latitude, 10.0261), toNumber(row.longitude, 76.3084)];
  const hddPoints = (corridorData as any)?.hddPoints || demoProject?.hddPoints || [];
  const terminationPoints = (corridorData as any)?.terminationPoints || demoProject?.terminationPoints || [];
  const trenchingLine = (corridorData as any)?.trenchingLine || demoProject?.trenchingLine || [];
  const utilityPath = (corridorData as any)?.utilityPath || demoProject?.utilityPath || [];
  const roadChangeSegments = (corridorData as any)?.roadChangeSegments || demoProject?.roadChangeSegments || [];
  const hddSegments = (corridorData as any)?.hddSegments || demoProject?.hddSegments || [];
  const trenchingSegments = (corridorData as any)?.trenchingSegments || demoProject?.trenchingSegments || [];
  const distance = (corridorData as any)?.distance || demoProject?.distance || `${totalLengthKm} km`;

  return {
    id: id || demoProject?.id || `project-${Date.now()}`,
    code: code || demoProject?.code || buildProjectCode(name),
    name: name || demoProject?.name || "Telgo Project",
    type: String(row.project_type ?? demoProject?.type ?? "Enterprise Operations Project"),
    location: String(row.location ?? demoProject?.location ?? "Kerala"),
    client: String(row.client_name ?? demoProject?.client ?? "Telgo Client"),
    image: String(row.image_path ?? "").trim() || demoProject?.image || FALLBACK_PROJECT.image,
    status,
    progress: clampProgress(toNumber(row.progress, derivedProgress)),
    budget: toNumber(row.budget, demoProject?.budget ?? 0),
    spent: toNumber(row.spent, demoProject?.spent ?? 0),
    totalLengthKm,
    completedKm,
    startDate: normalizeDateText(row.start_date, demoProject?.startDate ?? ""),
    endDate: normalizeDateText(row.end_date, demoProject?.endDate ?? ""),
    manager: demoProject?.manager ?? formatPersonId(row.project_manager_id),
    siteInCharge: demoProject?.siteInCharge ?? formatPersonId(row.site_in_charge_id),
    coordinates: [
      toNumber(row.longitude, demoProject?.coordinates[0] ?? FALLBACK_PROJECT.coordinates[0]),
      toNumber(row.latitude, demoProject?.coordinates[1] ?? FALLBACK_PROJECT.coordinates[1])
    ],
    accent: demoProject?.accent ?? accentFromStatus(status),
    corridor: corridorData,

    // Direct GIS properties mapping for editor and maps
    description,
    distance,
    startLabel,
    startCoords,
    endLabel,
    endCoords,
    hddPoints,
    terminationPoints,
    trenchingLine,
    utilityPath,
    roadChangeSegments,
    hddSegments,
    trenchingSegments,
    storageMaterials
  };
}

function toProjectTablePayload(
  input: Partial<Project> & { id?: string },
  options: { allowPartial?: boolean } = {}
) {
  const allowPartial = options.allowPartial ?? false;
  const baseProject =
    (input.id ? demoProjects.find((project) => project.id === input.id) : null) ?? FALLBACK_PROJECT;
  const effective = {
    ...baseProject,
    ...input
  };

  const payload: Record<string, unknown> = {};
  const setField = (key: string, value: unknown) => {
    if (allowPartial) {
      if (value !== undefined) payload[key] = value;
      return;
    }
    payload[key] = value ?? null;
  };

  // Compile detailed GIS properties directly into corridor_data JSONB if present
  let corridorData = effective.corridor;
  if (!corridorData || Object.keys(corridorData).length === 0) {
    corridorData = {
      startLabel: effective.startLabel ?? baseProject.startLabel ?? "Start Position",
      endLabel: effective.endLabel ?? baseProject.endLabel ?? "End Position",
      startCoordinates: effective.startCoords || baseProject.startCoords || [effective.coordinates?.[1] || 10.0, effective.coordinates?.[0] || 76.3],
      endCoordinates: effective.endCoords || baseProject.endCoords || [effective.coordinates?.[1] || 10.0, effective.coordinates?.[0] || 76.3],
      startCoords: effective.startCoords || baseProject.startCoords || [effective.coordinates?.[1] || 10.0, effective.coordinates?.[0] || 76.3],
      endCoords: effective.endCoords || baseProject.endCoords || [effective.coordinates?.[1] || 10.0, effective.coordinates?.[0] || 76.3],
      totalMeters: Math.round(parseFloat(effective.distance || "0") * 1000) || 1000,
      completedMeters: Math.round((effective.completedKm ?? 0) * 1000),
      geofenceMeters: 150,
      progressUpdates: [],
      distance: effective.distance,
      hddPoints: effective.hddPoints || [],
      terminationPoints: effective.terminationPoints || [],
      trenchingLine: effective.trenchingLine || [],
      utilityPath: effective.utilityPath || [],
      roadChangeSegments: effective.roadChangeSegments || [],
      hddSegments: effective.hddSegments || [],
      trenchingSegments: effective.trenchingSegments || []
    } as any;
  }

  setField("id", effective.id ?? buildProjectSlug(effective.name ?? baseProject.name));
  setField("code", effective.code ?? buildProjectCode(effective.name ?? baseProject.name));
  setField("name", effective.name ?? baseProject.name);
  setField("client_name", effective.client ?? baseProject.client);
  setField("contract_type", "EPC");
  setField("project_type", effective.type ?? baseProject.type);
  setField("location", effective.location ?? baseProject.location);
  setField("district", deriveDistrict(effective.location ?? baseProject.location));
  setField("latitude", effective.coordinates?.[1] ?? baseProject.coordinates[1]);
  setField("longitude", effective.coordinates?.[0] ?? baseProject.coordinates[0]);
  setField("start_date", normalizeDateIso(effective.startDate));
  setField("end_date", normalizeDateIso(effective.endDate));
  setField("status", toDbStatus(effective.status));
  setField(
    "progress",
    clampProgress(
      typeof effective.progress === "number"
        ? effective.progress
        : deriveProgress(effective.totalLengthKm, effective.completedKm)
    )
  );
  setField("budget", effective.budget ?? baseProject.budget ?? 0);
  setField("spent", effective.spent ?? baseProject.spent ?? 0);
  setField("total_length_km", effective.totalLengthKm ?? baseProject.totalLengthKm ?? 0);
  setField("completed_length_km", effective.completedKm ?? baseProject.completedKm ?? 0);
  setField("image_path", effective.image ?? baseProject.image);
  setField("description", effective.description);
  setField("corridor_data", corridorData);
  setField("storage_materials", effective.storageMaterials || []);

  return payload;
}

function toDbStatus(status: ProjectStatus | undefined) {
  switch (status) {
    case "On Track":
      return "on_track";
    case "At Risk":
      return "at_risk";
    case "Completed":
      return "completed";
    case "Delayed":
      return "delayed";
    case "Active":
    default:
      return "active";
  }
}

function fromDbStatus(value: unknown, fallback: ProjectStatus = "Active"): ProjectStatus {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "on_track":
      return "On Track";
    case "at_risk":
      return "At Risk";
    case "completed":
      return "Completed";
    case "delayed":
    case "paused":
      return "Delayed";
    case "active":
      return "Active";
    default:
      return fallback;
  }
}

function accentFromStatus(status: ProjectStatus): StatusTone {
  switch (status) {
    case "Completed":
      return "blue";
    case "At Risk":
      return "amber";
    case "Delayed":
      return "red";
    case "On Track":
      return "green";
    case "Active":
    default:
      return "violet";
  }
}

function buildProjectSlug(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `project-${Date.now()}`;
}

function buildProjectCode(name: string) {
  const stem = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 6);
  return `TLGO-PRJ-${new Date().getFullYear()}-${stem || "OPS"}-${String(Date.now()).slice(-4)}`;
}

function deriveDistrict(location: string) {
  const parts = String(location).split(",").map((part) => part.trim()).filter(Boolean);
  return parts.at(-2) ?? parts.at(-1) ?? "Kerala";
}

function deriveProgress(totalLengthKm?: number, completedKm?: number) {
  const total = Number(totalLengthKm ?? 0);
  const completed = Number(completedKm ?? 0);
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(completed) || completed <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function normalizeDateIso(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeDateText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatPersonId(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "Not assigned";
  return text
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isMissingProjectsTableError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return [
    "could not find the table 'public.projects' in the schema cache",
    'relation "public.projects" does not exist',
    'relation "projects" does not exist'
  ].some((fragment) => message.includes(fragment));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}
