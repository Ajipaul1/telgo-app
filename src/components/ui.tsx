"use client";
// The building blocks every screen uses. Words, not icons (owner's rule).
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ApiError, reportProblem } from "@/lib/client/api";
import type { Load } from "@/lib/client/hooks";
import { canListen, listenTo, readAloud, stopReading } from "@/lib/client/voice";
import { fileUrl, uploadFile, type Stored } from "@/lib/client/device";
import { fmtTime, initials } from "@/lib/shared/format";
import type { Pic } from "@/lib/shared/report";
import { useApp } from "./AppContext";

// ---------- buttons ----------
type BtnProps = {
  children: ReactNode; onClick?: () => unknown | Promise<unknown>; kind?: "primary" | "ghost" | "soft" | "ok" | "danger" | "warn";
  block?: boolean; big?: boolean; small?: boolean; busyText?: string; disabled?: boolean; type?: "button" | "submit"; testId?: string; href?: string;
};
// A button that shows it is working and can't be tapped twice while it does.
export function Button({ children, onClick, kind = "primary", block, big, small, busyText, disabled, type = "button", testId, href }: BtnProps) {
  const [busy, setBusy] = useState(false);
  const cls = ["btn", kind !== "primary" ? kind : "", block ? "block" : "", big ? "big" : "", small ? "small" : ""].filter(Boolean).join(" ");
  if (href) return <a className={cls} href={href} data-testid={testId}>{children}</a>;
  return (
    <button type={type} className={cls} data-testid={testId} disabled={disabled || busy}
      onClick={onClick ? async () => { if (busy) return; setBusy(true); try { await onClick(); } finally { setBusy(false); } } : undefined}>
      {busy ? <><span className="spinner" />{busyText ?? "Working…"}</> : children}
    </button>
  );
}

// ---------- the four states of a screen ----------
export function ErrorNote({ error, onRetry, title }: { error: ApiError | Error | string; onRetry?: () => unknown; title?: string }) {
  const e = typeof error === "string" ? new ApiError(error, "ERROR") : error instanceof ApiError ? error : new ApiError(error.message, "ERROR");
  return (
    <div className="notice bad" role="alert">
      <b>{title ?? "It didn't work"}</b>
      <span>{e.message}</span>
      {e.ref && <span className="ref">Reference {e.ref}: the admin can see the details in System → Problems.</span>}
      {onRetry && <div><Button kind="ghost" small onClick={onRetry}>Try again</Button></div>}
    </div>
  );
}

// Shows the data, or says in words it is loading / still trying / why it failed / that there is nothing.
export function Loaded<T>({ load, children, empty, isEmpty, skeleton = 3 }: {
  load: Load<T>; children: (data: T) => ReactNode; empty?: ReactNode; isEmpty?: (d: T) => boolean; skeleton?: number;
}) {
  if (load.loading) {
    return (
      <div className="stack" aria-busy="true">
        {load.slow
          ? <div className="notice warn"><b>Still loading…</b><span>This is taking longer than usual. The signal may be weak; the app keeps trying for a few more seconds.</span></div>
          : Array.from({ length: skeleton }, (_, i) => <div key={i} className="skeleton" />)}
      </div>
    );
  }
  if (!load.data) return load.error ? <ErrorNote error={load.error} onRetry={load.reload} title="Couldn't load this" /> : null;
  if (isEmpty && isEmpty(load.data)) return <>{empty ?? <Empty title="Nothing here yet" />}{load.error && <RefreshNote load={load} />}</>;
  return <>{load.error && <RefreshNote load={load} />}{children(load.data)}</>;
}

