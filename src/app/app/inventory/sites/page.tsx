"use client";
import { Fragment, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Loaded, Empty, Select, Tabs } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import type { ProjectView } from "@/lib/shared/project";
import { ItemCard, qty, type Item } from "../_parts/common";

// Site inventory: one site at a time, everything there (in stock and closed), each with its history
function Body() {
  const q = useSearchParams();
  const [project, setProject] = useState(q.get("project") ?? "");
  const [tab, setTab] = useState<"in_stock" | "closed">("in_stock");
  const projects = useLoad<{ projects: ProjectView[] }>("/api/projects");
  const load = useLoad<{ items: Item[] }>(project ? `/api/inventory?status=all&project=${encodeURIComponent(project)}` : null, { every: 30 });
  const items = load.data?.items ?? [];
  const inStock = items.filter((i) => i.status === "in_stock");
  const closed = items.filter((i) => i.status === "closed");
  // totals per item name and unit (what is at the site now)
  const totals = new Map<string, number>();
  for (const i of inStock) if (i.quantityLeft !== null) totals.set(`${i.material}|${i.unit ?? ""}`, (totals.get(`${i.material}|${i.unit ?? ""}`) ?? 0) + i.quantityLeft);
  return (
    <>
      <Select label="Site" value={project} onChange={setProject} placeholder="Choose a site" testId="site-inv-project" options={(projects.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))} />
      {!project ? <Empty title="Choose a site">See everything at that site, what is left and what was used.</Empty> : (
        <Loaded load={load} isEmpty={(d) => !d.items.length} empty={<Empty title="Nothing in inventory at this site yet" />}>
          {() => (
            <>
              <div className="grid2">
                <div className="stat"><b>{inStock.length}</b><span>Items in stock</span></div>
                <div className="stat"><b>{closed.length}</b><span>Closed (used up)</span></div>
              </div>
              {totals.size > 0 && (
                <div className="card">
                  <h3>At the site now</h3>
                  <dl className="kv">{[...totals].map(([k, v]) => { const [m, u] = k.split("|"); return <Fragment key={k}><dt>{m}</dt><dd>{qty(v, u || null)}</dd></Fragment>; })}</dl>
                </div>
              )}
              <Tabs value={tab} onChange={setTab} tabs={[{ value: "in_stock", label: `In stock (${inStock.length})` }, { value: "closed", label: `Closed (${closed.length})` }]} />
              <div className="stack">{(tab === "in_stock" ? inStock : closed).map((i) => <ItemCard key={i.id} it={i} />)}</div>
              {(tab === "in_stock" ? inStock : closed).length === 0 && <Empty title={tab === "closed" ? "Nothing closed yet" : "Nothing in stock"} />}
            </>
          )}
        </Loaded>
      )}
    </>
  );
}

export default function SiteInventory() {
  return (
    <Screen title="Site inventory" roles={["admin", "supervisor", "engineer", "finance"]} testId="site-inventory">
      <Suspense><Body /></Suspense>
    </Screen>
  );
}
