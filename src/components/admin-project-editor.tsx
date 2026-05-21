"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MobileCard,
  MobileInput,
  MobileShell
} from "@/components/mobile-kit";
import type { Project, ProjectStatus } from "@/lib/types";
import { getCurrentUser, useOpsStore } from "@/store/ops-store";

type ProjectDraft = {
  name: string;
  code: string;
  client: string;
  type: string;
  status: ProjectStatus;
  location: string;
  totalLengthKm: string;
  completedKm: string;
  progress: string;
  budget: string;
  spent: string;
  startDate: string;
  endDate: string;
  manager: string;
  siteInCharge: string;
  latitude: string;
  longitude: string;
  image: string;
};

const STATUS_OPTIONS: ProjectStatus[] = [
  "Active",
  "On Track",
  "At Risk",
  "Delayed",
  "Completed"
];

function buildDraft(project: Project | null, fallbackManager: string): ProjectDraft {
  return {
    name: project?.name ?? "",
    code: project?.code ?? "",
    client: project?.client ?? "",
    type: project?.type ?? "Infrastructure Operations Project",
    status: project?.status ?? "Active",
    location: project?.location ?? "",
    totalLengthKm: project ? String(project.totalLengthKm) : "",
    completedKm: project ? String(project.completedKm) : "",
    progress: project ? String(project.progress) : "",
    budget: project ? String(project.budget) : "",
    spent: project ? String(project.spent) : "",
    startDate: project?.startDate ?? "",
    endDate: project?.endDate ?? "",
    manager: project?.manager ?? fallbackManager,
    siteInCharge: project?.siteInCharge ?? "",
    latitude: project ? String(project.coordinates[1]) : "",
    longitude: project ? String(project.coordinates[0]) : "",
    image: project?.image ?? ""
  };
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toProjectPayload(projectId: string | undefined, draft: ProjectDraft): Partial<Project> & { id?: string } {
  return {
    id: projectId,
    name: draft.name.trim(),
    code: draft.code.trim(),
    client: draft.client.trim(),
    type: draft.type.trim(),
    status: draft.status,
    location: draft.location.trim(),
    totalLengthKm: toNumber(draft.totalLengthKm),
    completedKm: toNumber(draft.completedKm),
    progress: clampProgress(toNumber(draft.progress)),
    budget: toNumber(draft.budget),
    spent: toNumber(draft.spent),
    startDate: draft.startDate.trim(),
    endDate: draft.endDate.trim(),
    manager: draft.manager.trim(),
    siteInCharge: draft.siteInCharge.trim(),
    coordinates: [toNumber(draft.longitude), toNumber(draft.latitude)],
    image: draft.image.trim()
  };
}

function FieldSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-[#3f486f]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[44px] w-full rounded-[12px] border border-[#e3e6ee] bg-white px-3.5 text-[13px] font-medium text-[#11183d] outline-none focus:border-[#7b58ff]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminProjectEditorScreen({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const currentUser = useOpsStore((state) => getCurrentUser(state));
  const projectSyncStatus = useOpsStore((state) => state.projectSyncStatus);
  const project = useOpsStore((state) =>
    projectId ? state.managedProjects.find((item) => item.id === projectId) ?? null : null
  );
  const addProject = useOpsStore((state) => state.addProject);
  const updateProject = useOpsStore((state) => state.updateProject);
  const isEditing = Boolean(projectId);
  const fallbackManager = useMemo(
    () => currentUser.fullName || currentUser.designation || "TELGO Admin",
    [currentUser.designation, currentUser.fullName]
  );
  const [draft, setDraft] = useState<ProjectDraft>(() => buildDraft(project, fallbackManager));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    if (!project) return;
    setDraft(buildDraft(project, fallbackManager));
  }, [fallbackManager, isEditing, project]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = toProjectPayload(projectId, draft);
      const response = await fetch(
        isEditing ? `/api/mobile/projects/${projectId}` : "/api/mobile/projects",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; project?: Project }
        | null;

      if (!response.ok || !result?.ok || !result.project) {
        throw new Error(result?.message ?? "Project save failed.");
      }

      if (isEditing) {
        updateProject(result.project.id, result.project);
        setDraft(buildDraft(result.project, fallbackManager));
        setMessage("Project changes saved to Supabase.");
      } else {
        const createdProjectId = addProject(result.project);
        setMessage("Project created and added to the live admin portfolio.");
        router.replace(`/app/admin/projects/${createdProjectId}`);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Project save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing && !project) {
    return (
      <MobileShell
        role="admin"
        activeHref="/app/admin/projects"
        title="Edit Project"
        subtitle="Admin project management"
        backHref="/app/admin/projects"
        leftMode="back"
        bottomNav={false}
      >
        <MobileCard>
          <div className="space-y-3">
            <p className="text-[1rem] font-semibold text-[#17204c]">
              {projectSyncStatus === "syncing" || projectSyncStatus === "demo"
                ? "Loading project data from Supabase..."
                : "Project record could not be found."}
            </p>
            <p className="text-sm text-[#7480ae]">
              {projectSyncStatus === "syncing" || projectSyncStatus === "demo"
                ? "The project portfolio is still syncing into the admin workspace."
                : "Return to the projects module and reopen the project from the live list."}
            </p>
            <button
              type="button"
              onClick={() => router.push("/app/admin/projects")}
              className="inline-flex min-h-[46px] w-full items-center justify-center rounded-[12px] border border-[#cabdff] bg-white px-4 text-[0.94rem] font-bold text-[#5c2dff]"
            >
              Back to Projects
            </button>
          </div>
        </MobileCard>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      role="admin"
      activeHref="/app/admin/projects"
      title={isEditing ? "Edit Project" : "Add New Project"}
      subtitle={isEditing ? "Update a real project record" : "Create a real Supabase project"}
      backHref="/app/admin/projects"
      leftMode="back"
      bottomNav={false}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <MobileCard>
          <div className="mb-4">
            <h2 className="text-[1rem] font-semibold text-[#17204c]">Project Identity</h2>
            <p className="mt-1 text-sm text-[#7480ae]">
              Admin controls here drive the same project record used across engineer, supervisor, client, and finance views.
            </p>
          </div>
          <div className="space-y-4">
            <MobileInput
              label="Project Name"
              placeholder="Enter project name"
              value={draft.name}
              onChange={(event) => setDraft((state) => ({ ...state, name: event.target.value }))}
            />
            <MobileInput
              label="Project Code"
              placeholder="TLGO-PRJ-2026-OPS"
              value={draft.code}
              onChange={(event) => setDraft((state) => ({ ...state, code: event.target.value }))}
            />
            <MobileInput
              label="Client"
              placeholder="Enter client name"
              value={draft.client}
              onChange={(event) => setDraft((state) => ({ ...state, client: event.target.value }))}
            />
            <MobileInput
              label="Project Type"
              placeholder="Infrastructure Operations Project"
              value={draft.type}
              onChange={(event) => setDraft((state) => ({ ...state, type: event.target.value }))}
            />
            <FieldSelect
              label="Project Status"
              value={draft.status}
              onChange={(value) => setDraft((state) => ({ ...state, status: value as ProjectStatus }))}
              options={STATUS_OPTIONS}
            />
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-4">
            <h2 className="text-[1rem] font-semibold text-[#17204c]">Delivery Controls</h2>
            <p className="mt-1 text-sm text-[#7480ae]">
              These values power progress cards, route maps, work tracking, and role-based project dashboards.
            </p>
          </div>
          <div className="space-y-4">
            <MobileInput
              label="Location"
              placeholder="City, State"
              value={draft.location}
              onChange={(event) => setDraft((state) => ({ ...state, location: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <MobileInput
                label="Total Distance (KM)"
                type="number"
                placeholder="0"
                value={draft.totalLengthKm}
                onChange={(event) => setDraft((state) => ({ ...state, totalLengthKm: event.target.value }))}
              />
              <MobileInput
                label="Completed KM"
                type="number"
                placeholder="0"
                value={draft.completedKm}
                onChange={(event) => setDraft((state) => ({ ...state, completedKm: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MobileInput
                label="Progress %"
                type="number"
                placeholder="0"
                value={draft.progress}
                onChange={(event) => setDraft((state) => ({ ...state, progress: event.target.value }))}
              />
              <MobileInput
                label="Project Image URL"
                placeholder="/assets/project.jpg"
                value={draft.image}
                onChange={(event) => setDraft((state) => ({ ...state, image: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MobileInput
                label="Manager"
                placeholder="Project manager"
                value={draft.manager}
                onChange={(event) => setDraft((state) => ({ ...state, manager: event.target.value }))}
              />
              <MobileInput
                label="Site In-Charge"
                placeholder="Site in-charge"
                value={draft.siteInCharge}
                onChange={(event) => setDraft((state) => ({ ...state, siteInCharge: event.target.value }))}
              />
            </div>
          </div>
        </MobileCard>

        <MobileCard>
          <div className="mb-4">
            <h2 className="text-[1rem] font-semibold text-[#17204c]">Finance and Timeline</h2>
            <p className="mt-1 text-sm text-[#7480ae]">
              Budget and schedule changes feed the admin control center and the role dashboards downstream.
            </p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MobileInput
                label="Budget"
                type="number"
                placeholder="0"
                value={draft.budget}
                onChange={(event) => setDraft((state) => ({ ...state, budget: event.target.value }))}
              />
              <MobileInput
                label="Spent"
                type="number"
                placeholder="0"
                value={draft.spent}
                onChange={(event) => setDraft((state) => ({ ...state, spent: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MobileInput
                label="Start Date"
                type="date"
                value={draft.startDate}
                onChange={(event) => setDraft((state) => ({ ...state, startDate: event.target.value }))}
              />
              <MobileInput
                label="End Date"
                type="date"
                value={draft.endDate}
                onChange={(event) => setDraft((state) => ({ ...state, endDate: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MobileInput
                label="Latitude"
                type="number"
                placeholder="9.9312"
                value={draft.latitude}
                onChange={(event) => setDraft((state) => ({ ...state, latitude: event.target.value }))}
              />
              <MobileInput
                label="Longitude"
                type="number"
                placeholder="76.2673"
                value={draft.longitude}
                onChange={(event) => setDraft((state) => ({ ...state, longitude: event.target.value }))}
              />
            </div>
          </div>
        </MobileCard>

        {message ? <p className="text-sm font-semibold text-[#18aa5d]">{message}</p> : null}
        {error ? <p className="text-sm font-semibold text-[#ff4f63]">{error}</p> : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push("/app/admin/projects")}
            className="inline-flex min-h-[46px] w-full items-center justify-center rounded-[12px] border border-[#cabdff] bg-white px-4 text-[0.94rem] font-bold text-[#5c2dff]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-[46px] w-full items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#7138ff_0%,#5322ef_100%)] px-4 text-[0.94rem] font-bold text-white shadow-[0_12px_24px_rgba(92,45,255,0.2)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : isEditing ? "Save Project" : "Create Project"}
          </button>
        </div>
      </form>
    </MobileShell>
  );
}