function RefreshNote({ load }: { load: Pick<Load<unknown>, "error" | "at" | "reload"> }) {
  return (
    <div className="notice warn" role="status">
      <b>Couldn't refresh</b>
      <span>{load.error?.message} Showing what was loaded at {fmtTime(load.at)}.</span>
      <div><Button kind="ghost" small onClick={load.reload}>Try again</Button></div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><b>{title}</b>{children}</div>;
}

// "Saved at 6:42 pm": always the server's time of what it saved
export function Saved({ at, what = "Saved" }: { at: string | null | undefined; what?: string }) {
  if (!at) return null;
  return <div className="notice ok" role="status"><b>{what} at {fmtTime(at)}</b><span>The server confirmed it.</span></div>;
}

// ---------- form fields ----------
export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

type TextProps = { label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; error?: string | null; placeholder?: string; type?: string; autoComplete?: string; maxLength?: number; required?: boolean; testId?: string; inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" };
export function TextInput({ label, value, onChange, hint, error, placeholder, type = "text", autoComplete, maxLength = 200, required, testId, inputMode }: TextProps) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <input id={id} className="input" type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} maxLength={maxLength} required={required}
        inputMode={inputMode} aria-invalid={!!error} data-testid={testId} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

// a note box with Speak (speech to text, in the person's language)
export function TextArea({ label, value, onChange, hint, error, placeholder, rows = 3, maxLength = 3000, testId, speak = true }: Omit<TextProps, "type" | "autoComplete"> & { rows?: number; speak?: boolean }) {
  const id = useId();
  const { me } = useApp();
  const [live, setLive] = useState(false);
  const [interim, setInterim] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const stop = useRef<(() => void) | null>(null);
  const base = useRef(value);
  useEffect(() => () => stop.current?.(), []);
  const toggle = () => {
    if (live) { stop.current?.(); return; }
    setProblem(null);
    base.current = value;
    setLive(true);
    stop.current = listenTo(me?.voiceLanguage ?? "en-IN", (fin, mid) => {
      if (fin) { base.current = (base.current ? base.current.trimEnd() + " " : "") + fin.trim(); onChange(base.current.slice(0, maxLength)); }
      setInterim(mid);
    }, (p) => { setLive(false); setInterim(""); setProblem(p); stop.current = null; });
  };
  return (
    <Field label={label} hint={problem ? undefined : hint} error={problem ?? error} htmlFor={id}>
      <div className="input-wrap">
        <textarea id={id} className="input" rows={rows} value={value + (interim ? (value ? " " : "") + interim : "")} placeholder={placeholder} maxLength={maxLength}
          aria-invalid={!!error} data-testid={testId} data-vm-editing={live ? "1" : undefined} onChange={(e) => { if (!live) onChange(e.target.value); }} />
        {speak && <button type="button" className={"in-btn" + (live ? " live" : "")} onClick={toggle} aria-pressed={live}>{live ? "Stop" : "Speak"}</button>}
      </div>
    </Field>
  );
}

// numbers: a number keyboard, the unit shown inside the box
export function NumberInput({ label, value, onChange, unit, hint, error, decimals = true, testId, placeholder }: {
  label: string; value: number | null | "" ; onChange: (v: number | null) => void; unit?: string; hint?: ReactNode; error?: string | null; decimals?: boolean; testId?: string; placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value === null || value === "" ? "" : String(value));
  useEffect(() => { const n = text === "" ? null : Number(text.replace(/,/g, "")); if ((value ?? null) !== (Number.isFinite(n as number) ? n : null)) setText(value === null || value === "" ? "" : String(value)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [value]);
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className="unit-wrap">
        <input id={id} className="input" inputMode={decimals ? "decimal" : "numeric"} value={text} placeholder={placeholder ?? "0"} data-testid={testId}
          onChange={(e) => {
            const t = e.target.value.replace(decimals ? /[^0-9.,]/g : /[^0-9]/g, "");
            setText(t);
            const n = t === "" ? null : Number(t.replace(/,/g, ""));
            onChange(n === null || Number.isFinite(n) ? n : null);
          }} />
        {unit && <span className="unit">{unit}</span>}
      </div>
    </Field>
  );
}

export function Select<T extends string>({ label, value, onChange, options, hint, error, placeholder, testId }: {
  label: string; value: T | ""; onChange: (v: T) => void; options: { value: T; label: string }[]; hint?: ReactNode; error?: string | null; placeholder?: string; testId?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <select id={id} className="input" value={value} data-testid={testId} onChange={(e) => onChange(e.target.value as T)}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Choice<T extends string>({ label, value, onChange, options, testId }: { label?: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; testId?: string }) {
  return (
    <div className="field">
      {label && <span className="label">{label}</span>}
      <div className="choice" role="group" data-testid={testId}>
        {options.map((o) => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
      </div>
    </div>
  );
}

export function Stepper({ label, value, onChange, min = 0, max = 9999, testId }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; testId?: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <div className="stepper">
        <button type="button" aria-label={`${label}: one less`} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <input id={id} className="input" inputMode="numeric" value={value} data-testid={testId}
          onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, "") || "0", 10); onChange(Math.min(max, Math.max(min, n))); }} />
        <button type="button" aria-label={`${label}: one more`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </Field>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string }[] }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => <button key={t.value} type="button" role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>{t.label}</button>)}
    </div>
  );
}

// ---------- small things ----------
export const Pill = ({ tone, children }: { tone?: "ok" | "warn" | "bad" | "info" | "brand"; children: ReactNode }) => <span className={"pill " + (tone ?? "")}>{children}</span>;

