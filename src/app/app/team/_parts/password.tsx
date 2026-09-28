"use client";
// The admin sees and changes passwords (owner's decision, 28 Sep 2026). Every look goes in the Change log.
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { Button, ErrorNote, Sheet, TextInput } from "@/components/ui";
import { call, ApiError } from "@/lib/client/api";
import { fmtTime, fmtWhen } from "@/lib/shared/format";
import { Check, type Person } from "./parts";

const MONO = { fontFamily: "ui-monospace, Menlo, Consolas, monospace" } as const;
const NOT_KNOWN = "Not known yet. It appears here after their next sign-in, or set a new one now.";

export function PasswordBox({ person, self, onChanged }: { person: Person; self: boolean; onChanged: (p: Person) => void }) {
  const { toast } = useApp();
  const [shown, setShown] = useState<{ password: string | null; since: string | null } | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [mustChange, setMustChange] = useState(false);
  const [signOut, setSignOut] = useState(false);
  const [sheetErr, setSheetErr] = useState<ApiError | null>(null);

  const show = async () => {
    setErr(null);
    try { setShown(await call<{ password: string | null; since: string | null }>(`/api/team/people/${encodeURIComponent(person.id)}/password`)); }
    catch (e) { setErr(e as ApiError); }
  };
  const copy = async (pw: string) => {
    try { await navigator.clipboard.writeText(pw); toast("Password copied"); }
    catch { setErr(new ApiError("This phone didn't allow copying. Press and hold the password to copy it.", "COPY")); }
  };
  const save = async (generate: boolean) => {
    setSheetErr(null);
    try {
      const r = await call<{ person: Person; password: string }>(`/api/team/people/${encodeURIComponent(person.id)}/action`, {
        body: { action: "set_password", password: generate ? "" : typed, mustChange, signOut },
      });
      onChanged(r.person);
      setShown({ password: r.password, since: r.serverTime });
      setOpen(false); setTyped("");
      toast(`Password changed at ${fmtTime(r.serverTime)}`);
    } catch (e) { setSheetErr(e as ApiError); }
  };

  return (
    <div className="card" data-testid="password-box">
      <div className="row between"><h2>Password</h2>{shown && <Button kind="soft" small onClick={() => setShown(null)}>Hide</Button>}</div>
      {shown ? (
        shown.password ? (
          <>
            <div data-testid="password-shown" style={{ ...MONO, fontSize: 22, fontWeight: 800, letterSpacing: ".04em", color: "var(--brand)", background: "var(--soft)", borderRadius: 12, padding: "12px 14px", wordBreak: "break-all", userSelect: "all" }}>{shown.password}</div>
            <p className="tiny muted">Set {fmtWhen(shown.since)}.{person.mustChangePassword ? " They must change it when they next sign in." : ""}</p>
            <Button kind="soft" block onClick={() => copy(shown.password!)}>Copy the password</Button>
          </>
        ) : <p className="small muted" data-testid="password-unknown">{NOT_KNOWN}</p>
      ) : (
        <Button kind="ghost" block onClick={show} busyText="Opening…" testId="password-show">Show password</Button>
      )}
      {!self ? <Button kind="ghost" block onClick={() => { setOpen(true); setSheetErr(null); }} testId="password-change">Change password</Button>
        : <p className="tiny muted">Change your own password in Profile.</p>}
      {err && <ErrorNote error={err} />}

      <Sheet open={open} onClose={() => setOpen(false)} label="Change password">
        <h2>New password for {person.fullName || "this person"}</h2>
        <TextInput label="New password" value={typed} onChange={setTyped} maxLength={128} autoComplete="off" hint="At least 8 characters. Or tap Make one for me." testId="password-new" />
        <Check label="Ask them to choose their own when they next sign in" checked={mustChange} onChange={setMustChange} testId="password-must-change" />
        <Check label="Sign them out on every phone now" checked={signOut} onChange={setSignOut} testId="password-sign-out" />
        {sheetErr && <ErrorNote error={sheetErr} title="Not changed" />}
        <div className="btn-row">
          <Button kind="ghost" onClick={() => save(true)} busyText="Making…" testId="password-make">Make one for me</Button>
          <Button onClick={() => save(false)} disabled={typed.length < 8} busyText="Saving…" testId="password-save">Save</Button>
        </div>
      </Sheet>
    </div>
  );
}

export type Shown = Record<string, string | null>;
export async function loadAllPasswords(): Promise<Shown> {
  const r = await call<{ passwords: { id: string; password: string | null }[] }>("/api/team/passwords");
  return Object.fromEntries(r.passwords.map((p) => [p.id, p.password]));
}
export const PasswordLine = ({ pw }: { pw: string | null | undefined }) =>
  pw ? <div className="sub" data-testid="row-password">Password: <b style={MONO}>{pw}</b></div> : <div className="sub tiny" data-testid="row-password">Password not known yet (shows after their next sign-in)</div>;
