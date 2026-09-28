"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Avatar, Loaded, Pill, Empty, ErrorNote } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { call, ApiError } from "@/lib/client/api";
import { fmtWhen } from "@/lib/shared/format";
import { ROLE_LABEL, type Role } from "@/lib/shared/roles";

type ChatRow = { threadId: string | null; kind: "team" | "direct"; title: string; withId: string | null; withRole: Role | null; hasAvatar: boolean; lastAt: string | null; unread: number };

// My chats. Message text never shows here (only how many are new): it shows when the chat is opened.
export default function Chats() {
  const router = useRouter();
  const load = useLoad<{ chats: ChatRow[] }>("/api/chat", { every: 15 });
  const [err, setErr] = useState<ApiError | null>(null);
  const open = async (c: ChatRow) => {
    setErr(null);
    if (c.threadId) return router.push(`/app/chat/${c.threadId}`);
    try { const r = await call<{ threadId: string }>("/api/chat", { body: { with: c.withId } }); router.push(`/app/chat/${r.threadId}`); }
    catch (e) { setErr(e as ApiError); }
  };
  return (
    <Screen title="Chat" testId="chat-list">
      {err && <ErrorNote error={err} />}
      <Loaded load={load} isEmpty={(d) => !d.chats.length} empty={<Empty title="No one to chat with yet" />}>
        {(d) => (
          <div className="list" data-testid="chats">
            {d.chats.map((c) => (
              <button key={c.threadId ?? c.withId ?? c.title} className="item" onClick={() => open(c)}>
                {c.kind === "team" ? <span className="avatar" aria-hidden="true">TC</span> : <Avatar name={c.title} userId={c.withId} has={c.hasAvatar} />}
                <div className="grow">
                  <div className="title">{c.title}</div>
                  <div className="sub">{c.kind === "team" ? "Everyone at Telgo" : c.withRole ? ROLE_LABEL[c.withRole] : ""}{c.lastAt ? ` · ${fmtWhen(c.lastAt)}` : c.threadId ? "" : " · start a chat"}</div>
                </div>
                {c.unread > 0 && <Pill tone="brand">{c.unread} new</Pill>}
              </button>
            ))}
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
