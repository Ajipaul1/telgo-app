"use client";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Empty, Loaded, Pill, TextInput } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtWhen } from "@/lib/shared/format";
import { useDebounced } from "@/app/app/team/_parts/parts";

type Change = { id: string | number; at: string; actor: string | null; actorName: string | null; table_name: string; row_id: string | null; action: string; changes: Record<string, unknown> | null };

const WHAT: Record<string, string> = {
  pending_daily_reports: "Daily report",
  mobile_app_users: "Person",
  projects: "Project",
  mobile_attendance: "Attendance",
  site_materials: "Inventory item",
  inventory_changes: "Inventory request",
  project_access: "Project sharing",
};
const DID: Record<string, string> = { insert: "added", update: "changed", delete: "deleted" };
const TONE: Record<string, "ok" | "info" | "bad"> = { insert: "ok", update: "info", delete: "bad" };

const field = (k: string) => k.replace(/_/g, " ");
function val(v: unknown) {
  const t = v === null || v === undefined ? "—" : typeof v === "string" ? (v === "" ? "(empty)" : v) : JSON.stringify(v);
  return t.length > 60 ? t.slice(0, 60) + "…" : t;
}

// the search box takes words ("person", "report") as well as the table names the log keeps
function toQuery(s: string) {
  const t = s.toLowerCase();
  if (!t) return "";
  const hit = Object.entries(WHAT).find(([, w]) => w.toLowerCase().includes(t));
  return hit ? hit[0] : s;
}

// the record's own name, when the log has it (a new person's name, a project's name …)
const NAME_KEYS = ["full_name", "name", "material", "user_name", "supervisor_name", "requested_by_name", "original_name", "title"];
function recordName(c: Change) {
  const ch = c.changes ?? {};
  for (const k of NAME_KEYS) {
    const v = ch[k];
    if (typeof v === "string" && v) return v;
    if (Array.isArray(v) && typeof v[1] === "string" && v[1]) return v[1];
  }
  return null;
}

function Fields({ c }: { c: Change }) {
  const entries = Object.entries(c.changes ?? {});
  if (!entries.length) return <div className="sub tiny">No field details recorded.</div>;
  if (c.action === "update") {
    return (
      <ul className="small" style={{ margin: "4px 0 0", paddingLeft: 18, overflowWrap: "anywhere" }}>
        {entries.map(([k, v]) => (
          <li key={k}>
            <b>{field(k)}</b>: {Array.isArray(v) && v.length === 2 ? <>{val(v[0])} → {val(v[1])}</> : v === "changed" ? "changed (the value is never copied)" : val(v)}
          </li>
        ))}
      </ul>
    );
  }
  return <div className="sub tiny" style={{ overflowWrap: "anywhere" }}>Fields: {entries.map(([k]) => field(k)).join(", ")}</div>;
}

export default function Changes() {
  const [q, setQ] = useState("");
  const search = useDebounced(toQuery(q.trim()), 400);
  const load = useLoad<{ items: Change[] }>(`/api/system?view=changes${search ? `&q=${encodeURIComponent(search)}` : ""}`, { every: 30 });
  return (
    <Screen title="Change log" roles={["admin"]} testId="system-changes">
      <p className="small muted">Every change the database made, newest first (the last 300). Nobody can edit or delete this log. Passwords are never copied into it.</p>
      <TextInput label="Search" value={q} onChange={setQ} placeholder="Person, Project … or a record number" maxLength={80} testId="changes-search" />
      <Loaded load={load} isEmpty={(d) => !d.items.length} empty={<Empty title={search ? "No changes match" : "No changes recorded yet"} />}>
        {(d) => (
          <>
            <div className="section-title">{d.items.length === 1 ? "1 change" : `${d.items.length} changes`}</div>
            <div className="list" data-testid="changes-list">
              {d.items.map((c) => {
                const name = recordName(c);
                return (
                <div key={c.id} className="item" style={{ alignItems: "flex-start" }} data-testid="change-row">
                  <div className="grow">
                    <div className="row between" style={{ alignItems: "flex-start" }}>
                      <div className="title grow" style={{ overflowWrap: "anywhere" }}>{WHAT[c.table_name] ?? c.table_name}{name ? `: ${name.length > 60 ? name.slice(0, 60) + "…" : name}` : ""}</div>
                      <Pill tone={TONE[c.action]}>{DID[c.action] ?? c.action}</Pill>
                    </div>
                    <div className="sub">{fmtWhen(c.at)} · by {c.actor ? c.actorName || "a person no longer listed" : "System"}</div>
                    {c.row_id && <div className="sub tiny ellipsis">Record {c.row_id}</div>}
                    <Fields c={c} />
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}
      </Loaded>
    </Screen>
  );
}
