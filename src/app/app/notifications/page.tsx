"use client";
// Notifications (all roles): push on this phone, then the list the database made (RULES.md section 8).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, Empty, ErrorNote, Loaded, Sheet } from "@/components/ui";
import { call, ApiError } from "@/lib/client/api";
import { useLoad } from "@/lib/client/hooks";
import { PushCard } from "./_parts/PushCard";
import { NoteRow, type Note } from "./_parts/NoteRow";

type List = { notifications: Note[]; unread: number };
const asErr = (e: unknown) => (e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e), "ERROR"));

export default function NotificationsPage() {
  const router = useRouter();
  const { refreshCounts, toast } = useApp();
  const load = useLoad<List>("/api/notifications", { every: 20 });
  const [err, setErr] = useState<ApiError | null>(null);
  const [sheet, setSheet] = useState(false);
  const [sheetErr, setSheetErr] = useState<ApiError | null>(null);

  // put what the server confirmed into the list
  const markRead = (ids: string[]) => load.set((d) => d && {
    ...d, notifications: d.notifications.map((x) => (ids.includes(x.id) ? { ...x, read: true } : x)),
    unread: d.notifications.filter((x) => !x.read && !ids.includes(x.id)).length,
  });
  const drop = (ids: string[]) => load.set((d) => {
    if (!d) return d;
    const left = d.notifications.filter((x) => !ids.includes(x.id));
    return { ...d, notifications: left, unread: left.filter((x) => !x.read).length };
  });

  const open = async (n: Note) => {
    setErr(null);
    if (!n.read) {
      try {
        await call("/api/notifications", { body: { action: "read", ids: [n.id] } });
        markRead([n.id]);
        refreshCounts();
      } catch (e) { setErr(asErr(e)); return; }
    }
    if (n.link && n.link.startsWith("/")) router.push(n.link);
  };

  const clearOne = async (n: Note) => {
    setErr(null);
    try {
      await call("/api/notifications", { body: { action: "clear", ids: [n.id] } });
      drop([n.id]);
      refreshCounts();
      return true;
    } catch (e) { setErr(asErr(e)); return false; }
  };

  // only what is on screen: a notification that arrived a second ago is never read or cleared unseen
  const readAll = async (d: List) => {
    setErr(null);
    const ids = d.notifications.filter((x) => !x.read).map((x) => x.id);
    if (!ids.length) return;
    try {
      const r = await call<{ changed: number }>("/api/notifications", { body: { action: "read", ids } });
      markRead(ids);
      refreshCounts();
      toast(`Marked ${r.changed} as read.`);
    } catch (e) { setErr(asErr(e)); }
  };

  const clearAll = async (d: List) => {
    setSheetErr(null);
    const ids = d.notifications.map((x) => x.id);
    try {
      const r = await call<{ changed: number }>("/api/notifications", { body: { action: "clear", ids } });
      drop(ids);
      refreshCounts();
      setSheet(false);
      toast(`Cleared ${r.changed} ${r.changed === 1 ? "notification" : "notifications"}.`);
    } catch (e) { setSheetErr(asErr(e)); }
  };

  return (
    <Screen title="Notifications" testId="notifications">
      <PushCard />
      <Loaded load={load} isEmpty={(d) => !d.notifications.length}
        empty={<Empty title="No notifications">New reports, approvals, messages and sign-ins show up here.</Empty>}>
        {(d) => (
          <>
            <div className="row between" style={{ marginTop: 4 }}>
              <span className="section-title" style={{ margin: "0 4px" }}>{d.unread ? `${d.unread} new` : "All read"} · {d.notifications.length} in all</span>
            </div>
            <div className="btn-row">
              <Button kind="ghost" small onClick={() => readAll(d)} disabled={!d.unread} busyText="Marking…" testId="notifications-read-all">Mark all read</Button>
              <Button kind="ghost" small onClick={() => { setSheetErr(null); setSheet(true); }} testId="notifications-clear-all">Clear all</Button>
            </div>
            {err && <ErrorNote error={err} />}
            <div className="stack" data-testid="notifications-list">
              {d.notifications.map((n) => <NoteRow key={n.id} n={n} onOpen={() => open(n)} onClear={() => clearOne(n)} />)}
            </div>
            <p className="tiny muted center">Swipe a notification to the left, or tap ×, to clear it.</p>
            <Sheet open={sheet} onClose={() => setSheet(false)} label="Clear all notifications">
              <h2>Clear all {d.notifications.length} {d.notifications.length === 1 ? "notification" : "notifications"}?</h2>
              <p className="muted">They are taken off this list for good. The reports, messages and sign-ins they were about are not changed.</p>
              {sheetErr && <ErrorNote error={sheetErr} />}
              <div className="btn-row">
                <Button kind="ghost" onClick={() => setSheet(false)}>Not now</Button>
                <Button kind="danger" onClick={() => clearAll(d)} busyText="Clearing…" testId="notifications-clear-confirm">Clear all</Button>
              </div>
            </Sheet>
          </>
        )}
      </Loaded>
    </Screen>
  );
}
