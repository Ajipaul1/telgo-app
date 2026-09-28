"use client";
import { Fragment, use, useEffect, useRef, useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, ErrorNote, Listen, Loaded, Sheet, TextArea } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { call, newRef, ApiError } from "@/lib/client/api";
import { fileUrl, uploadFile } from "@/lib/client/device";
import { fmtDay, fmtTime, istDate } from "@/lib/shared/format";

type Msg = { id: string; senderId: string; kind: "text" | "photo" | "voice" | "file"; at: string; body: string | null; fileId: string | null; removed: boolean };
type Data = { thread: { id: string; kind: string; title: string }; people: { id: string; fullName: string; role: string; lastReadAt: string | null }[]; messages: Msg[] };

export default function ChatThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, setTitle, refreshCounts } = useApp();
  const load = useLoad<Data>(`/api/chat/${id}`, { every: 4 });
  const [text, setText] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [sending, setSending] = useState(false);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [recSecs, setRecSecs] = useState(0);
  const [pick, setPick] = useState<Msg | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const photoIn = useRef<HTMLInputElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const lastSeen = useRef<string | null>(null);
  const msgs = load.data?.messages ?? [];

  useEffect(() => { if (load.data) setTitle(load.data.thread.title); }, [load.data, setTitle]);
  // read up to the newest message: the others see "Seen"
  useEffect(() => {
    const newest = msgs[msgs.length - 1]?.at ?? null;
    if (!newest || newest === lastSeen.current || document.visibilityState !== "visible") return;
    lastSeen.current = newest;
    call(`/api/chat/${id}/read`, { body: {} }).then(refreshCounts, () => {});
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, id, refreshCounts]);

  const send = async (kind: Msg["kind"], body: string | null, fileId: string | null) => {
    setErr(null);
    const r = await call<{ message: Msg }>(`/api/chat/${id}`, { body: { kind, body, fileId, ref: newRef() } });
    load.set((x) => x && { ...x, messages: [...x.messages.filter((m) => m.id !== r.message.id), r.message] });
  };
  const sendText = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { await send("text", text.trim(), null); setText(""); } catch (e) { setErr(e as ApiError); } finally { setSending(false); }
  };
  const sendFile = async (f: File | undefined, kind: "photo" | "file" | "voice") => {
    if (!f) return;
    setSending(true); setErr(null);
    try { const s = await uploadFile(f, kind === "voice" ? "voice" : "chat"); await send(kind, text.trim() || null, s.id); setText(""); }
    catch (e) { setErr(e as ApiError); } finally { setSending(false); }
  };
  const record = async () => {
    if (rec) { rec.stop(); return; }
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";
      const r = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRec(null);
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        if (blob.size > 0) sendFile(new File([blob], `voice.${blob.type.includes("mp4") ? "m4a" : "webm"}`, { type: blob.type }), "voice");
      };
      r.start();
      setRec(r); setRecSecs(0);
      const started = Date.now();
      const t = setInterval(() => { const s = Math.round((Date.now() - started) / 1000); setRecSecs(s); if (s >= 120 || r.state !== "recording") { clearInterval(t); if (r.state === "recording") r.stop(); } }, 500);
    } catch { setErr(new ApiError("The microphone is blocked or missing. Allow it in the phone's settings.", "MIC")); }
  };
  const remove = async (m: Msg) => {
    try { await call(`/api/chat/message/${m.id}`, { body: {} }); load.set((x) => x && { ...x, messages: x.messages.filter((y) => y.id !== m.id) }); setPick(null); }
    catch (e) { setErr(e as ApiError); }
  };

  const others = (load.data?.people ?? []).filter((p) => p.id !== me?.id);
  const name = (uid: string) => load.data?.people.find((p) => p.id === uid)?.fullName ?? "Someone";
  const myLast = [...msgs].reverse().find((m) => m.senderId === me?.id);
  const seen = myLast && others.some((p) => p.lastReadAt && Date.parse(p.lastReadAt) >= Date.parse(myLast.at));

  return (
    <Screen title="Chat" flush testId="chat-thread">
      <Loaded load={load}>
        {(d) => (
          <>
            <div className="chat-thread" data-testid="messages">
              {!d.messages.length && <p className="center muted small" style={{ padding: 24 }}>No messages yet. Say hello.</p>}
              {d.messages.map((m, i) => {
                const mine = m.senderId === me?.id;
                const day = istDate(m.at);
                const newDay = i === 0 || istDate(d.messages[i - 1].at) !== day;
                return (
                  <Fragment key={m.id}>
                    {newDay && <div className="chat-day">{fmtDay(day)}</div>}
                    <div className={"bubble" + (mine ? " mine" : "")} onClick={() => (mine || me?.role === "admin") && setPick(m)} data-testid="message">
                      {!mine && d.thread.kind === "team" && <div className="who">{name(m.senderId)}</div>}
                      {m.kind === "photo" && m.fileId && <a href={fileUrl(m.fileId)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}><img src={fileUrl(m.fileId)} alt="Photo" loading="lazy" /></a>}
                      {m.kind === "voice" && m.fileId && <audio controls preload="none" src={fileUrl(m.fileId)} onClick={(e) => e.stopPropagation()} />}
                      {m.kind === "file" && m.fileId && <a className="btn soft small" href={fileUrl(m.fileId)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>Open the file</a>}
                      {m.body && <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>}
                      <div className="when">{m.kind === "text" && m.body && !mine ? <Listen text={m.body} /> : null} {fmtTime(m.at)}{mine && m.id === myLast?.id && seen ? " · Seen" : ""}</div>
                    </div>
                  </Fragment>
                );
              })}
              <div ref={endRef} />
            </div>
            <div className="composer" data-vm-editing={text || rec ? "1" : undefined}>
              <div className="grow stack tight">
                {err && <ErrorNote error={err} />}
                {rec ? (
                  <div className="notice bad"><b>Recording… {recSecs} s</b><span>Tap Stop to send it (2 minutes at most).</span></div>
                ) : (
                  <TextArea label="Message" value={text} onChange={setText} rows={1} testId="chat-text" />
                )}
                <div className="row wrap">
                  <Button kind="soft" small onClick={() => photoIn.current?.click()} disabled={sending || !!rec}>Photo</Button>
                  <Button kind="soft" small onClick={() => fileIn.current?.click()} disabled={sending || !!rec}>PDF</Button>
                  <Button kind={rec ? "danger" : "soft"} small onClick={record} disabled={sending && !rec}>{rec ? "Stop" : "Voice note"}</Button>
                  <span className="grow" />
                  <Button small onClick={sendText} disabled={!text.trim() || sending || !!rec} testId="chat-send">{sending ? "Sending…" : "Send"}</Button>
                </div>
              </div>
              <input ref={photoIn} type="file" accept="image/*" hidden onChange={(e) => { sendFile(e.target.files?.[0], "photo"); e.target.value = ""; }} />
              <input ref={fileIn} type="file" accept="application/pdf" hidden onChange={(e) => { sendFile(e.target.files?.[0], "file"); e.target.value = ""; }} />
            </div>
            <Sheet open={!!pick} onClose={() => setPick(null)} label="Message">
              <h2>Remove this message?</h2>
              <p className="muted">It leaves the chat for everyone now. The File manager keeps it in the Trash for 90 days.</p>
              <div className="btn-row"><Button kind="ghost" onClick={() => setPick(null)}>Keep it</Button><Button kind="danger" onClick={() => pick && remove(pick)} busyText="Removing…">Remove</Button></div>
            </Sheet>
          </>
        )}
      </Loaded>
    </Screen>
  );
}
