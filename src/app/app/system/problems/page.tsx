"use client";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Empty, Loaded, Pill, TextInput } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtWhen } from "@/lib/shared/format";
import { useDebounced } from "@/app/app/team/_parts/parts";

type Problem = { id: string | number; ref: string | null; at: string; user_id: string | null; route: string | null; message: string | null; code: string | null; source: string | null };

const SOURCE: Record<string, string> = { server: "Server", phone: "Phone", client: "Phone" };

export default function Problems() {
  const [q, setQ] = useState("");
  const search = useDebounced(q.trim(), 400);
  const load = useLoad<{ items: Problem[] }>(`/api/system?view=problems${search ? `&q=${encodeURIComponent(search)}` : ""}`, { every: 30 });
  // the server sends the last 300; the search also looks through them here (reference, where, message, code)
  const t = search.toLowerCase();
  const hit = (p: Problem) => !t || [p.ref, p.route, p.message, p.code, p.source].some((x) => String(x ?? "").toLowerCase().includes(t));
  return (
    <Screen title="Problems" roles={["admin"]} testId="system-problems">
      <p className="small muted">Every failure a person was told about, newest first (the last 300). The reference (T-…) is the one they saw on their phone.</p>
      <TextInput label="Search" value={q} onChange={setQ} placeholder="Reference, screen or words" maxLength={80} testId="problems-search" />
      <Loaded load={load} isEmpty={(d) => !d.items.length} empty={<Empty title="No problems recorded">Nothing has gone wrong that anyone was told about.</Empty>}>
        {(d) => {
          const list = d.items.filter(hit);
          if (!list.length) return <Empty title="No problems match">Nothing with &ldquo;{search}&rdquo; in its reference, place, message or code.</Empty>;
          return (
            <>
              <div className="section-title">{list.length === 1 ? "1 problem" : `${list.length} problems`}</div>
              <div className="list" data-testid="problems-list">
                {list.map((p) => (
                  <div key={p.id} className="item" style={{ alignItems: "flex-start" }} data-testid="problem-row">
                    <div className="grow">
                      <div className="row between" style={{ alignItems: "flex-start" }}>
                        <div className="title" style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{p.ref || "no reference"}</div>
                        <Pill tone={p.source === "server" ? "bad" : "warn"}>{SOURCE[String(p.source)] ?? (p.source || "not recorded")}</Pill>
                      </div>
                      <div className="sub">{fmtWhen(p.at)}{p.code ? ` · code ${p.code}` : ""}</div>
                      <div className="small" style={{ overflowWrap: "anywhere", marginTop: 2 }}>{p.message || "No message recorded."}</div>
                      <div className="sub tiny" style={{ overflowWrap: "anywhere" }}>Where: {p.route || "not recorded"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}
