"use client";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, Empty, ErrorNote, Loaded, Sheet } from "@/components/ui";
import { call, ApiError } from "@/lib/client/api";
import { useLoad, useNow } from "@/lib/client/hooks";
import { ago, fmtTime, fmtWhen } from "@/lib/shared/format";
import { Check, roleLabel, TempPasswordCard, type Person, type TempResult } from "../_parts/parts";

const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e), "ERROR"));
const REFUSED = "Access request refused";

export default function Requests() {
  const { toast, refreshCounts } = useApp();
  const now = useNow();
  const load = useLoad<{ people: Person[] }>("/api/team/people?status=pending", { every: 20 });
  const [sheet, setSheet] = useState<{ what: "approve" | "refuse"; p: Person } | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [err, setErr] = useState<ApiError | null>(null);
  const [done, setDone] = useState<{ result: TempResult; askedEmail: boolean }[]>([]);

  const open = (what: "approve" | "refuse", p: Person) => { setErr(null); setSendEmail(!!p.email); setSheet({ what, p }); };
  const close = () => { setSheet(null); setErr(null); };
  const drop = (pid: string) => load.set((d) => (d ? { ...d, people: d.people.filter((x) => x.id !== pid) } : d));

  const approve = async (p: Person) => {
    setErr(null);
    const asked = sendEmail && !!p.email;
    try {
      const r = await call<TempResult>(`/api/team/people/${p.id}/action`, { body: { action: "approve", sendEmail: asked } });
      setDone((list) => [{ result: r, askedEmail: asked }, ...list]);
      drop(p.id);
      toast(`Approved at ${fmtTime(r.serverTime)}`);
      close();
      refreshCounts();
      window.scrollTo({ top: 0 });
    } catch (e) { setErr(asError(e)); }
  };

  const refuse = async (p: Person) => {
    setErr(null);
    try {
      const r = await call<{ person: Person }>(`/api/team/people/${p.id}/action`, { body: { action: "block", reason: REFUSED } });
      drop(p.id);
      toast(`Refused at ${fmtTime(r.serverTime)}`);
      close();
      refreshCounts();
    } catch (e) { setErr(asError(e)); }
  };

  return (
    <Screen title="Access requests" roles={["admin"]} testId="requests">
      {done.map((x) => (
        <TempPasswordCard key={x.result.person.id} result={x.result} askedEmail={x.askedEmail} what={`Approved: ${x.result.person.fullName}`}
          onDone={() => setDone((list) => list.filter((y) => y.result.person.id !== x.result.person.id))} />
      ))}
      <Loaded load={load} isEmpty={(d) => !d.people.length}
        empty={<Empty title="No one is waiting">When someone asks for a login on the sign-in page, their request shows here.</Empty>}>
        {(d) => (
          <div className="stack" data-testid="requests-list">
            <div className="section-title">{d.people.length === 1 ? "1 request" : `${d.people.length} requests`}</div>
            {d.people.map((p) => (
              <div key={p.id} className="card line-warn" data-testid="request-card">
                <div className="row between" style={{ alignItems: "flex-start" }}>
                  <h2 style={{ overflowWrap: "anywhere" }}>{p.fullName || "Name not recorded"}</h2>
                  <span className="small muted" style={{ flex: "none" }}>{ago(p.createdAt, now)}</span>
                </div>
                <dl className="kv">
                  <dt>Work asked for</dt><dd>{roleLabel(p.role)}</dd>
                  <dt>Email</dt><dd style={{ overflowWrap: "anywhere" }}>{p.email || "not recorded"}</dd>
                  <dt>Phone</dt><dd>{p.phone || "not recorded"}</dd>
                  <dt>Asked</dt><dd>{p.createdAt ? fmtWhen(p.createdAt) : "not recorded"}</dd>
                </dl>
                <div className="notice info"><b>Their note</b><span style={{ overflowWrap: "anywhere" }}>{p.requestNote || "No note."}</span></div>
                <div className="btn-row">
                  <Button kind="danger" onClick={() => open("refuse", p)} testId="request-refuse">Refuse</Button>
                  <Button kind="ok" onClick={() => open("approve", p)} testId="request-approve">Approve</Button>
                </div>
                <a className="link-btn" href={`/app/team/employees/${p.id}`}>Open their page</a>
              </div>
            ))}
          </div>
        )}
      </Loaded>

      <Sheet open={sheet?.what === "approve"} onClose={close} label="Approve the request">
        {sheet && (
          <>
            <h2>Approve {sheet.p.fullName || "this request"}?</h2>
            <p>They get the work &ldquo;{roleLabel(sheet.p.role)}&rdquo;, the login ID {sheet.p.loginId || "—"} and a temporary password shown to you once. They must change it the first time they sign in.</p>
            <Check label={sheet.p.email ? `Also email the login details to ${sheet.p.email}` : "Email the login details (no email on this request)"}
              checked={sendEmail && !!sheet.p.email} disabled={!sheet.p.email} onChange={setSendEmail} testId="request-send-email" />
            {err && <ErrorNote error={err} title="Not approved" />}
            <div className="btn-row">
              <Button kind="ghost" onClick={close}>Cancel</Button>
              <Button kind="ok" onClick={() => approve(sheet.p)} busyText="Approving…" testId="request-approve-confirm">Approve</Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={sheet?.what === "refuse"} onClose={close} label="Refuse the request">
        {sheet && (
          <>
            <h2>Refuse {sheet.p.fullName || "this request"}?</h2>
            <p>The request is refused and this login is blocked with the reason &ldquo;{REFUSED}&rdquo;. They can&apos;t sign in, and this email can&apos;t ask again. You can still unblock them later from Employees, Blocked.</p>
            {err && <ErrorNote error={err} title="Not refused" />}
            <div className="btn-row">
              <Button kind="ghost" onClick={close}>Cancel</Button>
              <Button kind="danger" onClick={() => refuse(sheet.p)} busyText="Refusing…" testId="request-refuse-confirm">Refuse</Button>
            </div>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
