"use client";
// Shared by the Team, System and File manager screens: the person as the server sends it, status words,
// the temporary-password card (shown once), device names in plain words, and a debounced search value.
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { Button, Pill } from "@/components/ui";
import { fmtTime } from "@/lib/shared/format";
import { ROLE_LABEL, type Role } from "@/lib/shared/roles";

// what /api/team/people sends for one person (src/lib/server/people.ts personView)
export type Person = {
  id: string; fullName: string; email: string | null; phone: string | null; role: string; loginId: string;
  status: string; blockedReason: string | null; lastSignIn: string | null; createdAt: string | null; updatedAt: string;
  mustChangePassword: boolean; hasAvatar: boolean; requestNote: string | null;
};

// the answer to add / approve / reset: a temporary password, shown only now
export type TempResult = { person: Person; tempPassword: string; emailed: boolean; emailProblem: string | null; serverTime: string };

export const roleLabel = (r: string | null | undefined) => (r ? ROLE_LABEL[r as Role] ?? r : "—");

export const STATUS_WORD: Record<string, string> = { active: "Active", pending: "Waiting", blocked: "Blocked", archived: "Archived" };
const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | undefined> = { active: "ok", pending: "warn", blocked: "bad", archived: undefined };
export function StatusPill({ status }: { status: string }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_WORD[status] ?? status}</Pill>;
}

// "Android phone, Chrome" from a browser's user agent (never guessed beyond what it says)
export function shortDevice(ua: unknown): string {
  const s = typeof ua === "string" ? ua : "";
  if (!s) return "Device not recorded";
  const what = /iPhone/i.test(s) ? "iPhone" : /iPad/i.test(s) ? "iPad" : /Android/i.test(s) ? (/Mobile/i.test(s) ? "Android phone" : "Android tablet")
    : /Windows/i.test(s) ? "Windows computer" : /Macintosh|Mac OS X/i.test(s) ? "Mac" : /Linux/i.test(s) ? "Linux computer" : null;
  const app = /EdgA?\//.test(s) ? "Edge" : /SamsungBrowser/i.test(s) ? "Samsung Internet" : /OPR\/|Opera/.test(s) ? "Opera" : /Firefox\/|FxiOS/.test(s) ? "Firefox"
    : /CriOS|Chrome\//.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : /node|curl|playwright|headless/i.test(s) ? "a script" : null;
  if (!what && !app) return s.length > 48 ? s.slice(0, 48) + "…" : s;
  return [what ?? "Unknown device", app].filter(Boolean).join(", ");
}

// sign-in attempt reasons (src/app/api/auth/sign-in/route.ts) in plain words
export const REASON_WORDS: Record<string, string> = {
  ok: "OK",
  ok_upgraded: "OK (old password upgraded)",
  wrong_password: "Wrong password",
  unknown: "No such login",
  locked: "Locked after too many wrong passwords",
  network_blocked: "Network blocked after too many failures",
  blocked: "The login is blocked",
  pending: "Access request still waiting",
  archived: "The login is archived",
  gone: "The login no longer exists",
  no_password: "No password set yet",
  inactive: "The login isn't active",
};
export const reasonWords = (r: unknown) => REASON_WORDS[String(r ?? "")] ?? (r ? String(r) : "not recorded");

// a value that settles after the person stops typing
export function useDebounced<T>(value: T, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}

// The temporary password, shown once (owner's rule): big, easy to copy, never stored on the phone.
export function TempPasswordCard({ result, askedEmail, what, onDone, testId = "temp-password-card", showOpen = true }: {
  result: TempResult; askedEmail: boolean; what: string; onDone?: () => void; testId?: string; showOpen?: boolean;
}) {
  const { toast } = useApp();
  const [copied, setCopied] = useState<"" | "ok" | "no">("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied("ok");
      toast("Password copied");
    } catch {
      setCopied("no");
    }
  };
  const p = result.person;
  return (
    <div className="card line-ok" data-testid={testId} role="status">
      <div className="row between wrap">
        <h2>{what}</h2>
        <span className="small muted">Saved at {fmtTime(result.serverTime)}</span>
      </div>
      <dl className="kv">
        <dt>Name</dt><dd>{p.fullName || "—"}</dd>
        <dt>Login ID</dt><dd data-testid="temp-login-id" style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}>{p.loginId || "—"}</dd>
      </dl>
      <div className="stack tight">
        <span className="label">Temporary password</span>
        <div data-testid="temp-password"
          style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 26, fontWeight: 800, letterSpacing: ".06em", color: "var(--brand)",
            background: "var(--soft)", borderRadius: 12, padding: "14px 16px", wordBreak: "break-all", userSelect: "all" }}>
          {result.tempPassword}
        </div>
      </div>
      <Button kind="soft" block onClick={copy} testId="temp-copy">{copied === "ok" ? "Copied" : "Copy"}</Button>
      {copied === "no" && <p className="small" style={{ color: "var(--bad)" }}>This phone didn&apos;t allow copying. Write the password down instead.</p>}
      <p className="small"><b>Shown only now. They must change it the first time they sign in.</b></p>
      <p className="small muted" data-testid="temp-email">
        {result.emailed
          ? `The login details were emailed to ${p.email ?? "them"}.`
          : !askedEmail
            ? "Not emailed (you chose not to). Give them the login ID and password yourself."
            : result.emailProblem
              ? `Not emailed: ${result.emailProblem} Give them the login ID and password yourself.`
              : "Not emailed: there is no email on this login. Give them the login ID and password yourself."}
      </p>
      {showOpen && <Button kind="ghost" block href={`/app/team/employees/${p.id}`} testId="temp-open-person">Open their page</Button>}
      {onDone && <Button kind="ghost" block onClick={onDone} testId="temp-done">Done: hide the password</Button>}
    </div>
  );
}

// the shared .tabs look, but tighter so five short tabs fit a 390 px phone without hiding the last one
export function FitTabs<T extends string>({ value, onChange, tabs, testId }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string }[]; testId?: string }) {
  return (
    <div className="tabs" role="tablist" data-testid={testId}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          style={{ flex: "1 1 auto", padding: "0 6px", minHeight: 48, fontSize: 14 }}>{t.label}</button>
      ))}
    </div>
  );
}

// a tick box with a big tap area
export function Check({ label, checked, onChange, testId, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId?: string; disabled?: boolean }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      <span>{label}</span>
    </label>
  );
}
