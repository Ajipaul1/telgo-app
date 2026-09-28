"use client";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, Loaded, Empty, Tabs, Select } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import type { ProjectView } from "@/lib/shared/project";
import { ItemCard, type Item } from "./_parts/common";

// Saved items: everything in inventory, newest first
export default function SavedItems() {
  const { me } = useApp();
  const [status, setStatus] = useState<"in_stock" | "closed" | "all">("in_stock");
  const [project, setProject] = useState("");
  const [q, setQ] = useState("");
  const projects = useLoad<{ projects: ProjectView[] }>("/api/projects");
  const load = useLoad<{ items: Item[] }>(`/api/inventory?status=${status}${project ? `&project=${encodeURIComponent(project)}` : ""}`, { every: 30 });
  const shown = (load.data?.items ?? []).filter((i) => !q || `${i.material} ${i.description ?? ""} ${i.location ?? ""} ${i.addedBy}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen title="Saved items" roles={["admin", "supervisor", "engineer", "finance"]} testId="inventory-list">
      {me?.role !== "finance" && <Button block href="/app/inventory/add" testId="inv-add-link">Add to inventory</Button>}
      <Tabs value={status} onChange={setStatus} tabs={[{ value: "in_stock", label: "In stock" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }]} />
      <Select label="Site" value={project} onChange={setProject} options={[{ value: "", label: "All sites" }, ...(projects.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
      <div className="field"><label htmlFor="inv-q">Search</label><input id="inv-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Item, place or person" /></div>
      <Loaded load={load} isEmpty={() => !shown.length} empty={<Empty title={q ? "Nothing matches" : status === "closed" ? "No closed items" : "Nothing in inventory yet"} />}>
        {() => <div className="stack">{shown.map((i) => <ItemCard key={i.id} it={i} />)}</div>}
      </Loaded>
    </Screen>
  );
}
