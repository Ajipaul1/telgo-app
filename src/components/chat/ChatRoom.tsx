"use client";
// One chat, with every option of the TechAuditPros chat box: photos (camera or gallery), PDFs, voice
// notes (listen before sending), stickers and emoji, @mentions, Speak (voice typing), Listen (read
// aloud), Seen, message info, change / send again / copy / remove a message, the chat's people,
// add people (admin, group chats), clear chat (for me; the admin: for everyone).
// Everything shown is what the server confirmed; a removed message goes to the File manager's Trash.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useApp } from "../AppContext";
import { Avatar, Button, Empty, ErrorNote, Loaded, Sheet, TextArea } from "../ui";
import { useLoad } from "@/lib/client/hooks";
import { call, newRef, ApiError } from "@/lib/client/api";
import { fileUrl, shrinkImage, uploadFile } from "@/lib/client/device";
import { canListen, listenTo, readAloud } from "@/lib/client/voice";
import { fmtDay, fmtTime, fmtWhen, istDate } from "@/lib/shared/format";
import { ROLE_LABEL, type Role } from "@/lib/shared/roles";
import { bigEmoji, EMOJI, STICKERS } from "@/lib/shared/chat";

type Msg = { id: string; senderId: string; kind: "text" | "photo" | "voice" | "file" | "sticker"; at: string; body: string | null; fileId: string | null; mentions: string[]; removed: boolean; edited: boolean };
type Person = { id: string; fullName: string; role: Role; hasAvatar: boolean; lastReadAt: string | null };
type Thread = { id: string; kind: "team" | "topic" | "direct"; title: string; archived: boolean; canAdd: boolean; canClearAll: boolean };
type Data = { thread: Thread; people: Person[]; messages: Msg[]; more: boolean };

const VOICE_MAX_S = 300;
const fine = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;

