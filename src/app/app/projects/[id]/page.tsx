"use client";
import { Fragment, use, useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Loaded, Pill, Button, Empty, ErrorNote } from "@/components/ui";
import { MapView, OpenInGoogleMaps } from "@/components/Map";
import { projectMap } from "@/components/projectMap";
import { useLoad } from "@/lib/client/hooks";
import { call, ApiError } from "@/lib/client/api";
import { fmtDay, fmtWhen, metres, money, numIN } from "@/lib/shared/format";
import { STATUS_LABEL, pct, type ProjectView, type Totals } from "@/lib/shared/project";
import { planTotals } from "@/lib/shared/plan";

type Data = { project: ProjectView; totals: Totals; materials: { id: string; unloaded_on: string; material: string; quantity: number | null; unit: string | null; location: string | null; created_by_name: string }[] };


export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useApp();
  const load = useLoad<Data>(`/api/projects/${encodeURIComponent(id)}`, { every: 120 });
  const money_ = me?.role === "admin" || me?.role === "finance";
  return (
    <Screen title="Project" testId="project">
      <Loaded load={load}>
        {({ project: p, totals: t, materials }) => {
          const m = projectMap(p);
          const laid = pct(t.cableLayingM, p.totalLengthKm);
          return (
            <>
              <div className="card">
                <div className="row between"><h1 className="ellipsis">{p.name}</h1><Pill tone={p.status === "active" ? "ok" : p.status === "paused" ? "warn" : undefined}>{STATUS_LABEL[p.status]}</Pill></div>
                <dl className="kv">
                  <dt>Code</dt><dd>{p.code}</dd>
                  <dt>Client</dt><dd>{p.client ?? "—"}</dd>
                  <dt>Place</dt><dd>{[p.location, p.district].filter(Boolean).join(", ") || "—"}</dd>
                  <dt>Started</dt><dd>{fmtDay(p.startDate)}</dd>
                  <dt>Planned finish</dt><dd>{fmtDay(p.endDate)}</dd>
                  <dt>Total length</dt><dd>{p.totalLengthKm ? `${p.totalLengthKm} km` : "—"}</dd>
                  <dt>Route on the map</dt><dd>{p.route.length > 1 ? metres(p.routeLengthM) : "not drawn"}</dd>
                  <dt>Site area</dt><dd>{p.siteRadiusM} m around the route</dd>
                  {money_ && <><dt>Budget (entered by the admin)</dt><dd>{p.budget ? money(p.budget) : "—"}</dd></>}
                </dl>
                {p.description && <p className="small">{p.description}</p>}
                {me?.role === "admin" && <Button kind="ghost" block href={`/app/projects/edit/${encodeURIComponent(p.id)}`}>Edit this project</Button>}
              </div>

              {p.route.length ? (
                <MapView pins={m.pins} lines={m.lines} circles={p.route.length === 1 ? [{ at: p.route[0], radiusM: p.siteRadiusM }] : []} testId="project-map"><OpenInGoogleMaps at={p.route[0]} label={p.route.length > 1 ? "Start in Google Maps" : "Open in Google Maps"} /></MapView>
              ) : <Empty title="No route on the map yet">{me?.role === "admin" ? "Draw it in Edit projects." : "The admin draws the route."}</Empty>}
              {p.routeFromOldApp && <p className="tiny muted">This route was drawn in the old app.</p>}

              <PlanCard p={p} t={t} />

              <div className="section-title">Work done (approved reports)</div>
              <div className="grid2">
                <div className="stat"><b>{metres(t.cableLayingM)}</b><span>Cable laid{laid !== null ? ` · ${laid}%` : ""}</span></div>
                <div className="stat"><b>{metres(t.trenchingM)}</b><span>Trenching</span></div>
                <div className="stat"><b>{metres(t.hddM)}</b><span>HDD</span></div>
                <div className="stat"><b>{metres(t.cableMountingM)}</b><span>Cable mounting</span></div>
                <div className="stat"><b>{numIN(t.joints, 0)}</b><span>Joints</span></div>
                <div className="stat"><b>{numIN(t.rmu, 0)} · {numIN(t.terminations, 0)}</b><span>RMU · terminations</span></div>
              </div>
              <p className="tiny muted">{t.reports} approved reports · {t.days} work days · last {fmtDay(t.lastDay)}</p>
              {money_ && (
                <div className="card">
                  <h3>Spent so far (approved reports)</h3>
                  <dl className="kv">
                    <dt>Wages</dt><dd>{money(t.wages)}</dd><dt>Fuel</dt><dd>{money(t.fuel)}</dd><dt>Travel</dt><dd>{money(t.travel)}</dd>
                    <dt>Room rent</dt><dd>{money(t.roomRent)}</dd><dt>Tool rent</dt><dd>{money(t.toolRent)}</dd><dt>Other</dt><dd>{money(t.other)}</dd>
                    <dt><b>Total</b></dt><dd>{money(t.spent)}</dd>
                    {p.budget ? <><dt>Left of the budget</dt><dd>{money(p.budget - t.spent)}</dd></> : null}
                  </dl>
                </div>
              )}

              {me?.role !== "client" && (
                <>
                  <div className="section-title">Latest inventory at this site</div>
                  {materials.length ? (
                    <div className="list">
                      {materials.map((x) => (
                        <a key={x.id} className="item" href={`/app/inventory/item/${x.id}`}>
                          <div className="grow"><div className="title">{x.material}</div><div className="sub">{x.quantity !== null ? `${numIN(x.quantity)} ${x.unit ?? ""} · ` : ""}{x.location ?? ""} · {fmtDay(x.unloaded_on)} by {x.created_by_name}</div></div>
                        </a>
                      ))}
                    </div>
                  ) : <Empty title="Nothing in inventory here yet" />}
                  <Button kind="ghost" block href={`/app/inventory/sites?project=${encodeURIComponent(p.id)}`}>Open the site inventory</Button>
                </>
              )}
              {me?.role === "admin" && <ClientAccess projectId={p.id} />}
              <p className="tiny muted center">Updated {fmtWhen(p.updatedAt)}</p>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}

// which client logins can see this project (admin)
function ClientAccess({ projectId }: { projectId: string }) {
  const load = useLoad<{ clients: { id: string; fullName: string; loginId: string; sharedAt: string | null }[] }>(`/api/projects/${encodeURIComponent(projectId)}/access`);
  const [err, setErr] = useState<ApiError | null>(null);
  return (
    <div className="card">
      <h3>Shared with clients</h3>
      <p className="small muted">A client login sees only the projects shared here, and never the money.</p>
      <Loaded load={load} isEmpty={(d) => !d.clients.length} empty={<p className="small muted">There are no client logins yet (add one in Team → Employees).</p>}>
        {(d) => (
          <div className="stack tight">
            {d.clients.map((c) => (
              <label key={c.id} className="check">
                <input type="checkbox" checked={!!c.sharedAt} onChange={async (e) => {
                  setErr(null);
                  try {
                    const r = await call<{ sharedAt: string | null }>(`/api/projects/${encodeURIComponent(projectId)}/access`, { body: { userId: c.id, share: e.target.checked } });
                    load.set((x) => x && { clients: x.clients.map((y) => (y.id === c.id ? { ...y, sharedAt: r.sharedAt } : y)) });
                  } catch (e2) { setErr(e2 as ApiError); }
                }} />
                <span>{c.fullName} <span className="muted small">({c.loginId})</span></span>
              </label>
            ))}
          </div>
        )}
      </Loaded>
      {err && <ErrorNote error={err} />}
    </div>
  );
}

// planned on the map, against done in the approved reports (open trench = trenching, HDD, cable laying)
function PlanCard({ p, t }: { p: ProjectView; t: Totals }) {
  const pt = planTotals(p.plan);
  if (!pt.types.length) return null;
  const done: Record<string, number> = { "Open trench": t.trenchingM, HDD: t.hddM, "Cable laying": t.cableLayingM };
  return (
    <div className="card" data-testid="project-plan">
      <h2>Work plan on the map</h2>
      <dl className="kv">
        <dt><b>Whole route</b></dt><dd><b>{metres(pt.routeM)}</b></dd>
        {pt.types.map((x) => {
          const d = done[x.type];
          const share = d !== undefined && x.lengthM > 0 ? Math.min(100, Math.round((d / x.lengthM) * 100)) : null;
          return (
            <Fragment key={x.type}>
              <dt><span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: x.color, marginRight: 6 }} />{x.type}</dt>
              <dd>{metres(x.lengthM)} planned{d !== undefined ? ` · ${metres(d)} done${share !== null ? ` (${share}%)` : ""}` : ""}</dd>
            </Fragment>
          );
        })}
        {pt.routeM > 0 && <><dt>Not planned yet</dt><dd>{metres(pt.notPlannedM)}</dd></>}
      </dl>
      {!p.planSaved && <p className="tiny muted">From the old app&apos;s drawing. The admin can redraw it along the roads in Edit projects.</p>}
    </div>
  );
}
