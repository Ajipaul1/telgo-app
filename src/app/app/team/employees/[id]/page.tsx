"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Avatar, Button, Empty, ErrorNote, Loaded, Pill, Select, Sheet, TextArea, TextInput } from "@/components/ui";
import { call, ApiError } from "@/lib/client/api";
import { useLoad, useNow } from "@/lib/client/hooks";
import { ago, fmtTime, fmtWhen } from "@/lib/shared/format";

// "28 Sept 2026" (India time)
const dayYear = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
import { ROLES, ROLE_LABEL, signsIn, type Role } from "@/lib/shared/roles";
import { Check, reasonWords, roleLabel, shortDevice, StatusPill, TempPasswordCard, type Person, type TempResult } from "../../_parts/parts";

type Session = { id: string; since: string | null; lastSeen: string | null; device: string | null; ip: string | null };
type Attempt = { at: string; ok: boolean; reason: string | null; ip: string | null };
type Detail = { person: Person; passwordOldStyle: boolean; hasPassword: boolean; sessions: Session[]; attempts: Attempt[]; reports: number };

type Open = null | "edit" | "reset" | "approve" | "block" | "unblock" | "signout" | "archive" | "unarchive";

const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e), "ERROR"));
const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }));

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, toast, refreshCounts } = useApp();
  const router = useRouter();
  const now = useNow();
  const load = useLoad<Detail>(`/api/team/people/${encodeURIComponent(id)}`, { every: 30 });
  const [open, setOpen] = useState<Open>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [temp, setTemp] = useState<{ result: TempResult; askedEmail: boolean; what: string } | null>(null);
  const [chatErr, setChatErr] = useState<ApiError | null>(null);
  // the forms in the sheets (never redrawn by a refresh)
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", role: "" as Role | "", expected: "" });
  const [sendEmail, setSendEmail] = useState(true);
  const [reason, setReason] = useState("");
  const [nothing, setNothing] = useState(false);

  const self = me?.id === id;
  const close = () => { setOpen(null); setErr(null); setNothing(false); };
  const show = (what: Open, p?: Person) => {
    setErr(null); setNothing(false);
    if (what === "edit" && p) setForm({ fullName: p.fullName, email: p.email ?? "", phone: p.phone ?? "", role: (p.role as Role) ?? "", expected: p.updatedAt });
    if ((what === "reset" || what === "approve") && p) setSendEmail(!!p.email);
    if (what === "block") setReason("");
    setOpen(what);
  };
  const putPerson = (person: Person) => load.set((d) => (d ? { ...d, person } : d));

  const act = async (action: "approve" | "reset_password" | "block" | "unblock" | "sign_out_everywhere", extra: Record<string, unknown> = {}) => {
    setErr(null);
    try {
      const r = await call<{ person: Person } & Partial<TempResult>>(`/api/team/people/${encodeURIComponent(id)}/action`, { body: { action, ...extra } });
      putPerson(r.person);
      if (r.tempPassword) {
        setTemp({ result: r as TempResult, askedEmail: extra.sendEmail === true, what: action === "approve" ? "Approved: their login" : "New temporary password" });
        window.scrollTo({ top: 0 });
      }
      const words = { approve: "Approved", reset_password: "New password made", block: "Blocked", unblock: "Unblocked", sign_out_everywhere: "Signed out on all phones" }[action];
      toast(`${words} at ${fmtTime(r.serverTime)}`);
      close();
      if (action === "approve") refreshCounts();
      if (action === "sign_out_everywhere" || action === "reset_password" || action === "block") load.reload();
    } catch (e) { setErr(asError(e)); }
  };

  const move = async (action: "archive" | "unarchive") => {
    setErr(null);
    try {
      const r = await call<{ id: string; archivedAt: string | null }>("/api/file-manager", { body: { kind: "people", id, action } });
      toast(`${action === "archive" ? "Archived" : "Unarchived"} at ${fmtTime(r.serverTime)}`);
      close();
      await load.reload();
    } catch (e) { setErr(asError(e)); }
  };

  const saveEdit = async (p: Person) => {
    setErr(null); setNothing(false);
    const body: Record<string, unknown> = { expected: form.expected };
    if (form.fullName.trim() !== p.fullName) body.fullName = form.fullName.trim();
    if (form.email.trim().toLowerCase() !== (p.email ?? "").toLowerCase()) body.email = form.email.trim();
    if (form.phone.trim() !== (p.phone ?? "")) body.phone = form.phone.trim();
    if (form.role && form.role !== p.role) body.role = form.role;
    if (Object.keys(body).length === 1) { setNothing(true); return; }
    try {
      const r = await call<{ person: Person }>(`/api/team/people/${encodeURIComponent(id)}`, { method: "PATCH", body });
      putPerson(r.person);
      toast(`Saved at ${fmtTime(r.serverTime)}`);
      close();
    } catch (e) { setErr(asError(e)); }
  };

  const chat = async () => {
    setChatErr(null);
    try {
      const r = await call<{ threadId: string }>("/api/chat", { body: { with: id } });
      router.push(`/app/chat/${r.threadId}`);
    } catch (e) { setChatErr(asError(e)); }
  };

  return (
    <Screen title={load.data?.person.fullName || "Employee"} roles={["admin"]} testId="employee">
      {temp && <TempPasswordCard result={temp.result} askedEmail={temp.askedEmail} what={temp.what} onDone={() => setTemp(null)} showOpen={false} />}
      <Loaded load={load} skeleton={3}>
        {(d) => {
          const p = d.person;
          const st = p.status;
          const staff = signsIn(p.role);
          return (
            <>
              <div className="card" data-testid="person-card">
                <div className="row">
                  <Avatar name={p.fullName} userId={p.id} has={p.hasAvatar} v={p.updatedAt} size="lg" />
                  <div className="grow">
                    <h1 style={{ overflowWrap: "anywhere" }} data-testid="person-name">{p.fullName || "Name not recorded"}</h1>
                    <div className="muted small">{roleLabel(p.role)}{self ? " · this is you" : ""}</div>
                    <div style={{ marginTop: 6 }}><StatusPill status={st} /></div>
                  </div>
                </div>
                <dl className="kv">
                  <dt>Login ID</dt><dd style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", overflowWrap: "anywhere" }} data-testid="person-login-id">{p.loginId || "—"}</dd>
                  <dt>Email</dt><dd style={{ overflowWrap: "anywhere" }}>{p.email || "not recorded"}</dd>
                  <dt>Phone</dt><dd>{p.phone || "not recorded"}</dd>
                  <dt>Last sign-in</dt><dd>{p.lastSignIn ? fmtWhen(p.lastSignIn) : "never"}</dd>
                  <dt>Login made</dt><dd>{p.createdAt ? dayYear(p.createdAt) : "not recorded"}</dd>
                  <dt>Password</dt>
                  <dd>{!d.hasPassword ? "not set yet" : p.mustChangePassword ? "temporary (must change)" : d.passwordOldStyle ? "old style (upgraded at next sign-in)" : "set by them"}</dd>
                  {staff && <><dt>Reports sent</dt><dd data-testid="person-reports">{d.reports}</dd></>}
                </dl>
                {st === "blocked" && <div className="notice bad"><b>Blocked</b><span>{p.blockedReason || "No reason was written."}</span></div>}
                {st === "pending" && (
                  <div className="notice warn">
                    <b>Waiting for your approval</b>
                    <span>{p.requestNote ? `Their note: ${p.requestNote}` : "They didn't write a note."}</span>
                  </div>
                )}
                {!d.hasPassword && st === "active" && <div className="notice info"><b>No password yet</b><span>They can&apos;t sign in until you give them one with Reset password.</span></div>}
              </div>

              <div className="section-title">Actions</div>
              <div className="stack" data-testid="person-actions">
                <Button kind="ghost" block onClick={() => show("edit", p)} testId="act-edit">Edit name, email, phone or work</Button>
                {st === "pending" && <Button kind="ok" block onClick={() => show("approve", p)} testId="act-approve">Approve</Button>}
                {st === "active" && !self && <Button block onClick={chat} busyText="Opening the chat…" testId="act-chat">Chat with them</Button>}
                {chatErr && <ErrorNote error={chatErr} title="Couldn't open the chat" />}
                {staff && st !== "pending" && (
                  <div className="btn-row">
                    <Button kind="soft" href={`/app/team/attendance?user=${p.id}`} testId="act-attendance">Attendance</Button>
                    <Button kind="soft" href={`/app/team/live?person=${p.id}`} testId="act-live">Live location</Button>
                  </div>
                )}
                {!self && st !== "pending" && st !== "archived" && <Button kind="ghost" block onClick={() => show("reset", p)} testId="act-reset">Reset password</Button>}
                {st !== "pending" && <Button kind="ghost" block onClick={() => show("signout")} testId="act-signout">Sign out on all phones</Button>}
                {!self && (st === "active" || st === "pending") && <Button kind="danger" block onClick={() => show("block")} testId="act-block">{st === "pending" ? "Refuse and block" : "Block"}</Button>}
                {!self && st === "blocked" && <Button kind="ok" block onClick={() => show("unblock")} testId="act-unblock">Unblock</Button>}
                {!self && st !== "archived" && <Button kind="ghost" block onClick={() => show("archive")} testId="act-archive">Archive</Button>}
                {!self && st === "archived" && <Button kind="ghost" block onClick={() => show("unarchive")} testId="act-unarchive">Unarchive</Button>}
              </div>

              <div className="section-title">Phones signed in ({d.sessions.length})</div>
              {d.sessions.length ? (
                <div className="list" data-testid="person-sessions">
                  {d.sessions.map((s) => (
                    <div key={s.id} className="item">
                      <div className="grow">
                        <div className="title ellipsis">{shortDevice(s.device)}</div>
                        <div className="sub">Since {fmtWhen(s.since)}</div>
                        <div className="sub tiny">Last used {s.lastSeen ? ago(s.lastSeen, now) : "not recorded"}{s.ip ? ` · network ${s.ip}` : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty title="Not signed in on any phone" />}

              <div className="section-title">Last sign-in attempts</div>
              {d.attempts.length ? (
                <div className="list" data-testid="person-attempts">
                  {d.attempts.map((a, i) => (
                    <div key={a.at + i} className="item">
                      <div className="grow">
                        <div className="title">{fmtWhen(a.at)}</div>
                        <div className="sub">{reasonWords(a.reason)}{a.ip ? ` · network ${a.ip}` : ""}</div>
                      </div>
                      <div className="end">{a.ok ? <Pill tone="ok">OK</Pill> : <Pill tone="bad">Refused</Pill>}</div>
                    </div>
                  ))}
                </div>
              ) : <Empty title="No sign-in attempts recorded" />}

              {/* ---------- the sheets ---------- */}
              <Sheet open={open === "edit"} onClose={close} label="Edit this person">
                <h2>Edit {p.fullName || "this person"}</h2>
                <TextInput label="Name" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} maxLength={80} testId="edit-name" />
                <TextInput label="Email" type="email" inputMode="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} maxLength={200} testId="edit-email" />
                <TextInput label="Phone" type="tel" inputMode="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} maxLength={20} hint="Leave empty to remove it." testId="edit-phone" />
                <Select label="Work" value={form.role} onChange={(v) => setForm((f) => ({ ...f, role: v }))} options={ROLE_OPTIONS} testId="edit-role" />
                {self && <p className="small muted">This is your own login: you can&apos;t take away your own admin work.</p>}
                {nothing && <div className="notice info"><b>Nothing to save</b><span>You didn&apos;t change anything.</span></div>}
                {err && <ErrorNote error={err} title="Not saved" />}
                {err?.code === "CHANGED" && (
                  <Button kind="soft" block testId="edit-reload" busyText="Reloading…"
                    onClick={async () => { await load.reload(); close(); }}>Reload their details, then edit again</Button>
                )}
                <div className="btn-row">
                  <Button kind="ghost" onClick={close}>Cancel</Button>
                  <Button onClick={() => saveEdit(p)} busyText="Saving…" testId="edit-save">Save</Button>
                </div>
              </Sheet>

              <Sheet open={open === "reset"} onClose={close} label="Reset password">
                <h2>Reset the password?</h2>
                <p>A new temporary password is made for {p.fullName || "this person"} and shown to you once. Their old password stops working now, and they are signed out on every phone. They must change it the first time they sign in.</p>
                <Check label={p.email ? `Also email it to ${p.email}` : "Email it to them (no email on this login)"} checked={sendEmail && !!p.email} disabled={!p.email} onChange={setSendEmail} testId="reset-send-email" />
                {err && <ErrorNote error={err} title="Not done" />}
                <div className="btn-row">
                  <Button kind="ghost" onClick={close}>Cancel</Button>
                  <Button kind="warn" onClick={() => act("reset_password", { sendEmail: sendEmail && !!p.email })} busyText="Making it…" testId="reset-confirm">Reset password</Button>
                </div>
              </Sheet>

              <Sheet open={open === "approve"} onClose={close} label="Approve">
                <h2>Approve {p.fullName || "this request"}?</h2>
                <p>They get the work &ldquo;{roleLabel(p.role)}&rdquo;, the login ID {p.loginId || "—"} and a temporary password shown to you once. They must change it the first time they sign in.</p>
                <Check label={p.email ? `Also email the login details to ${p.email}` : "Email the login details (no email on this request)"} checked={sendEmail && !!p.email} disabled={!p.email} onChange={setSendEmail} testId="approve-send-email" />
                {err && <ErrorNote error={err} title="Not approved" />}
                <div className="btn-row">
                  <Button kind="ghost" onClick={close}>Cancel</Button>
                  <Button kind="ok" onClick={() => act("approve", { sendEmail: sendEmail && !!p.email })} busyText="Approving…" testId="approve-confirm">Approve</Button>
                </div>
              </Sheet>

              <Sheet open={open === "block"} onClose={close} label="Block">
                <h2>Block {p.fullName || "this login"}?</h2>
                <p>They are signed out on every phone at once and can&apos;t sign in until you unblock them. Their reports and attendance stay as they are.</p>
                <TextArea label="Reason (they don't see it; it stays on their page)" value={reason} onChange={setReason} maxLength={200} rows={2} testId="block-reason" />
                {err && <ErrorNote error={err} title="Not blocked" />}
                <div className="btn-row">
                  <Button kind="ghost" onClick={close}>Cancel</Button>
                  <Button kind="danger" onClick={() => act("block", { reason: reason.trim() || undefined })} busyText="Blocking…" testId="block-confirm">Block</Button>
                </div>
              </Sheet>

              <Sheet open={open === "unblock"} onClose={close} label="Unblock">
                <h2>Unblock {p.fullName || "this login"}?</h2>
                <p>Their login becomes active again and they can sign in with their password.{!d.hasPassword ? " They have no password yet: use Reset password afterwards to give them one." : ""}</p>
                {err && <ErrorNote error={err} title="Not unblocked" />}
                <div className="btn-row">
                  <Button kind="ghost" onClick={close}>Cancel</Button>
                  <Button kind="ok" onClick={() => act("unblock")} busyText="Unblocking…" testId="unblock-confirm">Unblock</Button>
                </div>
              </Sheet>

              <Sheet open={open === "signout"} onClose={close} label="Sign out on all phones">
                <h2>Sign out on all phones?</h2>
                <p>{self
                  ? "Every phone signed in with your login is signed out now, this one too. You will need your password to sign in again."
                  : `Every phone signed in as ${p.fullName || "this person"} is signed out now (${d.sessions.length === 1 ? "1 phone" : `${d.sessions.length} phones`}). They can sign in again with their password.`}</p>
                {err && <ErrorNote error={err} title="Not done" />}
                <div className="btn-row">
                  <Button kind="ghost" onClick={close}>Cancel</Button>
                  <Button kind="warn" onClick={() => act("sign_out_everywhere")} busyText="Signing out…" testId="signout-confirm">Sign out</Button>
                </div>
              </Sheet>

              <Sheet open={open === "archive"} onClose={close} label="Archive">
                <h2>Archive {p.fullName || "this login"}?</h2>
                <p>Their login is switched off and they are signed out on every phone. They leave the everyday lists, but their name stays on their reports and attendance. You can unarchive them later (File manager, People).</p>
                {err && <ErrorNote error={err} title="Not archived" />}
                <div className="btn-row">
                  <Button kind="ghost" onClick={close}>Cancel</Button>
                  <Button kind="danger" onClick={() => move("archive")} busyText="Archiving…" testId="archive-confirm">Archive</Button>
                </div>
              </Sheet>

              <Sheet open={open === "unarchive"} onClose={close} label="Unarchive">
                <h2>Unarchive {p.fullName || "this login"}?</h2>
                <p>They come back into the everyday lists and can sign in again with their password{st === "archived" && p.blockedReason ? " (unless they are still blocked)" : ""}.</p>
                {err && <ErrorNote error={err} title="Not unarchived" />}
                <div className="btn-row">
                  <Button kind="ghost" onClick={close}>Cancel</Button>
                  <Button kind="ok" onClick={() => move("unarchive")} busyText="Unarchiving…" testId="unarchive-confirm">Unarchive</Button>
                </div>
              </Sheet>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}
