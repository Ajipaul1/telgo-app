"use client";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, Empty, ErrorNote, Loaded, Select, Sheet, Tabs, TextInput } from "@/components/ui";
import { call, ApiError } from "@/lib/client/api";
import { useLoad } from "@/lib/client/hooks";
import { fmtDay, fmtTime, fmtWhen, numIN } from "@/lib/shared/format";
import { STATUS_WORDS, type ReportStatus } from "@/lib/shared/report";
import { roleLabel, useDebounced } from "@/app/app/team/_parts/parts";

type Kind = "reports" | "attendance" | "inventory" | "changes" | "projects" | "files" | "chats" | "people";
type Tab = "active" | "archived" | "trash";
type Action = "archive" | "unarchive" | "trash" | "restore";
type Row = Record<string, unknown>;
type Item = { id: string; row: Row; archivedAt: string | null; trashedAt: string | null; goneOn: string | null };

const KINDS: { value: Kind; label: string }[] = [
  { value: "reports", label: "Daily reports" },
  { value: "attendance", label: "Attendance" },
  { value: "inventory", label: "Inventory items" },
  { value: "changes", label: "Inventory requests" },
  { value: "projects", label: "Projects" },
  { value: "files", label: "Photos and files" },
  { value: "chats", label: "Chats" },
  { value: "people", label: "People" },
];
const KIND_ONE: Record<Kind, string> = {
  reports: "daily report", attendance: "attendance record", inventory: "inventory item", changes: "inventory request",
  projects: "project", files: "file", chats: "chat", people: "person",
};
const TABS: { value: Tab; label: string }[] = [{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }, { value: "trash", label: "Trash" }];

const ATT_WORDS: Record<string, string> = { signed_in: "signed in", signed_out: "signed out", missed_sign_out: "didn't sign out", checked_in: "old app mark", checked_out: "old app sign-out" };
const INV_WORDS: Record<string, string> = { in_stock: "in stock", closed: "closed (used up)" };
const CHANGE_KIND: Record<string, string> = { moved: "Moved", used: "Used", closed: "Closed" };
const CHANGE_STATUS: Record<string, string> = { pending: "waiting for approval", approved: "approved", rejected: "not approved" };
const PEOPLE_STATUS: Record<string, string> = { active: "active", pending: "waiting", blocked: "blocked" };

const s = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v));
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

// a meaningful title and line for each kind of record
function describe(kind: Kind, r: Row): { title: string; sub: string } {
  switch (kind) {
    case "reports":
      return { title: s(r.supervisor_name) || "Name not recorded", sub: join(r.report_date ? fmtDay(s(r.report_date)) : "day not recorded", STATUS_WORDS[r.status as ReportStatus] ?? s(r.status), s(r.project_id) && `project ${s(r.project_id)}`) };
    case "attendance":
      return { title: s(r.user_name) || "Name not recorded", sub: join(s(r.project_name) || "site not recorded", r.check_in_at ? `in ${fmtWhen(s(r.check_in_at))}` : "time not recorded", ATT_WORDS[s(r.status)] ?? s(r.status)) };
    case "inventory": {
      const qty = r.quantity === null || r.quantity === undefined ? "quantity not recorded" : `${numIN(Number(r.quantity))}${s(r.unit) ? " " + s(r.unit) : ""}`;
      return { title: s(r.material) || "Material not recorded", sub: join(qty, s(r.location) || "place not recorded", INV_WORDS[s(r.status)] ?? s(r.status)) };
    }
    case "changes":
      return { title: `${CHANGE_KIND[s(r.kind)] ?? (s(r.kind) || "Request")}${r.quantity_used !== null && r.quantity_used !== undefined ? ` ${numIN(Number(r.quantity_used))}` : ""}${s(r.new_location) ? ` to ${s(r.new_location)}` : ""}`,
        sub: join(s(r.requested_by_name) ? `asked by ${s(r.requested_by_name)}` : "asker not recorded", r.requested_at ? fmtWhen(s(r.requested_at)) : null, CHANGE_STATUS[s(r.status)] ?? s(r.status)) };
    case "projects":
      return { title: s(r.name) || "Name not recorded", sub: join(s(r.code) ? `code ${s(r.code)}` : "no code", s(r.client_name) ? `client ${s(r.client_name)}` : "client not recorded") };
    case "files": {
      const kb = r.bytes === null || r.bytes === undefined ? "size not recorded" : `${numIN(Math.max(1, Math.round(Number(r.bytes) / 1024)), 0)} KB`;
      return { title: s(r.original_name) || "File name not recorded", sub: join(s(r.kind) || "kind not recorded", s(r.owner) ? `from ${s(r.owner)}` : "owner not recorded", kb) };
    }
    case "chats":
      return { title: s(r.title) || "Chat", sub: r.last_message_at ? `Last message ${fmtWhen(s(r.last_message_at))}` : "No messages" };
    case "people":
      return { title: s(r.full_name) || "Name not recorded", sub: join(roleLabel(s(r.role)), s(r.login_id) || "no login ID", PEOPLE_STATUS[s(r.access_status)] ?? s(r.access_status)) };
  }
}

