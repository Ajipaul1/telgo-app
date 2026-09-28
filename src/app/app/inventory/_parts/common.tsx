"use client";
import { Pill, PicThumb } from "@/components/ui";
import { fmtDay, fmtWhen, numIN } from "@/lib/shared/format";

export type Item = {
  id: string; projectId: string; projectName: string | null; day: string; material: string; description: string | null;
  quantity: number | null; quantityLeft: number | null; unit: string | null; location: string | null; lat: number | null; lng: number | null;
  note: string | null; photoFileId: string | null; status: "in_stock" | "closed"; closedAt: string | null; lastChangeAt: string | null;
  addedBy: string; addedById: string; addedAt: string; updatedAt: string; pendingChanges: number;
};
export type Change = {
  id: string; itemId: string; kind: "moved" | "used" | "closed"; quantityUsed: number | null; newLocation: string | null; newLat: number | null; newLng: number | null;
  note: string | null; photoFileId: string | null; requestedBy: string; requestedById: string; requestedAt: string;
  status: "pending" | "approved" | "rejected"; decidedBy: string | null; decidedAt: string | null; decisionNote: string | null;
};

export const UNITS = ["m", "km", "nos", "drums", "rolls", "bags", "kg", "litres", "sets", "boxes"];
export const COMMON_ITEMS = ["Cable 11 kV", "Cable 33 kV", "LT cable", "HDPE duct", "Cable drum", "Joint kit", "Termination kit", "RMU", "Transformer", "Earthing material", "Warning tape", "Route marker", "Sand", "Cement"];

export const qty = (n: number | null, unit: string | null) => (n === null ? "—" : `${numIN(n)}${unit ? ` ${unit}` : ""}`);

export function changeWords(c: Pick<Change, "kind" | "quantityUsed" | "newLocation">, unit: string | null) {
  if (c.kind === "moved") return `Moved to ${c.newLocation || "a new place"}`;
  if (c.kind === "used") return `Used ${qty(c.quantityUsed, unit)}`;
  return "Fully used: close it";
}

export function ItemCard({ it }: { it: Item }) {
  return (
    <a className={"card" + (it.pendingChanges ? " line-warn" : it.status === "closed" ? "" : " line-info")} href={`/app/inventory/item/${it.id}`} data-testid="inventory-item">
      <div className="row" style={{ alignItems: "flex-start" }}>
        {it.photoFileId ? <PicThumb pic={{ fileId: it.photoFileId, mime: "image/jpeg" }} label={it.material} /> : <span className="thumb pdf" style={{ color: "var(--faint)", fontWeight: 600 }}>No photo</span>}
        <div className="grow stack tight" style={{ minWidth: 0 }}>
          <div className="row between"><b className="ellipsis">{it.material}</b>{it.status === "closed" ? <Pill>Closed</Pill> : it.pendingChanges ? <Pill tone="warn">Waiting for approval</Pill> : <Pill tone="ok">In stock</Pill>}</div>
          <span className="small">{it.quantity !== null ? `${qty(it.quantityLeft, it.unit)} left of ${qty(it.quantity, it.unit)}` : "Quantity not given"}</span>
          <span className="small muted ellipsis">{it.location ?? "—"} · {it.projectName ?? it.projectId}</span>
          <span className="tiny muted">Added {fmtDay(it.day)} by {it.addedBy}{it.lastChangeAt ? ` · changed ${fmtWhen(it.lastChangeAt)}` : ""}</span>
        </div>
      </div>
    </a>
  );
}
