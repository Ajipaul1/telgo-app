"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Choice, ErrorNote, NumberInput, Saved, Select, TextArea, TextInput } from "@/components/ui";
import { RouteEditor } from "@/components/Map";
import { useApp } from "@/components/AppContext";
import { useDraft } from "@/lib/client/hooks";
import { call, ApiError } from "@/lib/client/api";
import { routeLengthM, type LatLng } from "@/lib/shared/geo";
import { metres } from "@/lib/shared/format";
import type { HddDefaults, ProjectStatus, ProjectView } from "@/lib/shared/project";

export const DISTRICTS = ["Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod", "Outside Kerala"];

type Form = {
  name: string; code: string; client: string; location: string; district: string; description: string; status: ProjectStatus;
  startDate: string; endDate: string; totalLengthKm: number | null; budget: number | null; standardWage: number | null; siteRadiusM: number | null;
  route: LatLng[]; startLabel: string; endLabel: string; hdd: HddDefaults;
};

const fromProject = (p?: ProjectView): Form => ({
  name: p?.name ?? "", code: p?.code ?? "", client: p?.client ?? "", location: p?.location ?? "", district: p?.district ?? "", description: p?.description ?? "",
  status: p?.status ?? "active", startDate: p?.startDate ?? "", endDate: p?.endDate ?? "", totalLengthKm: p?.totalLengthKm ?? null, budget: p?.budget ?? null,
  standardWage: p?.standardWage ?? null, siteRadiusM: p?.siteRadiusM ?? 300, route: p?.route ?? [], startLabel: p?.startLabel ?? "", endLabel: p?.endLabel ?? "",
  hdd: { machine: "", vendor: "", tracker: "", operator: "", ducts: "", rodLengthM: null, ...(p?.hddDefaults ?? {}) },
});