const ACTION_WORDS: Record<Action, { button: string; done: string; kind: "ghost" | "danger" | "ok" }> = {
  archive: { button: "Archive", done: "Archived", kind: "ghost" },
  unarchive: { button: "Unarchive", done: "Unarchived", kind: "ghost" },
  trash: { button: "Move to Trash", done: "Moved to Trash", kind: "danger" },
  restore: { button: "Restore", done: "Restored", kind: "ok" },
};

function explain(a: Action, kind: Kind) {
  const one = KIND_ONE[kind];
  if (a === "archive") {
    if (kind === "people") return "Their login is switched off and they are signed out on every phone. They leave the everyday lists, but their name stays on their reports and attendance. You can unarchive them later.";
    if (kind === "reports") return "The report leaves the everyday lists but is not lost, and it still counts in the totals (the work happened). You can unarchive it later.";
    return `The ${one} leaves the everyday lists but is not lost. You can unarchive it later.`;
  }
  if (a === "unarchive") return kind === "people" ? "They come back into the everyday lists and can sign in again with their password (unless they are blocked)." : `The ${one} comes back into the everyday lists.`;
  if (a === "trash") return `The ${one} leaves every list${kind === "reports" ? " and no longer counts in the totals" : ""}. The Trash keeps it for 90 days so it can be restored; after that it is deleted for good, with its photos and files.`;
  return `The ${one} comes back where it was before it went to the Trash.`;
}

