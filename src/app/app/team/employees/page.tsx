"use client";
import { useState } from "react";
import { ErrorNote } from "@/components/ui";
import { ApiError } from "@/lib/client/api";
import { loadAllPasswords, PasswordLine, type Shown } from "../_parts/password";
import { Screen } from "@/components/Screen";
import { Avatar, Button, Empty, Loaded, TextInput } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtWhen } from "@/lib/shared/format";
import { FitTabs, roleLabel, StatusPill, type Person } from "../_parts/parts";

type Tab = "active" | "pending" | "blocked" | "archived" | "all";
const TABS: { value: Tab; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Waiting" },
  { value: "blocked", label: "Blocked" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];
const EMPTY: Record<Tab, string> = {
  active: "No active logins",
  pending: "No one is waiting",
  blocked: "No one is blocked",
  archived: "No one is archived",
  all: "No logins yet",
};

const norm = (s: string | null | undefined) => String(s ?? "").toLowerCase();
const digits = (s: string | null | undefined) => String(s ?? "").replace(/\D/g, "");

export default function Employees() {
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [pw, setPw] = useState<Shown | null>(null);
  const [pwErr, setPwErr] = useState<ApiError | null>(null);
  const togglePw = async () => {
    setPwErr(null);
    if (pw) { setPw(null); return; }
    try { setPw(await loadAllPasswords()); } catch (e) { setPwErr(e as ApiError); }
  };
  const load = useLoad<{ people: Person[] }>(`/api/team/people?status=${tab}`, { every: 20 });

  const match = (p: Person) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    const d = t.replace(/\D/g, "");
    return norm(p.fullName).includes(t) || norm(p.loginId).includes(t) || norm(p.email).includes(t) || norm(p.phone).includes(t) || (d.length >= 3 && digits(p.phone).includes(d));
  };

  return (
    <Screen title="Employees" roles={["admin"]} testId="employees">
      <Button block href="/app/team/employees/new" testId="add-person">Add a person</Button>
      <FitTabs value={tab} onChange={setTab} tabs={TABS} testId="employees-tabs" />
      <TextInput label="Search" value={q} onChange={setQ} placeholder="Name, login ID, email or phone" testId="employees-search" maxLength={80} />
      <Button kind="ghost" block onClick={togglePw} busyText="Opening…" testId="show-passwords">{pw ? "Hide passwords" : "Show passwords"}</Button>
      {pwErr && <ErrorNote error={pwErr} />}
      <Loaded load={load} isEmpty={(d) => !d.people.length} empty={<Empty title={EMPTY[tab]}>{tab === "active" ? "Add a person, or approve an access request." : null}</Empty>}>
        {(d) => {
          const list = d.people.filter(match);
          if (!list.length) return <Empty title="No one matches">Nobody here has &ldquo;{q.trim()}&rdquo; in their name, login ID, email or phone.</Empty>;
          return (
            <>
              <div className="section-title">{list.length === 1 ? "1 person" : `${list.length} people`}{q.trim() ? ` of ${d.people.length}` : ""}</div>
              <div className="list" data-testid="employees-list">
                {list.map((p) => (
                  <a key={p.id} className="item" href={`/app/team/employees/${p.id}`} data-testid="employee-row">
                    <Avatar name={p.fullName} userId={p.id} has={p.hasAvatar} v={p.updatedAt} />
                    <div className="grow">
                      <div className="title ellipsis">{p.fullName || "Name not recorded"}</div>
                      <div className="sub">{roleLabel(p.role)} · <span style={{ whiteSpace: "nowrap" }}>{p.loginId || "no login ID"}</span></div>
                      <div className="sub tiny">{p.lastSignIn ? `Last sign-in ${fmtWhen(p.lastSignIn)}` : "Never signed in"}</div>
                      {pw && <PasswordLine pw={pw[p.id]} />}
                    </div>
                    <div className="end"><StatusPill status={p.status} /></div>
                  </a>
                ))}
              </div>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}