export function Avatar({ name, userId, has, size = "", v }: { name: string; userId?: string | null; has?: boolean; size?: "" | "sm" | "lg" | "xl"; v?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={"avatar " + size} aria-hidden="true">
      {has && userId && !broken ? <img src={`/api/avatar/${userId}${v ? `?v=${encodeURIComponent(v)}` : ""}`} alt="" onError={() => setBroken(true)} /> : initials(name)}
    </span>
  );
}

export function Listen({ text }: { text: string }) {
  const { me } = useApp();
  if (!canListen() || !text) return null;
  return <button type="button" className="link-btn" onClick={() => readAloud(text, me?.voiceLanguage ?? "en-IN")} onBlur={stopReading}>Listen</button>;
}

// ---------- bottom sheet ----------
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} data-vm-editing="1">{children}</div>
    </div>,
    document.body,
  );
}

// ---------- photos ----------
export function PicThumb({ pic, onRemove, label = "Photo" }: { pic: Pic; onRemove?: () => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const src = pic.fileId ? fileUrl(pic.fileId) : pic.legacy ?? "";
  const isPdf = (pic.mime ?? "").includes("pdf");
  return (
    <>
      <span className={"thumb" + (isPdf ? " pdf" : "")}>
        {isPdf ? <a href={src} target="_blank" rel="noopener" className="thumb pdf" style={{ width: "100%", height: "100%" }}>PDF</a>
          : <button type="button" className="thumb" style={{ width: "100%", height: "100%" }} onClick={() => setOpen(true)} aria-label={`Open ${label}`}><img src={src} alt={label} loading="lazy" /></button>}
        {onRemove && <button type="button" className="x" aria-label={`Remove ${label}`} onClick={onRemove}><span aria-hidden="true">×</span></button>}
      </span>
      {open && typeof document !== "undefined" && createPortal(
        <div className="viewer" role="dialog" aria-label={label} onClick={() => setOpen(false)}>
          <div className="bar2"><a className="btn small ghost" href={src + (pic.fileId ? "?download=1" : "")} download onClick={(e) => e.stopPropagation()}>Download</a><button className="btn small" type="button" onClick={() => setOpen(false)}>Close</button></div>
          <img src={src} alt={label} />
        </div>, document.body)}
    </>
  );
}

// add photos (camera or gallery) or a PDF; each one goes to the server at once and shows only once it is stored
export function PhotoPicker({ label, pics, onChange, kind, max = 6, allowPdf = false, testId }: {
  label: string; pics: Pic[]; onChange: (p: Pic[]) => void; kind: string; max?: number; allowPdf?: boolean; testId?: string;
}) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState<ApiError | null>(null);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    const list = Array.from(files).slice(0, Math.max(0, max - pics.length));
    let next = pics;
    for (const f of list) {
      setBusy((n) => n + 1);
      try {
        const s: Stored = await uploadFile(f, kind);
        next = [...next, { fileId: s.id, mime: s.mime }];
        onChange(next);
      } catch (e) {
        setErr(e instanceof ApiError ? e : new ApiError(String(e), "ERROR"));
        if (!(e instanceof ApiError) || !["OFFLINE", "TIMEOUT", "TOO_BIG", "BAD_PHOTO", "NEED_SHIFT"].includes(e.code)) reportProblem(`Photo upload failed: ${(e as Error).message}`, "PhotoPicker");
      } finally {
        setBusy((n) => n - 1);
      }
    }
  };
  return (
    <div className="field" data-testid={testId}>
      <span className="label">{label}</span>
      <div className="thumbs">
        {pics.map((p, i) => <PicThumb key={(p.fileId ?? "") + i} pic={p} label={`${label} ${i + 1}`} onRemove={() => onChange(pics.filter((_, j) => j !== i))} />)}
        {busy > 0 && <span className="thumb add"><span className="spinner" /></span>}
      </div>
      {pics.length < max && (
        <div className="btn-row">
          <Button kind="soft" small onClick={() => cam.current?.click()}>Take photo</Button>
          <Button kind="soft" small onClick={() => gal.current?.click()}>{allowPdf ? "Photo or PDF" : "From gallery"}</Button>
        </div>
      )}
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <input ref={gal} type="file" accept={allowPdf ? "image/*,application/pdf" : "image/*"} multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {busy > 0 && <span className="hint">Sending the photo…</span>}
      {err && <span className="err">{err.message} The photo was not added.</span>}
    </div>
  );
}
