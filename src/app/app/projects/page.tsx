"use client";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Loaded, Empty, Pill, Button } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtDay, metres, money } from "@/lib/shared/format";
import { STATUS_LABEL, pct, type ProjectView, type Totals } from "@/lib/shared/project";

type P = ProjectView & { totals: Totals };

export default function Projects() {
  const { me } = useApp();
  const load = useLoad<{ projects: P[] }>("/api/projects", { every: 60 });
  const money_ = me?.role === "admin" || me?.role === "finance";
  return (
    <Screen title={me?.role === "client" ? "Projects" : "All projects"} testId="projects">
      {me?.role === "admin" && <Button kind="ghost" block href="/app/projects/edit">Edit projects</Button>}
      <Loaded load={load} isEmpty={(d) => !d.projects.length} empty={<Empty title="No projects yet">{me?.role === "admin" ? "Add one in Edit projects." : me?.role === "client" ? "No project has been shared with you yet." : "The admin adds projects."}</Empty>}>
        {(d) => (
          <div className="stack" data-testid="projects-list">
            {d.projects.map((p) => {
              const laid = pct(p.totals.cableLayingM, p.totalLengthKm);
              return (
                <a key={p.id} className="card" href={`/app/projects/${p.id}`}>
                  <div className="row between"><h2 className="ellipsis">{p.name}</h2><Pill tone={p.status === "active" ? "ok" : p.status === "paused" ? "warn" : undefined}>{STATUS_LABEL[p.status]}</Pill></div>
                  <p className="small muted">{[p.code, p.client, p.district].filter(Boolean).join(" · ")}</p>
                  <dl className="kv">
                    <dt>Cable laid</dt><dd>{metres(p.totals.cableLayingM)}{p.totalLengthKm ? ` of ${p.totalLengthKm} km${laid !== null ? ` (${laid}%)` : ""}` : ""}</dd>
                    <dt>Trenching · HDD</dt><dd>{metres(p.totals.trenchingM)} · {metres(p.totals.hddM)}</dd>
                    {money_ && <><dt>Spent (approved reports)</dt><dd>{money(p.totals.spent)}</dd></>}
                    <dt>Last work day</dt><dd>{fmtDay(p.totals.lastDay)}</dd>
                  </dl>
                  {!p.route.length && <p className="tiny muted">No route on the map yet.</p>}
                </a>
              );
            })}
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