export function ChatRoom({ id, mode, onBack, onMinimise, onTitle }: {
  id: string; mode: "page" | "pop"; onBack?: () => void; onMinimise?: () => void; onTitle?: (t: string) => void;
}) {
  const { me, refreshCounts, toast } = useApp();
  const load = useLoad<Data>(`/api/chat/${id}`, { every: 4 });
  const [older, setOlder] = useState<Msg[]>([]);
  const [moreOld, setMoreOld] = useState<boolean | null>(null);
  const [loadingOld, setLoadingOld] = useState(false);
  const [err, setErr] = useState<ApiError | null>(null);
  const [pick, setPick] = useState<Msg | null>(null);
  const [info, setInfo] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const nearEnd = useRef(true);
  const [jump, setJump] = useState(false);
  const lastSeen = useRef<string | null>(null);
  const lastCount = useRef(0);

  // a new chat opened: start fresh
  useEffect(() => { setOlder([]); setMoreOld(null); lastSeen.current = null; lastCount.current = 0; nearEnd.current = true; }, [id]);
  useEffect(() => { if (load.data) onTitle?.(load.data.thread.title); }, [load.data, onTitle]);

  const latest = load.data?.messages;
  const msgs = useMemo(() => {
    const seen = new Set<string>();
    return [...older, ...(latest ?? [])].filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
  }, [older, latest]);
  const people = load.data?.people ?? [];
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // keep to the newest message, unless the person scrolled up to read
  useEffect(() => {
    const el = scroller.current;
    if (!el || !msgs.length) return;
    if (msgs.length !== lastCount.current) {
      const grew = msgs.length > lastCount.current;
      lastCount.current = msgs.length;
      if (nearEnd.current) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
      else if (grew) setJump(true);
    }
  }, [msgs]);
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    nearEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearEnd.current) setJump(false);
  };
  const toEnd = () => { const el = scroller.current; if (el) el.scrollTop = el.scrollHeight; nearEnd.current = true; setJump(false); };

  // read up to the newest message while it is on screen: the others see "Seen"
  useEffect(() => {
    const newest = latest?.[latest.length - 1]?.at ?? null;
    if (!newest || newest === lastSeen.current || document.visibilityState !== "visible") return;
    lastSeen.current = newest;
    call(`/api/chat/${id}/read`, { body: {} }).then(refreshCounts, () => {});
  }, [latest, id, refreshCounts]);

  const earlier = async () => {
    const first = msgs[0];
    if (!first || loadingOld) return;
    setLoadingOld(true); setErr(null);
    const el = scroller.current;
    const h = el?.scrollHeight ?? 0;
    try {
      const r = await call<Data>(`/api/chat/${id}?before=${encodeURIComponent(first.at)}`);
      setOlder((o) => [...r.messages, ...o]);
      setMoreOld(r.more);
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - h; });
    } catch (e) { setErr(e as ApiError); } finally { setLoadingOld(false); }
  };

  const put = useCallback((m: Msg) => {
    load.set((x) => x && { ...x, messages: [...x.messages.filter((y) => y.id !== m.id), m].sort((a, b) => a.at.localeCompare(b.at)) });
    setOlder((o) => o.map((y) => (y.id === m.id ? m : y)));
  }, [load]);
  const drop = (mid: string) => {
    load.set((x) => x && { ...x, messages: x.messages.filter((y) => y.id !== mid) });
    setOlder((o) => o.filter((y) => y.id !== mid));
  };
  const send = async (kind: Msg["kind"], body: string | null, fileId: string | null, mentions: string[] = []) => {
    const r = await call<{ message: Msg }>(`/api/chat/${id}`, { body: { kind, body, fileId, mentions, ref: newRef() } });
    nearEnd.current = true;
    put(r.message);
  };

  const t = load.data?.thread;
  const others = people.filter((p) => p.id !== me?.id);
  const myLast = [...msgs].reverse().find((m) => m.senderId === me?.id);
  const seenBy = myLast ? others.filter((p) => p.lastReadAt && Date.parse(p.lastReadAt) >= Date.parse(myLast.at)) : [];
  const seenWords = !myLast ? "" : t?.kind === "direct" ? (seenBy.length ? "Seen" : "Sent")
    : seenBy.length === 0 ? "Sent" : seenBy.length === others.length ? "Seen by everyone"
    : `Seen by ${seenBy.slice(0, 2).map((p) => p.fullName.split(" ")[0]).join(" and ")}${seenBy.length > 2 ? ` and ${seenBy.length - 2} more` : ""} · ${seenBy.length} of ${others.length}`;
  const sub = !t ? "" : t.kind === "direct" ? ROLE_LABEL[others[0]?.role as Role] ?? "" : `${people.length} people`;

  return (
    <div className={"chat-room " + mode} data-testid="chat-thread">
      <div className="chat-head">
        {onBack && <button type="button" className="chat-head-btn" onClick={onBack} data-testid="chat-back">Back</button>}
        <button type="button" className="chat-head-title" onClick={() => setInfo(true)} data-testid="chat-info">
          <b>{t?.title ?? "Chat"}</b>
          <span>{t ? `${sub ? sub + " · " : ""}tap for options` : "Loading…"}</span>
        </button>
        {onMinimise && <button type="button" className="chat-head-btn" onClick={onMinimise} data-testid="chat-minimise">Minimise</button>}
      </div>

      <div className="chat-scroll" ref={scroller} onScroll={onScroll}>
        <Loaded load={load}>
          {(d) => (
            <div className="chat-thread" data-testid="messages">
              {(moreOld ?? d.more) && msgs.length > 0 && (
                <div className="center"><Button kind="soft" small onClick={earlier} disabled={loadingOld}>{loadingOld ? "Loading…" : "Show earlier messages"}</Button></div>
              )}
              {!msgs.length && <p className="center muted small" style={{ padding: 24 }}>No messages yet. Say hello.</p>}
              {msgs.map((m, i) => {
                const mine = m.senderId === me?.id;
                const day = istDate(m.at);
                const prev = msgs[i - 1];
                const newDay = !prev || istDate(prev.at) !== day;
                const runStart = newDay || !prev || prev.senderId !== m.senderId || Date.parse(m.at) - Date.parse(prev.at) > 10 * 60e3;
                const group = d.thread.kind !== "direct";
                const who = byId.get(m.senderId);
                const big = m.kind === "text" && bigEmoji(m.body);
                return (
                  <Fragment key={m.id}>
                    {newDay && <div className="chat-day">{fmtDay(day)}</div>}
                    <div className={"msg-row" + (mine ? " mine" : "") + (runStart ? " start" : "")}>
                      {!mine && group && (runStart ? <Avatar size="sm" name={who?.fullName ?? "?"} userId={m.senderId} has={who?.hasAvatar} /> : <span className="avatar-gap" />)}
                      <div className={"bubble" + (mine ? " mine" : "") + (m.kind === "sticker" || big ? " plain" : "")} onClick={() => setPick(m)} data-testid="message">
                        {!mine && group && runStart && <div className="who">{who?.fullName ?? "Someone who left"}</div>}
                        {m.kind === "sticker" && m.body && <Sticker k={m.body} />}
                        {m.kind === "photo" && m.fileId && <a href={fileUrl(m.fileId)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}><img src={fileUrl(m.fileId)} alt="Photo" loading="lazy" /></a>}
                        {m.kind === "voice" && m.fileId && <audio controls preload="none" src={fileUrl(m.fileId)} onClick={(e) => e.stopPropagation()} />}
                        {m.kind === "file" && m.fileId && <a className="btn soft small" href={fileUrl(m.fileId)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>Open the PDF</a>}
                        {m.kind !== "sticker" && m.body && (big ? <div className="emoji-big">{m.body}</div> : <div className="text"><Mentioned text={m.body} people={people} me={me?.id} /></div>)}
                        <div className="when">{fmtTime(m.at)}{m.edited ? " · edited" : ""}{mine && m.id === myLast?.id ? ` · ${seenWords}` : ""}</div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          )}
        </Loaded>
      </div>
      {jump && <button type="button" className="chat-jump" onClick={toEnd}>New messages</button>}

      {t?.archived ? (
        <div className="composer"><div className="notice warn grow"><b>Archived</b><span>The admin archived this chat. It can be read, not written in.</span></div></div>
      ) : load.data ? (
        <Composer threadId={id} people={others} err={err} setErr={setErr} send={send} />
      ) : null}

      <MessageMenu m={pick} onClose={() => setPick(null)} people={others} mine={pick?.senderId === me?.id} admin={me?.role === "admin"} kind={t?.kind ?? "direct"}
        onChanged={(m) => { put(m); setPick(null); toast("Changed"); }}
        onRemoved={(mid) => { drop(mid); setPick(null); toast("Removed"); }}
        onAgain={async (m) => { await send(m.kind, m.body, m.fileId, m.mentions); setPick(null); toast("Sent again"); }} />
      <ChatInfo open={info} onClose={() => setInfo(false)} data={load.data} onChanged={() => { load.reload(); setOlder([]); setMoreOld(null); }} />
    </div>
  );
}

// ------------------------------------------------------------------ the writing box
function Composer({ threadId, people, err, setErr, send }: {
  threadId: string; people: Person[]; err: ApiError | null; setErr: (e: ApiError | null) => void;
  send: (kind: Msg["kind"], body: string | null, fileId: string | null, mentions?: string[]) => Promise<void>;
}) {
  const { me } = useApp();
  const [text, setText] = useState("");
  const [tray, setTray] = useState<null | "add" | "stickers">(null);
  const [tab, setTab] = useState("Stickers");
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [interim, setInterim] = useState("");
  const [mention, setMention] = useState<{ q: string; at: number } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const pdf = useRef<HTMLInputElement>(null);
  const stopSpeak = useRef<(() => void) | null>(null);
  const base = useRef("");
  useEffect(() => () => stopSpeak.current?.(), []);
  useEffect(() => { setText(""); setTray(null); setMention(null); }, [threadId]);

  const mentionsIn = (s: string) => people.filter((p) => s.includes("@" + p.fullName)).map((p) => p.id);
  const sendText = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setErr(null);
    try { await send("text", body, null, mentionsIn(body)); setText(""); setMention(null); }
    catch (e) { setErr(e as ApiError); } finally { setSending(false); }
  };
  const sendFile = async (f: File | undefined | null, kind: "photo" | "file" | "voice") => {
    if (!f) return;
    setSending(true); setErr(null); setTray(null);
    try {
      const file = kind === "photo" ? await shrinkImage(f) : f;
      const s = await uploadFile(file, kind === "voice" ? "voice" : "chat");
      const caption = kind === "voice" ? null : text.trim() || null;
      await send(kind, caption, s.id, caption ? mentionsIn(caption) : []);
      if (caption) setText("");
    } catch (e) { setErr(e as ApiError); } finally { setSending(false); }
  };
  const sticker = async (k: string) => {
    setSending(true); setErr(null);
    try { await send("sticker", k, null); setTray(null); } catch (e) { setErr(e as ApiError); } finally { setSending(false); }
  };
  const insert = (s: string) => {
    const el = box.current;
    const at = el?.selectionStart ?? text.length;
    const next = (text.slice(0, at) + s + text.slice(el?.selectionEnd ?? at)).slice(0, 4000);
    setText(next);
    requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = at + s.length; } });
  };
  const onType = (v: string) => {
    setText(v);
    const at = box.current?.selectionStart ?? v.length;
    const m = /(^|\s)@([^\s@]{0,20})$/.exec(v.slice(0, at));
    setMention(m && people.length ? { q: m[2].toLowerCase(), at: at - m[2].length - 1 } : null);
  };
  const pickMention = (p: Person) => {
    if (!mention) return;
    const at = box.current?.selectionStart ?? text.length;
    const next = text.slice(0, mention.at) + "@" + p.fullName + " " + text.slice(at);
    setText(next.slice(0, 4000));
    setMention(null);
    requestAnimationFrame(() => { const el = box.current; if (el) { el.focus(); el.selectionStart = el.selectionEnd = mention.at + p.fullName.length + 2; } });
  };
  const speak = () => {
    if (live) { stopSpeak.current?.(); return; }
    setErr(null);
    base.current = text;
    setLive(true);
    stopSpeak.current = listenTo(me?.voiceLanguage ?? "en-IN", (fin, mid) => {
      if (fin) { base.current = (base.current ? base.current.trimEnd() + " " : "") + fin.trim(); setText(base.current.slice(0, 4000)); }
      setInterim(mid);
    }, (p) => { setLive(false); setInterim(""); stopSpeak.current = null; if (p) setErr(new ApiError(p, "VOICE")); });
  };
  const matches = mention ? people.filter((p) => p.fullName.toLowerCase().split(/\s+/).some((w) => w.startsWith(mention.q)) || p.fullName.toLowerCase().startsWith(mention.q)).slice(0, 6) : [];

  return (
    <div className="composer" data-vm-editing={text || tray || live ? "1" : undefined}>
      <div className="grow stack tight">
        {err && <ErrorNote error={err} />}
        {matches.length > 0 && (
          <div className="mention-list" role="listbox" aria-label="Mention someone">
            {matches.map((p) => <button key={p.id} type="button" role="option" aria-selected="false" onClick={() => pickMention(p)}><Avatar size="sm" name={p.fullName} userId={p.id} has={p.hasAvatar} /> {p.fullName}</button>)}
          </div>
        )}
        {tray === "add" && (
          <div className="tray" data-testid="tray-add">
            <Button kind="soft" small onClick={() => cam.current?.click()} disabled={sending}>Camera</Button>
            <Button kind="soft" small onClick={() => gallery.current?.click()} disabled={sending}>Photo from the phone</Button>
            <Button kind="soft" small onClick={() => pdf.current?.click()} disabled={sending}>PDF</Button>
            <p className="tiny muted" style={{ flexBasis: "100%" }}>What you type in the box goes with the photo or PDF.</p>
          </div>
        )}
        {tray === "stickers" && (
          <div className="tray stickers" data-testid="tray-stickers">
            <div className="tabs" role="tablist">
              {["Stickers", ...EMOJI.map((e) => e.tab)].map((x) => <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)}>{x}</button>)}
            </div>
            {tab === "Stickers" ? (
              <div className="sticker-grid">
                {Object.keys(STICKERS).map((k) => <button key={k} type="button" onClick={() => sticker(k)} disabled={sending} data-testid={`sticker-${k}`}><Sticker k={k} /></button>)}
              </div>
            ) : (
              <div className="emoji-grid">
                {EMOJI.find((e) => e.tab === tab)?.list.map((e) => <button key={e} type="button" onClick={() => insert(e)}>{e}</button>)}
              </div>
            )}
          </div>
        )}
        <VoiceNote disabled={sending} onSend={(f) => sendFile(f, "voice")} onProblem={(p) => setErr(new ApiError(p, "MIC"))}>
          <div className="input-wrap">
            <textarea ref={box} className="input chat-input" rows={1} value={text + (interim ? (text ? " " : "") + interim : "")} maxLength={4000}
              placeholder={people.length > 1 ? "Message · @ to mention" : "Message"} aria-label="Message" data-testid="chat-text"
              onChange={(e) => { if (!live) onType(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && fine()) { e.preventDefault(); sendText(); } }} />
            <button type="button" className={"in-btn" + (live ? " live" : "")} onClick={speak} aria-pressed={live}>{live ? "Stop" : "Speak"}</button>
          </div>
          {(rec, voice) => (
            <div className="row">
              {!rec && <Button kind={tray === "add" ? "primary" : "soft"} small onClick={() => setTray(tray === "add" ? null : "add")} testId="chat-add">Add</Button>}
              {!rec && <Button kind={tray === "stickers" ? "primary" : "soft"} small onClick={() => setTray(tray === "stickers" ? null : "stickers")} testId="chat-stickers">Stickers</Button>}
              {voice}
              <span className="grow" />
              <Button small onClick={sendText} disabled={!text.trim() || sending || rec} testId="chat-send">{sending ? "Sending…" : "Send"}</Button>
            </div>
          )}
        </VoiceNote>
      </div>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { sendFile(e.target.files?.[0], "photo"); e.target.value = ""; }} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => { sendFile(e.target.files?.[0], "photo"); e.target.value = ""; }} data-testid="chat-photo" />
      <input ref={pdf} type="file" accept="application/pdf" hidden onChange={(e) => { sendFile(e.target.files?.[0], "file"); e.target.value = ""; }} />
    </div>
  );
}

