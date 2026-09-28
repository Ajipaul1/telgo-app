"use client";
// Profile (all roles): photo, name and phone, voice language, password, and signing out on every phone.
import { useEffect, useRef, useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp, type MeView } from "@/components/AppContext";
import { Avatar, Button, ErrorNote, Pill, Saved, Select, Sheet, TextInput } from "@/components/ui";
import { call, saveResume, ApiError } from "@/lib/client/api";
import { canListen, canSpeak, readAloud } from "@/lib/client/voice";
import { fmtTime, fmtWhen } from "@/lib/shared/format";
import { VOICE_LANGS, VOICE_LABEL, type VoiceLang } from "@/lib/shared/voice";
import { ROLE_LABEL } from "@/lib/shared/roles";
import { squarePhoto } from "./_parts/squarePhoto";

// what /api/me (PATCH) and /api/me/photo send back: the saved row, without the voice language
type PersonReply = Omit<MeView, "voiceLanguage" | "isTest">;
const asErr = (e: unknown) => (e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e), "ERROR"));
const langWord = (l: string) => VOICE_LABEL[l as VoiceLang] ?? l;

export default function ProfilePage() {
  const { me } = useApp();
  return (
    <Screen title="Profile" testId="profile">
      {me && (
        <>
          <HeadCard me={me} />
          <PhotoCard />
          <DetailsCard />
          <VoiceCard />
          <PasswordCard />
          <PhonesCard />
        </>
      )}
    </Screen>
  );
}

function HeadCard({ me }: { me: MeView }) {
  return (
    <div className="card pad-lg" data-testid="profile-head" style={{ alignItems: "center", textAlign: "center" }}>
      <Avatar name={me.fullName} userId={me.id} has={me.hasAvatar} size="xl" v={me.updatedAt} />
      <h1 style={{ overflowWrap: "anywhere" }}>{me.fullName}</h1>
      <Pill tone="brand">{ROLE_LABEL[me.role] ?? me.role}</Pill>
      <dl className="kv" style={{ width: "100%", textAlign: "left" }}>
        <dt>Login ID</dt><dd data-testid="profile-login-id">{me.loginId || "not recorded"}</dd>
        <dt>Email</dt><dd style={{ overflowWrap: "anywhere" }}>{me.email || "not recorded"}</dd>
        <dt>Phone</dt><dd>{me.phone || "not recorded"}</dd>
      </dl>
    </div>
  );
}