// one standard form for every project: basics, the route on the map, HDD defaults
export function ProjectForm({ project }: { project?: ProjectView }) {
  const router = useRouter();
  const { toast } = useApp();
  const [f, setF, clearDraft] = useDraft<Form>(project ? null : "telgo_draft_project_new", () => fromProject(project));
  const [version, setVersion] = useState(project?.updatedAt ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF((x) => ({ ...x, [k]: v })); setSavedAt(null); };
  const setHdd = (k: keyof HddDefaults, v: string | number | null) => set("hdd", { ...f.hdd, [k]: v });

  const save = async () => {
    setErr(null);
    const body = {
      name: f.name, code: f.code, client: f.client, location: f.location || f.district, district: f.district, description: f.description, status: f.status,
      startDate: f.startDate || null, endDate: f.endDate || null, totalLengthKm: f.totalLengthKm, budget: f.budget, standardWage: f.standardWage,
      siteRadiusM: f.siteRadiusM ?? 300, route: f.route, startLabel: f.startLabel, endLabel: f.endLabel, hddDefaults: f.hdd,
    };
    try {
      if (project) {
        const r = await call<{ project: ProjectView; serverTime: string }>(`/api/projects/${encodeURIComponent(project.id)}`, { method: "PATCH", body: { ...body, expected: version } });
        setVersion(r.project.updatedAt);
        setSavedAt(r.serverTime);
        toast("Project saved.");
      } else {
        const r = await call<{ project: ProjectView }>("/api/projects", { body });
        clearDraft();
        toast("Project added.");
        router.replace(`/app/projects/edit/${encodeURIComponent(r.project.id)}?saved=${encodeURIComponent(r.serverTime)}`);
      }
    } catch (e) { setErr(e as ApiError); }
  };

  return (
    <div className="stack loose" data-vm-editing="1">
      <div className="card">
        <h2>Basics</h2>
        <TextInput label="Project name" value={f.name} onChange={(v) => set("name", v)} testId="p-name" maxLength={120} />
        <TextInput label="Project code" value={f.code} onChange={(v) => set("code", v.toUpperCase())} hint="Letters and digits, like TLGO-PRJ-2026-0101. It must be unique." testId="p-code" maxLength={40} />
        <TextInput label="Client" value={f.client} onChange={(v) => set("client", v)} testId="p-client" placeholder="e.g. KSEB RDSS" />
        <TextInput label="Place" value={f.location} onChange={(v) => set("location", v)} testId="p-place" placeholder="Village or town" />
        <Select label="District" value={f.district} onChange={(v) => set("district", v)} placeholder="Choose the district" options={DISTRICTS.map((d) => ({ value: d, label: d }))} testId="p-district" />
        <TextArea label="About the work" value={f.description} onChange={(v) => set("description", v)} rows={3} testId="p-about" />
        <Choice label="Status" value={f.status} onChange={(v) => set("status", v)} options={[{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "completed", label: "Completed" }]} />
        <div className="grid2">
          <div className="field"><label htmlFor="p-start">Started</label><input id="p-start" className="input" type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
          <div className="field"><label htmlFor="p-end">Planned finish</label><input id="p-end" className="input" type="date" value={f.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
        </div>
        <div className="grid2">
          <NumberInput label="Total length" unit="km" value={f.totalLengthKm} onChange={(v) => set("totalLengthKm", v)} testId="p-length" />
          <NumberInput label="Budget" unit="₹" value={f.budget} onChange={(v) => set("budget", v)} testId="p-budget" />
        </div>
        <div className="grid2">
          <NumberInput label="Standard daily wage" unit="₹" value={f.standardWage} onChange={(v) => set("standardWage", v)} hint="Filled in on new reports; the supervisor can change it." testId="p-wage" />
          <NumberInput label="Site area" unit="m" value={f.siteRadiusM} onChange={(v) => set("siteRadiusM", v)} decimals={false} hint="Signing in farther than this from the route tells the admin." testId="p-radius" />
        </div>
      </div>

      <div className="card">
        <h2>Route on the map</h2>
        {project?.routeFromOldApp && <p className="small muted">This route was drawn in the old app. Saving here keeps it as the project&apos;s route.</p>}
        <RouteEditor points={f.route} onChange={(p) => set("route", p)} />
        <div className="grid2">
          <TextInput label="Start point name" value={f.startLabel} onChange={(v) => set("startLabel", v)} placeholder="e.g. Kolenchery junction" />
          <TextInput label="End point name" value={f.endLabel} onChange={(v) => set("endLabel", v)} placeholder="e.g. MOSC substation" />
        </div>
        {f.route.length > 1 && f.totalLengthKm ? <p className="tiny muted">The route measures {metres(routeLengthM(f.route))}; the total length entered is {f.totalLengthKm} km.</p> : null}
      </div>

      <div className="card">
        <h2>HDD defaults</h2>
        <p className="small muted">Filled in on a report&apos;s HDD part; the supervisor can change them.</p>
        <div className="grid2">
          <TextInput label="Machine" value={f.hdd.machine ?? ""} onChange={(v) => setHdd("machine", v)} />
          <TextInput label="Vendor / contractor" value={f.hdd.vendor ?? ""} onChange={(v) => setHdd("vendor", v)} />
          <TextInput label="Tracker / surveyor" value={f.hdd.tracker ?? ""} onChange={(v) => setHdd("tracker", v)} />
          <TextInput label="Operator" value={f.hdd.operator ?? ""} onChange={(v) => setHdd("operator", v)} />
          <TextInput label="Ducts / colour" value={f.hdd.ducts ?? ""} onChange={(v) => setHdd("ducts", v)} />
          <NumberInput label="Rod length" unit="m" value={f.hdd.rodLengthM ?? null} onChange={(v) => setHdd("rodLengthM", v)} />
        </div>
      </div>

      {err && <ErrorNote error={err} />}
      <Saved at={savedAt} />
      <Button big block onClick={save} busyText="Saving…" testId="p-save" disabled={!f.name.trim() || !f.code.trim() || !(f.location.trim() || f.district)}>{project ? "Save changes" : "Add the project"}</Button>
    </div>
  );
}