// record → stop → listen → send or delete (5 minutes at most)
function VoiceNote({ disabled, onSend, onProblem, children }: {
  disabled: boolean; onSend: (f: File) => void; onProblem: (p: string) => void; children: [ReactNode, (recording: boolean, voiceButton: ReactNode) => ReactNode];
}) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [take, setTake] = useState<{ file: File; url: string } | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => () => { if (take) URL.revokeObjectURL(take.url); }, [take]);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find((x) => MediaRecorder.isTypeSupported?.(x)) ?? "";
      const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((x) => x.stop());
        if (timer.current) clearInterval(timer.current);
        setRec(null);
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        if (blob.size > 0) {
          const file = new File([blob], `voice.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`, { type: blob.type });
          setTake({ file, url: URL.createObjectURL(blob) });
        }
      };
      r.start();
      setRec(r); setSecs(0);
      const began = Date.now();
      timer.current = window.setInterval(() => {
        const s = Math.round((Date.now() - began) / 1000);
        setSecs(s);
        if (s >= VOICE_MAX_S && r.state === "recording") r.stop();
      }, 500);
    } catch { onProblem("The microphone is blocked or missing. Allow it in the phone's settings."); }
  };
  if (take) {
    return (
      <div className="card" style={{ padding: 12 }} data-testid="voice-take">
        <b className="small">Your voice note</b>
        <audio controls src={take.url} />
        <div className="btn-row">
          <Button kind="ghost" small onClick={() => setTake(null)}>Delete</Button>
          <Button small onClick={() => { const f = take.file; setTake(null); onSend(f); }} disabled={disabled}>Send it</Button>
        </div>
      </div>
    );
  }
  return (
    <>
      {rec ? <div className="notice bad"><b>Recording… {secs} s</b><span>Tap Stop, then listen before sending (5 minutes at most).</span></div> : children[0]}
      {children[1](!!rec, <Button kind={rec ? "danger" : "soft"} small onClick={() => (rec ? rec.stop() : start())} disabled={disabled && !rec} testId="chat-voice">{rec ? "Stop" : "Voice"}</Button>)}
    </>
  );
}

