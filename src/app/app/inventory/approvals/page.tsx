"use client";
import { Screen } from "@/components/Screen";
import { Loaded, Empty } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { ItemCard, type Change, type Item } from "../_parts/common";
import { ChangeRow } from "../_parts/History";

// Approvals (admin): inventory changes waiting, oldest first, each with its item
export default function Approvals() {
  const load = useLoad<{ requests: (Change & { item: Item | null })[] }>("/api/inventory/approvals", { every: 20 });
  return (
    <Screen title="Approvals" roles={["admin"]} testId="inventory-approvals">
      <p className="small muted">Nothing about an item changes until you approve. The person who asked is told either way.</p>
      <Loaded load={load} isEmpty={(d) => !d.requests.length} empty={<Empty title="Nothing waiting" />}>
        {(d) => (
          <div className="stack loose">
            {d.requests.map((r) => (
              <div key={r.id} className="stack tight">
                {r.item && <ItemCard it={r.item} />}
                <ChangeRow c={r} unit={r.item?.unit ?? null} onDecided={load.reload} />
              </div>
            ))}
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
