"use client";
// The pop-up chat (owner's ask): a Chat bubble on every screen with the number of new messages. A tap
// opens the chats over the screen (Team chat pinned on top); a tap on a chat opens it with every
// option. Minimise folds it back into the bubble, which then carries that chat's name, and a tap brings
// the same chat back. The phone's Back button minimises it too. It stays put while moving between screens.
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatList } from "./ChatList";
import { ChatRoom } from "./ChatRoom";

const KEY = "telgo_chat_dock";
type Dock = { open: boolean; thread: string | null; title: string | null };

function saved(): Dock {
  try { const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); if (v && typeof v === "object") return { open: false, thread: v.thread ?? null, title: v.title ?? null }; }
  catch { /* private mode: start closed */ }
  return { open: false, thread: null, title: null };
}

export function useChatDock() {
  const [dock, setDock] = useState<Dock>({ open: false, thread: null, title: null });
  useEffect(() => { setDock(saved()); }, []);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify({ thread: dock.thread, title: dock.title })); } catch { /* not kept */ } }, [dock.thread, dock.title]);
  const openChat = useCallback((thread?: string | null, title?: string | null) => {
    setDock((d) => ({ open: true, thread: thread === undefined ? d.thread : thread, title: thread === undefined ? d.title : title ?? null }));
  }, []);
  const minimise = useCallback(() => setDock((d) => ({ ...d, open: false })), []);
  const toList = useCallback(() => setDock((d) => ({ ...d, thread: null, title: null })), []);
  const setTitle = useCallback((title: string) => setDock((d) => (d.title === title ? d : { ...d, title })), []);
  return { dock, openChat, minimise, toList, setTitle };
}

export function ChatDock({ unread, hidden, state }: { unread: number; hidden: boolean; state: ReturnType<typeof useChatDock> }) {
  const { dock, openChat, minimise, toList, setTitle } = state;
  const pushed = useRef(false);

  // the phone's Back button folds the chat away instead of leaving the screen
  useEffect(() => {
    if (!dock.open) return;
    history.pushState({ ...(history.state ?? {}), telgoChat: 1 }, "");
    pushed.current = true;
    const back = () => { pushed.current = false; minimise(); };
    window.addEventListener("popstate", back);
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { window.removeEventListener("popstate", back); html.style.overflow = was; };
  }, [dock.open, minimise]);
  const fold = () => { if (pushed.current) { pushed.current = false; history.back(); } else minimise(); };

  if (hidden) return null;
  return (
    <>
      {!dock.open && (
        <button type="button" className="chat-fab" onClick={() => openChat()} data-testid="chat-button" aria-label={`Chat${unread ? `: ${unread} new` : ""}`}>
          <span className="fab-words">Chat{dock.thread && dock.title ? <small>{dock.title}</small> : null}</span>
          {unread > 0 && <span className="n">{unread > 99 ? "99+" : unread}</span>}
        </button>
      )}
      {dock.open && (
        <div className="chat-pop-scrim" onClick={(e) => e.target === e.currentTarget && fold()}>
          <div className="chat-pop" role="dialog" aria-modal="true" aria-label="Chat" data-testid="chat-pop">
            {dock.thread ? (
              <ChatRoom id={dock.thread} mode="pop" onBack={toList} onMinimise={fold} onTitle={setTitle} />
            ) : (
              <div className="chat-room pop">
                <div className="chat-head">
                  <div className="chat-head-title static"><b>Chats</b><span>Team chat is pinned on top</span></div>
                  <button type="button" className="chat-head-btn" onClick={fold} data-testid="chat-minimise">Minimise</button>
                </div>
                <div className="chat-scroll pad"><ChatList testId="chats" onOpen={(id, title) => openChat(id, title)} /></div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