// ------------------------------------------------------------------ one message: what can be done
function MessageMenu({ m, onClose, people, mine, admin, kind, onChanged, onRemoved, onAgain }: {
  m: Msg | null; onClose: () => void; people: Person[]; mine: boolean; admin: boolean; kind: string;
  onChanged: (m: Msg) => void; onRemoved: (id: string) => void; onAgain: (m: Msg) => Promise<void>;
}) {
  const { me, toast } = useApp();
  const [step, setStep] = useState<"menu" | "info" | "edit" | "remove">("menu");
  const [text, setText] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  useEffect(() => { setStep("menu"); setErr(null); setText(m?.body ?? ""); }, [m]);
  if (!m) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(m.body ?? ""); toast("Copied"); onClose(); }
    catch { setErr(new ApiError("This phone didn't allow copying. Press and hold the words to copy them.", "COPY")); }
  };
  const edit = async () => {
    setErr(null);
    try { const r = await call<{ message: Msg }>(`/api/chat/message/${m.id}`, { body: { action: "edit", body: text } }); onChanged(r.message); }
    catch (e) { setErr(e as ApiError); }
  };
  const remove = async () => {
    setErr(null);
    try { await call(`/api/chat/message/${m.id}`, { body: { action: "remove" } }); onRemoved(m.id); }
    catch (e) { setErr(e as ApiError); }
  };
  const again = async () => { setErr(null); try { await onAgain(m); } catch (e) { setErr(e as ApiError); } };
  const hasText = m.kind === "text" && !!m.body;
  return (
    <Sheet open onClose={onClose} label="Message">
      {step === "menu" && (
        <>
          <h2>Message</h2>
          <p className="small muted">{mine ? "You" : people.find((p) => p.id === m.senderId)?.fullName ?? "Someone"} · {fmtWhen(m.at)}{m.edited ? " · edited" : ""}</p>
          <div className="stack tight" data-testid="message-menu">
            {mine && <Button kind="ghost" block onClick={() => setStep("info")}>Message info (who has seen it)</Button>}
            {mine && hasText && <Button kind="ghost" block onClick={() => setStep("edit")} testId="msg-edit">Change the message</Button>}
            {mine && <Button kind="ghost" block onClick={again} busyText="Sending…">Send again</Button>}
            {hasText && <Button kind="ghost" block onClick={copy}>Copy the words</Button>}
            {hasText && canListen() && <Button kind="ghost" block onClick={() => { readAloud(m.body!, me?.voiceLanguage ?? "en-IN"); onClose(); }}>Read it aloud</Button>}
            {(mine || admin) && <Button kind="danger" block onClick={() => setStep("remove")} testId="msg-remove">Remove the message</Button>}
            <Button kind="soft" block onClick={onClose}>Close</Button>
          </div>
        </>
      )}
      {step === "info" && (
        <>
          <h2>Who has seen it</h2>
          <div className="list" style={{ boxShadow: "none" }}>
            {people.map((p) => {
              const seen = p.lastReadAt && Date.parse(p.lastReadAt) >= Date.parse(m.at);
              return (
                <div key={p.id} className="item" style={{ minHeight: 56 }}>
                  <Avatar size="sm" name={p.fullName} userId={p.id} has={p.hasAvatar} />
                  <div className="grow"><div className="title">{p.fullName}</div><div className="sub">{seen ? `Seen · ${fmtWhen(p.lastReadAt)}` : "Not seen yet"}</div></div>
                </div>
              );
            })}
            {!people.length && <Empty title="No one else is in this chat" />}
          </div>
          <Button kind="soft" block onClick={() => setStep("menu")}>Back</Button>
        </>
      )}
      {step === "edit" && (
        <>
          <h2>Change the message</h2>
          <TextArea label="Message" value={text} onChange={setText} rows={4} maxLength={4000} testId="msg-edit-text" />
          <p className="tiny muted">Everyone sees that it was changed.</p>
          {err && <ErrorNote error={err} />}
          <div className="btn-row"><Button kind="ghost" onClick={() => setStep("menu")}>Back</Button><Button onClick={edit} disabled={!text.trim() || text.trim() === m.body} busyText="Saving…" testId="msg-edit-save">Save</Button></div>
        </>
      )}
      {step === "remove" && (
        <>
          <h2>Remove this message?</h2>
          <p className="muted">It leaves the chat for everyone{kind === "direct" ? "" : " in it"} now. The File manager keeps it in the Trash for 90 days.</p>
          {err && <ErrorNote error={err} />}
          <div className="btn-row"><Button kind="ghost" onClick={() => setStep("menu")}>Keep it</Button><Button kind="danger" onClick={remove} busyText="Removing…" testId="msg-remove-yes">Remove</Button></div>
        </>
      )}
      {step === "menu" && err && <ErrorNote error={err} />}
    </Sheet>
  );
}