// ---------- photo: camera or gallery, made a centred square on the phone ----------
function PhotoCard() {
  const { me, setMe, toast } = useApp();
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  if (!me) return null;

  const send = async (f: File | undefined) => {
    if (!f || busy) return;
    setErr(null);
    setBusy(true);
    try {
      const photo = await squarePhoto(f);
      const form = new FormData();
      form.append("file", photo);
      const r = await call<{ me: PersonReply }>("/api/me/photo", { form, timeoutMs: 60000 });
      setMe({ ...me, ...r.me });
      toast(`Photo saved at ${fmtTime(r.serverTime)}.`);
    } catch (e) { setErr(asErr(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card" data-testid="profile-photo">
      <h2>Photo</h2>
      <p className="small muted">{me.hasAvatar ? "Your photo shows in the menu, in chats and to the admin." : "No photo yet. Add one so the team knows who sent what."} The middle square of the picture is used.</p>
      <div className="btn-row">
        <Button kind="soft" onClick={() => cam.current?.click()} disabled={busy} testId="photo-camera">Take photo</Button>
        <Button kind="soft" onClick={() => gal.current?.click()} disabled={busy} testId="photo-gallery">From gallery</Button>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="user" hidden data-testid="photo-camera-input" onChange={(e) => { send(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={gal} type="file" accept="image/*" hidden data-testid="photo-gallery-input" onChange={(e) => { send(e.target.files?.[0]); e.target.value = ""; }} />
      {busy && <div className="notice info" role="status"><span className="row"><span className="spinner" />Sending the photo…</span></div>}
      {err && <ErrorNote error={err} title="The photo wasn't saved" />}
    </div>
  );
}

// ---------- name and phone (carries the version the form showed) ----------
function DetailsCard() {
  const { me, setMe, refreshCounts } = useApp();
  const m = me!;
  const [base, setBase] = useState(() => ({ fullName: m.fullName, phone: m.phone ?? "", at: m.updatedAt }));
  const [name, setName] = useState(m.fullName);
  const [phone, setPhone] = useState(m.phone ?? "");
  const [err, setErr] = useState<ApiError | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirty = name !== base.fullName || phone !== base.phone;

  // live, never under your hands: a newer profile replaces the form only when nothing was typed;
  // a newer version whose name and phone are still what the form started from is simply adopted
  useEffect(() => {
    if (m.updatedAt === base.at) return;
    if (m.fullName === base.fullName && (m.phone ?? "") === base.phone) setBase((b) => ({ ...b, at: m.updatedAt }));
    else if (!dirty) { setBase({ fullName: m.fullName, phone: m.phone ?? "", at: m.updatedAt }); setName(m.fullName); setPhone(m.phone ?? ""); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.updatedAt, m.fullName, m.phone]);

  const latest = () => {
    setBase({ fullName: m.fullName, phone: m.phone ?? "", at: m.updatedAt });
    setName(m.fullName); setPhone(m.phone ?? "");
    setErr(null);
  };

  const save = async () => {
    setErr(null); setSavedAt(null);
    try {
      const r = await call<{ me: PersonReply }>("/api/me", { method: "PATCH", body: { fullName: name.trim(), phone: phone.trim(), expected: base.at } });
      setMe({ ...m, ...r.me });
      setBase({ fullName: r.me.fullName, phone: r.me.phone ?? "", at: r.me.updatedAt });
      setName(r.me.fullName); setPhone(r.me.phone ?? "");
      setSavedAt(r.serverTime);
    } catch (e) {
      const x = asErr(e);
      setErr(x);
      if (x.code === "CHANGED") refreshCounts();
    }
  };

  const nameProblem = name.trim().length < 2 ? "Your name: at least 2 characters." : null;
  return (
    <div className="card" data-testid="profile-details" data-vm-editing={dirty ? "1" : undefined}>
      <h2>Your details</h2>
      <TextInput label="Your name" value={name} onChange={(v) => { setName(v); setSavedAt(null); }} autoComplete="name" maxLength={80} testId="profile-name"
        error={dirty && nameProblem ? nameProblem : null} />
      <TextInput label="Phone number" value={phone} onChange={(v) => { setPhone(v); setSavedAt(null); }} type="tel" inputMode="tel" autoComplete="tel" maxLength={20}
        placeholder="+91 98470 12345" hint="Leave it empty if you don't want it recorded." testId="profile-phone" />
      {err && <ErrorNote error={err} />}
      {err?.code === "CHANGED" && <div><Button kind="ghost" small onClick={latest} testId="profile-load-latest">Load the latest</Button></div>}
      <Saved at={savedAt} />
      <Button block onClick={save} disabled={!dirty || !!nameProblem} busyText="Saving…" testId="profile-save">Save my details</Button>
    </div>
  );
}

// ---------- voice language for Speak and Listen ----------
function VoiceCard() {
  const { me, setMe, refreshCounts } = useApp();
  const m = me!;
  const [pending, setPending] = useState<VoiceLang | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [can, setCan] = useState<{ speak: boolean; listen: boolean } | null>(null);
  const [voices, setVoices] = useState<string[]>([]);
  const [played, setPlayed] = useState<string | null>(null);

  // what this phone can do is only known on the phone itself
  useEffect(() => {
    setCan({ speak: canSpeak(), listen: canListen() });
    if (!canListen()) return;
    const read = () => setVoices(window.speechSynthesis.getVoices().map((v) => v.lang.toLowerCase()));
    read();
    window.speechSynthesis.addEventListener?.("voiceschanged", read);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", read);
  }, []);

  const lang = (pending ?? m.voiceLanguage) as VoiceLang;
  const hasVoice = voices.length ? voices.some((v) => v.startsWith(lang.slice(0, 2).toLowerCase())) : null;

  const choose = async (v: VoiceLang) => {
    if (pending || v === m.voiceLanguage) return;
    setErr(null); setSavedAt(null); setPlayed(null); setPending(v);
    try {
      const r = await call<{ me: PersonReply }>("/api/me", { method: "PATCH", body: { voiceLanguage: v, expected: m.updatedAt } });
      // the reply doesn't carry the language: read back what the server now has
      const now = await call<{ me: MeView }>("/api/me");
      setMe({ ...m, ...r.me, ...now.me });
      if (now.me.voiceLanguage !== v) throw new ApiError(`The server still has ${langWord(now.me.voiceLanguage)}. Choose again.`, "NOT_SAVED");
      setSavedAt(r.serverTime);
    } catch (e) {
      const x = asErr(e);
      setErr(x);
      if (x.code === "CHANGED") refreshCounts();
    } finally { setPending(null); }
  };

  return (
    <div className="card" data-testid="profile-voice">
      <h2>Voice</h2>
      <p className="small muted">The language for Speak (say a note instead of typing it) and Listen (the app reads a message aloud).</p>
      <Select<VoiceLang> label="Voice language" value={lang} onChange={choose} testId="profile-voice-lang"
        options={VOICE_LANGS.map((l) => ({ value: l, label: VOICE_LABEL[l] }))}
        hint={pending ? `Saving ${langWord(pending)}…` : undefined} />
      {err && <ErrorNote error={err} />}
      <Saved at={savedAt} what={`${langWord(m.voiceLanguage)} saved`} />
      {can && (
        <dl className="kv">
          <dt>Speak on this phone</dt><dd data-testid="profile-can-speak">{can.speak ? "Works" : "Not available"}</dd>
          <dt>Listen on this phone</dt><dd>{can.listen ? "Works" : "Not available"}</dd>
        </dl>
      )}
      {can && !can.speak && <p className="small muted">This browser can&apos;t turn speech into text. Use the microphone key on the phone&apos;s keyboard instead.</p>}
      {can?.listen && hasVoice === false && <p className="small muted">This phone has no {langWord(lang)} voice installed, so Listen uses its default voice. You can add one in the phone&apos;s text-to-speech settings.</p>}
      <Button kind="soft" block disabled={!can?.listen} testId="profile-test-listen"
        onClick={() => { const ok = readAloud("Telgo app voice test", lang); setPlayed(ok ? `Playing the test in ${langWord(lang)}. Turn the volume up if you hear nothing.` : "This phone can't read aloud."); }}>
        Test Listen
      </Button>
      {played && <p className="small muted" role="status">{played}</p>}
    </div>
  );
}

// ---------- password ----------
function PasswordCard() {
  const { setMe, toast } = useApp();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [doneAt, setDoneAt] = useState<string | null>(null);
  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = again.length > 0 && next !== again;
  const typing = !!(current || next || again);

  const save = async () => {
    setErr(null); setDoneAt(null);
    try {
      const r = await call<{ changedAt: string }>("/api/auth/change-password", { body: { current, next } });
      setCurrent(""); setNext(""); setAgain("");
      setDoneAt(r.serverTime);
      toast(`Password changed at ${fmtTime(r.serverTime)}. Other phones were signed out.`);
      // the login's row changed on the server: take its new version so the other forms keep working
      try { const now = await call<{ me: MeView }>("/api/me"); setMe(now.me); } catch { /* the next refresh brings it */ }
    } catch (e) { setErr(asErr(e)); }
  };

  return (
    <div className="card" data-testid="profile-password" data-vm-editing={typing ? "1" : undefined}>
      <h2>Password</h2>
      <p className="small muted">Changing it signs out every other phone that uses your login. This phone stays signed in.</p>
      <TextInput label="Current password" type="password" value={current} onChange={setCurrent} autoComplete="current-password" maxLength={128} testId="pw-current" />
      <TextInput label="New password" type="password" value={next} onChange={setNext} autoComplete="new-password" maxLength={128} testId="pw-new"
        hint="At least 8 characters." error={tooShort ? "At least 8 characters." : null} />
      <TextInput label="New password again" type="password" value={again} onChange={setAgain} autoComplete="new-password" maxLength={128} testId="pw-again"
        error={mismatch ? "The two new passwords are not the same." : null} />
      {err && <ErrorNote error={err} />}
      <Saved at={doneAt} what="Password changed" />
      <Button block onClick={save} disabled={!current || next.length < 8 || next !== again} busyText="Changing…" testId="pw-save">Change password</Button>
    </div>
  );
}

// ---------- every phone signed in with this login ----------
function PhonesCard() {
  const { me } = useApp();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  if (!me) return null;

  const everywhere = async () => {
    setErr(null);
    let pushEndpoint: string | undefined;
    try { const reg = await navigator.serviceWorker?.getRegistration(); pushEndpoint = (await reg?.pushManager.getSubscription())?.endpoint; } catch { /* no push on this phone */ }
    try {
      await call("/api/auth/sign-out", { body: { everywhere: true, pushEndpoint }, quietSignOut: true });
      saveResume(null);
      location.replace("/login?why=everywhere");
    } catch (e) { setErr(asErr(e)); }
  };

  return (
    <div className="card" data-testid="profile-phones">
      <h2>Signed-in phones</h2>
      <dl className="kv"><dt>Signed in last</dt><dd data-testid="profile-last-sign-in">{fmtWhen(me.lastSignIn)}</dd></dl>
      <p className="small muted">Lost a phone, or signed in on someone else&apos;s? Sign out everywhere. You then sign in again with your password, on this phone too.</p>
      <Button kind="danger" block onClick={() => { setErr(null); setOpen(true); }} testId="sign-out-everywhere">Sign out on all phones</Button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Sign out on all phones">
        <h2>Sign out on all phones?</h2>
        <p className="muted">Every phone signed in as {me.loginId || me.fullName}, this one too, is signed out now.</p>
        {err && <ErrorNote error={err} />}
        <div className="btn-row">
          <Button kind="ghost" onClick={() => setOpen(false)}>Not now</Button>
          <Button kind="danger" onClick={everywhere} busyText="Signing out…" testId="sign-out-everywhere-confirm">Sign out all</Button>
        </div>
      </Sheet>
    </div>
  );
}
