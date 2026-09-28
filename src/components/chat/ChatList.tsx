"use client";
// My chats: the Team chat pinned on top, then group chats and people, newest first. Message text never
// shows here (only how many are new, and "Mentioned you"): it shows when the chat is opened.
// The + button makes a group chat.
import { useState } from "react";
import { useApp } from "../AppContext";
import { Avatar, Button, Empty, ErrorNote, Loaded, Pill, Sheet, TextInput } from "../ui";
import { useLoad } from "@/lib/client/hooks";
import { call, ApiError } from "@/lib/client/api";
import { fmtWhen, initials } from "@/lib/shared/format";
import { ROLE_LABEL, type Role } from "@/lib/shared/roles";
import type { ChatKind } from "@/lib/shared/chat";

export type ChatRow = { threadId: string | null; kind: ChatKind; title: string; withId: string | null; withRole: Role | null; hasAvatar: boolean; people: number; lastAt: string | null; unread: number; mentioned: boolean };
type Person = { id: string; fullName: string; role: Role; hasAvatar: boolean };

export function ChatList({ onOpen, testId = "chats" }: { onOpen: (threadId: string, title: string) => void; testId?: string }) {
  const load = useLoad<{ chats: ChatRow[]; canMakeGroups: boolean }>("/api/chat", { every: 10 });
  const [err, setErr] = useState<ApiError | null>(null);
  const [making, setMaking] = useState(false);
  const open = async (c: ChatRow) => {
    setErr(null);
    if (c.threadId) return onOpen(c.threadId, c.title);
    try { const r = await call<{ threadId: string }>("/api/chat", { body: { with: c.withId } }); onOpen(r.threadId, c.title); }
    catch (e) { setErr(e as ApiError); }
  };
  return (
    <div className="stack" data-testid={testId}>
      {err && <ErrorNote error={err} />}
      <Loaded load={load} isEmpty={(d) => !d.chats.length} empty={<Empty title="No one to chat with yet" />}>
        {(d) => {
          const team = d.chats.find((c) => c.kind === "team");
          const groups = d.chats.filter((c) => c.kind === "topic");
          const people = d.chats.filter((c) => c.kind === "direct");
          return (
            <>
              {d.canMakeGroups && (
                <div className="row between">
                  <span className="small muted">Tap a chat to open it.</span>
                  <button type="button" className="chat-new" onClick={() => setMaking(true)} data-testid="chat-new">+ New group</button>
                </div>
              )}
              {team && (
                <button type="button" className="chat-pinned" onClick={() => open(team)} data-testid="chat-team">
                  <span className="avatar team" aria-hidden="true">TC</span>
                  <div className="grow">
                    <div className="title">Team chat <span className="pin-word">Pinned</span></div>
                    <div className="sub">Everyone at Telgo{team.lastAt ? ` · ${fmtWhen(team.lastAt)}` : ""}</div>
                  </div>
                  <Badges c={team} />
                </button>
              )}
              {groups.length > 0 && <div className="section-title">Group chats</div>}
              {groups.length > 0 && (
                <div className="list" data-testid="chat-groups">
                  {groups.map((c) => (
                    <button key={c.threadId} type="button" className="item" onClick={() => open(c)}>
                      <span className="avatar group" aria-hidden="true">{initials(c.title)}</span>
                      <div className="grow">
                        <div className="title">{c.title}</div>
                        <div className="sub">{c.people} people{c.lastAt ? ` · ${fmtWhen(c.lastAt)}` : ""}</div>
                      </div>
                      <Badges c={c} />
                    </button>
                  ))}
                </div>
              )}
              {people.length > 0 && <div className="section-title">People</div>}
              {people.length > 0 && (
                <div className="list" data-testid="chat-people">
                  {people.map((c) => (
                    <button key={c.threadId ?? c.withId} type="button" className="item" onClick={() => open(c)}>
                      <Avatar name={c.title} userId={c.withId} has={c.hasAvatar} />
                      <div className="grow">
                        <div className="title">{c.title}</div>
                        <div className="sub">{c.withRole ? ROLE_LABEL[c.withRole] : ""}{c.lastAt ? ` · ${fmtWhen(c.lastAt)}` : c.threadId ? "" : " · tap to start a chat"}</div>
                      </div>
                      <Badges c={c} />
                    </button>
                  ))}
                </div>
              )}
            </>
          );
        }}
      </Loaded>
      <NewGroup open={making} onClose={() => setMaking(false)} onMade={(id, title) => { setMaking(false); load.reload(); onOpen(id, title); }} />
    </div>
  );
}

function Badges({ c }: { c: ChatRow }) {
  if (!c.unread) return null;
  return (
    <div className="stack tight" style={{ alignItems: "flex-end" }}>
      <Pill tone="brand">{c.unread > 99 ? "99+" : c.unread} new</Pill>
      {c.mentioned && <Pill tone="warn">Mentioned you</Pill>}
    </div>
  );
}

// + New group: a name, and (the admin) the people. Anyone else's group is with the admin.
function NewGroup({ open, onClose, onMade }: { open: boolean; onClose: () => void; onMade: (threadId: string, title: string) => void }) {
  const { me } = useApp();
  const admin = me?.role === "admin";
  const people = useLoad<{ people: Person[] }>(open && admin ? "/api/chat/people" : null);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [err, setErr] = useState<ApiError | null>(null);
  const make = async () => {
    setErr(null);
    try {
      const r = await call<{ threadId: string }>("/api/chat", { body: { title: name, members: picked } });
      const title = name.trim();
      setName(""); setPicked([]);
      onMade(r.threadId, title);
    } catch (e) { setErr(e as ApiError); }
  };
  return (
    <Sheet open={open} onClose={onClose} label="New group chat">
      <h2>New group chat</h2>
      <TextInput label="Name of the chat" value={name} onChange={setName} maxLength={80} placeholder="For example: Aluva HDD site" testId="group-name" />
      {admin ? (
        <>
          <div className="label">Who is in it</div>
          <Loaded load={people} isEmpty={(d) => !d.people.length} empty={<Empty title="No other staff logins yet" />}>
            {(d) => (
              <div className="chips" data-testid="group-people">
                {d.people.map((p) => {
                  const on = picked.includes(p.id);
                  return (
                    <button key={p.id} type="button" className={"chip" + (on ? " on" : "")} aria-pressed={on}
                      onClick={() => setPicked(on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}>
                      {p.fullName} <span className="muted tiny">{ROLE_LABEL[p.role]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Loaded>
          <p className="tiny muted">{picked.length ? `${picked.length} chosen. ` : ""}Everyone you choose is told. You can add more people later.</p>
        </>
      ) : (
        <p className="small muted">Your group chat is with the admin (the admin is in every group chat). Give it a name that says what it is about.</p>
      )}
      {err && <ErrorNote error={err} />}
      <div className="btn-row">
        <Button kind="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={make} disabled={!name.trim() || (admin && !picked.length)} busyText="Making…" testId="group-make">Make the chat</Button>
      </div>
    </Sheet>
  );
}