// ------------------------------------------------------------------ the chat: people and options
function ChatInfo({ open, onClose, data, onChanged }: { open: boolean; onClose: () => void; data: Data | null; onChanged: () => void }) {
  const { me, toast, refreshCounts } = useApp();
  const [step, setStep] = useState<"main" | "add" | "clear-me" | "clear-all">("main");
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState<ApiError | null>(null);
  const cands = useLoad<{ people: { id: string; fullName: string; role: Role; hasAvatar: boolean }[] }>(open && step === "add" ? "/api/chat/people" : null);
  useEffect(() => { if (open) { setStep("main"); setPicked([]); setErr(null); } }, [open]);
  if (!data) return null;
  const t = data.thread;
  const inChat = new Set(data.people.map((p) => p.id));
  const clear = async (who: "me" | "everyone") => {
    setErr(null);
    try {
      await call(`/api/chat/${t.id}/clear`, { body: { for: who } });
      toast(who === "me" ? "Cleared for you" : "Cleared for everyone");
      refreshCounts(); onChanged(); onClose();
    } catch (e) { setErr(e as ApiError); }
  };
  const add = async () => {
    setErr(null);
    try { const r = await call<{ added: number }>(`/api/chat/${t.id}/people`, { body: { members: picked } }); toast(`${r.added} added`); onChanged(); onClose(); }
    catch (e) { setErr(e as ApiError); }
  };
  return (
    <Sheet open={open} onClose={onClose} label="Chat people and options">
      {step === "main" && (
        <>
          <h2>{t.title}</h2>
          <div className="section-title" style={{ margin: 0 }}>{data.people.length} people</div>
          <div className="list" style={{ boxShadow: "none", maxHeight: "40dvh", overflowY: "auto" }} data-testid="chat-members">
            {data.people.map((p) => (
              <div key={p.id} className="item" style={{ minHeight: 56 }}>
                <Avatar size="sm" name={p.fullName} userId={p.id} has={p.hasAvatar} />
                <div className="grow"><div className="title">{p.fullName}{p.id === me?.id ? " (you)" : ""}</div><div className="sub">{ROLE_LABEL[p.role] ?? p.role}</div></div>
              </div>
            ))}
          </div>
          <div className="stack tight">
            {t.canAdd && !t.archived && <Button kind="ghost" block onClick={() => setStep("add")} testId="chat-add-people">Add people</Button>}
            <Button kind="ghost" block onClick={() => setStep("clear-me")} testId="chat-clear-me">Clear chat for me</Button>
            {t.canClearAll && <Button kind="danger" block onClick={() => setStep("clear-all")} testId="chat-clear-all">Clear chat for everyone</Button>}
            <Button kind="soft" block onClick={onClose}>Close</Button>
          </div>
        </>
      )}
      {step === "add" && (
        <>
          <h2>Add people</h2>
          <Loaded load={cands} isEmpty={(d) => !d.people.some((p) => !inChat.has(p.id))} empty={<Empty title="Everyone is already in this chat" />}>
            {(d) => (
              <div className="chips">
                {d.people.filter((p) => !inChat.has(p.id)).map((p) => {
                  const on = picked.includes(p.id);
                  return <button key={p.id} type="button" className={"chip" + (on ? " on" : "")} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}>{p.fullName} <span className="muted tiny">{ROLE_LABEL[p.role]}</span></button>;
                })}
              </div>
            )}
          </Loaded>
          <p className="tiny muted">They are told, and they can read the earlier messages too.</p>
          {err && <ErrorNote error={err} />}
          <div className="btn-row"><Button kind="ghost" onClick={() => setStep("main")}>Back</Button><Button onClick={add} disabled={!picked.length} busyText="Adding…">Add {picked.length || ""}</Button></div>
        </>
      )}
      {step === "clear-me" && (
        <>
          <h2>Clear this chat for you?</h2>
          <p className="muted">The messages leave your phone&apos;s view of this chat. Everyone else keeps them. New messages still come in.</p>
          {err && <ErrorNote error={err} />}
          <div className="btn-row"><Button kind="ghost" onClick={() => setStep("main")}>Keep them</Button><Button kind="danger" onClick={() => clear("me")} busyText="Clearing…" testId="chat-clear-me-yes">Clear for me</Button></div>
        </>
      )}
      {step === "clear-all" && (
        <>
          <h2>Clear this chat for everyone?</h2>
          <p className="muted">Every message leaves the chat for all {data.people.length} people now. The File manager keeps them in the Trash for 90 days.</p>
          {err && <ErrorNote error={err} />}
          <div className="btn-row"><Button kind="ghost" onClick={() => setStep("main")}>Keep them</Button><Button kind="danger" onClick={() => clear("everyone")} busyText="Clearing…" testId="chat-clear-all-yes">Clear for everyone</Button></div>
        </>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------------ small parts
export function Sticker({ k }: { k: string }) {
  const s = STICKERS[k];
  if (!s) return <span className="muted small">(a sticker this app doesn&apos;t know)</span>;
  return <span className="sticker" style={{ background: `linear-gradient(135deg, ${s[2]}, ${s[3]})` }}><span className="e" aria-hidden="true">{s[1]}</span>{s[0]}</span>;
}

// @Full Name of someone in the chat is shown highlighted (text only, never HTML)
function Mentioned({ text, people, me }: { text: string; people: Person[]; me?: string }) {
  const names = people.map((p) => ({ n: "@" + p.fullName, mine: p.id === me })).filter((x) => x.n.length > 1).sort((a, b) => b.n.length - a.n.length);
  if (!names.length || !text.includes("@")) return <>{text}</>;
  const out: ReactNode[] = [];
  let rest = text, key = 0;
  while (rest) {
    let best = -1, hit: (typeof names)[number] | null = null;
    for (const x of names) { const i = rest.indexOf(x.n); if (i >= 0 && (best < 0 || i < best)) { best = i; hit = x; } }
    if (!hit) { out.push(rest); break; }
    if (best > 0) out.push(rest.slice(0, best));
    out.push(<span key={key++} className={"mention" + (hit.mine ? " me" : "")}>{hit.n}</span>);
    rest = rest.slice(best + hit.n.length);
  }
  return <>{out}</>;
}