export default function FileManager() {
  const { me, toast } = useApp();
  const [kind, setKind] = useState<Kind>("reports");
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const search = useDebounced(q.trim(), 400);
  const load = useLoad<{ kind: Kind; tab: Tab; items: Item[] }>(`/api/file-manager?kind=${kind}&tab=${tab}${search ? `&q=${encodeURIComponent(search)}` : ""}`, { every: 30 });
  const [ask, setAsk] = useState<{ item: Item; action: Action; kind: Kind } | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);

  const actionsFor = (k: Kind, t: Tab): Action[] => (t === "active" ? ["archive", "trash"] : t === "archived" ? ["unarchive", "trash"] : ["restore"]).filter((a) => !(k === "people" && a === "trash")) as Action[];
  const close = () => { setAsk(null); setErr(null); };

  const run = async () => {
    if (!ask) return;
    setErr(null);
    try {
      const r = await call<{ id: string; archivedAt: string | null; trashedAt: string | null }>("/api/file-manager", { body: { kind: ask.kind, id: ask.item.id, action: ask.action } });
      load.set((d) => (d ? { ...d, items: d.items.filter((x) => x.id !== ask.item.id) } : d));
      toast(`${ACTION_WORDS[ask.action].done} at ${fmtTime(r.serverTime)}`);
      close();
    } catch (e) {
      setErr(e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e), "ERROR"));
    }
  };

  const section = KINDS.find((k) => k.value === kind)!.label;
  return (
    <Screen title="File manager" roles={["admin"]} testId="file-manager">
      <div className="notice info">
        <span>Archive takes something out of everyday lists without losing it. Trash keeps it for 90 days so it can be restored, then it is deleted for good with its photos.</span>
        {kind === "people" && <span><b>People are never put in the Trash</b> (their reports must keep their name): archive or block them instead.</span>}
      </div>
      <Select label="Section" value={kind} onChange={(v) => { setKind(v); close(); }} options={KINDS} testId="fm-kind" />
      <div data-testid="fm-tabs"><Tabs value={tab} onChange={(v) => { setTab(v); close(); }} tabs={TABS} /></div>
      <TextInput label="Search" value={q} onChange={setQ} placeholder={`Search ${section.toLowerCase()}`} maxLength={80} testId="fm-search" />
      <Loaded load={load} isEmpty={(d) => !d.items.length}
        empty={<Empty title={search ? "Nothing matches" : tab === "trash" ? "The Trash is empty" : tab === "archived" ? "Nothing archived" : "Nothing here"}>
          {search ? `No ${section.toLowerCase()} with “${search}”.` : `${section}: ${TABS.find((t) => t.value === tab)!.label.toLowerCase()}.`}
        </Empty>}>
        {(d) => (
          <>
            <div className="section-title">{d.items.length === 1 ? "1 record" : `${d.items.length} records`}{d.items.length >= 300 ? " (the newest 300; search to find others)" : ""}</div>
            <div className="list" data-testid="fm-list">
              {d.items.map((it) => {
                const w = describe(d.kind, it.row);
                return (
                  <div key={it.id} className="stack tight" style={{ padding: "12px 16px" }} data-testid="fm-row">
                    <div className="title" style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{w.title}</div>
                    <div className="small muted" style={{ overflowWrap: "anywhere" }}>{w.sub}</div>
                    {d.tab === "archived" && it.archivedAt && <div className="tiny muted">Archived {fmtWhen(it.archivedAt)}</div>}
                    {d.tab === "trash" && (
                      <div className="tiny" style={{ color: "var(--bad)", fontWeight: 700 }}>
                        Moved to Trash {fmtWhen(it.trashedAt)}. Deleted for good on {fmtDay(it.goneOn)}.
                      </div>
                    )}
                    {d.kind === "people" && it.id === me?.id ? <div className="tiny muted">This is your own login: it can&apos;t be archived.</div> : (
                    <div className="row wrap" style={{ gap: 8 }}>
                      {actionsFor(d.kind, d.tab).map((a) => (
                        <Button key={a} kind="ghost" onClick={() => { setErr(null); setAsk({ item: it, action: a, kind: d.kind }); }} testId={`fm-${a}`}>{ACTION_WORDS[a].button}</Button>
                      ))}
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Loaded>

      <Sheet open={!!ask} onClose={close} label="Confirm">
        {ask && (() => {
          const w = describe(ask.kind, ask.item.row);
          const a = ACTION_WORDS[ask.action];
          return (
            <>
              <h2>{a.button}?</h2>
              <div className="card" style={{ gap: 4 }}>
                <b style={{ overflowWrap: "anywhere" }}>{w.title}</b>
                <span className="small muted" style={{ overflowWrap: "anywhere" }}>{w.sub}</span>
              </div>
              <p>{explain(ask.action, ask.kind)}</p>
              {err && <ErrorNote error={err} title="Nothing was changed" />}
              <div className="btn-row">
                <Button kind="ghost" onClick={close}>Cancel</Button>
                <Button kind={a.kind === "ghost" ? "primary" : a.kind} onClick={run} busyText="Working…" testId="fm-confirm">{a.button}</Button>
              </div>
            </>
          );
        })()}
      </Sheet>
    </Screen>
  );
}
