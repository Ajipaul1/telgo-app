"use client";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { Loaded, Pill, Empty, Button } from "@/components/ui";
import { MapView, type MapCircle, type MapLine, type MapPin } from "@/components/Map";
import { useLoad, useNow } from "@/lib/client/hooks";
import { addDays, ago, distanceWords, fmtDay, fmtTime, initials, istToday } from "@/lib/shared/format";
import type { Shift } from "@/lib/shared/attendance";
import type { LatLng } from "@/lib/shared/geo";
import { ROLE_LABEL, type Role } from "@/lib/shared/roles";

type Last = { lat: number; lng: number; accuracyM: number | null; at: string; source: string; projectName: string; distanceM: number | null; within: boolean };
type LiveData = { day: string; people: { id: string; fullName: string; role: Role; loginId: string; shift: Shift | null; shiftsToday: number; last: Last | null }[]; sites: { id: string; name: string; route: LatLng[]; radiusM: number }[] };
type Trail = { points: (Omit<Last, "source"> & { source: string })[] };

const SOURCE: Record<string, string> = { sign_in: "Signed in", sign_out: "Signed out", ping: "App open", attendance_mark: "Old app" };

function LiveBody() {
  const q = useSearchParams();
  const router = useRouter();
  const person = q.get("person");
  const day = q.get("day") ?? istToday();
  const now = useNow(20000);
  const live = useLoad<LiveData>("/api/team/live", { every: 30 });
  const trail = useLoad<Trail>(person ? `/api/team/trail?user=${person}&day=${day}` : null, { every: day === istToday() ? 60 : undefined });
  const go = (p: string | null, d = day) => router.replace(p ? `/app/team/live?person=${p}&day=${d}` : "/app/team/live");

  const siteLines: MapLine[] = useMemo(() => (live.data?.sites ?? []).filter((s) => s.route.length > 1).map((s) => ({ points: s.route, color: "#7a5cff", weight: 4, title: s.name })), [live.data]);
  const siteCircles: MapCircle[] = useMemo(() => (live.data?.sites ?? []).filter((s) => s.route.length === 1).map((s) => ({ at: s.route[0], radiusM: s.radiusM })), [live.data]);

  return (
    <Loaded load={live}>
      {(d) => {
        const sel = person ? d.people.find((p) => p.id === person) ?? null : null;
        let pins: MapPin[];
        let lines: MapLine[] = siteLines;
        if (sel) {
          const pts = trail.data?.points ?? [];
          lines = [...siteLines, { points: pts.map((p) => [p.lat, p.lng] as LatLng), color: "#0e8a5f", weight: 4, title: `${sel.fullName}'s trail` }];
          pins = pts.map((p, i) => ({
            at: [p.lat, p.lng] as LatLng, text: i === pts.length - 1 ? initials(sel.fullName) : "", kind: i === pts.length - 1 ? (p.within ? "in" : "away") : "pt",
            title: `${fmtTime(p.at)} · ${SOURCE[p.source] ?? p.source}`, lines: [p.projectName, p.distanceM === null ? "distance not known" : `${distanceWords(p.distanceM)} from the site`, p.accuracyM ? `GPS ±${Math.round(p.accuracyM)} m` : ""].filter(Boolean),
          }));
        } else {
          pins = d.people.filter((p) => p.last).map((p) => {
            const old = now - Date.parse(p.last!.at) > 30 * 60e3;
            return {
              at: [p.last!.lat, p.last!.lng] as LatLng, text: initials(p.fullName), kind: old ? "old" : p.last!.within ? "in" : "away",
              title: p.fullName, lines: [`${SOURCE[p.last!.source] ?? p.last!.source} · ${ago(p.last!.at, now)}`, p.last!.projectName, p.last!.distanceM === null ? "distance not known" : `${distanceWords(p.last!.distanceM)} from the site`],
              onTap: () => go(p.id, istToday()),
            };
          });
        }
        const withLoc = d.people.filter((p) => p.last).length;
        return (
          <>
            <MapView size="tall" pins={pins} lines={lines} circles={siteCircles} fitKey={sel ? `trail-${sel.id}-${day}-${trail.data?.points.length ?? 0}` : `all-${withLoc}`} testId="live-map" />
            {sel ? (
              <div className="card" data-testid="trail-card">
                <div className="row between"><h2>{sel.fullName}</h2><Button kind="ghost" small onClick={() => go(null)}>Everyone</Button></div>
                <div className="row between">
                  <Button kind="soft" small onClick={() => go(sel.id, addDays(day, -1))}>Previous day</Button>
                  <b>{fmtDay(day)}</b>
                  <Button kind="soft" small disabled={day >= istToday()} onClick={() => go(sel.id, addDays(day, 1))}>Next day</Button>
                </div>
                {trail.loading ? <div className="skeleton" /> : !trail.data?.points.length ? <p className="small muted">No location from this phone on {fmtDay(day)}. The phone sends it only while signed in with the app open.</p> : (
                  <div className="list" style={{ boxShadow: "none" }}>
                    {[...trail.data.points].reverse().map((p, i) => (
                      <div key={i} className="item" style={{ minHeight: 52 }}>
                        <div className="grow"><div className="title">{fmtTime(p.at)} · {SOURCE[p.source] ?? p.source}</div><div className="sub">{p.projectName} · {p.distanceM === null ? "distance not known" : `${distanceWords(p.distanceM)} from the site`}</div></div>
                        {p.distanceM !== null && <Pill tone={p.within ? "ok" : "bad"}>{p.within ? "At site" : "Away"}</Pill>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="small muted">Green: at the site. Red: away from it. Grey: the phone hasn&apos;t sent its place for over 30 minutes. A phone sends its place only while its person is signed in with the app open.</p>
                <div className="list" data-testid="live-list">
                  {d.people.map((p) => {
                    const open = p.shift?.state === "open";
                    return (
                      <button key={p.id} className="item" onClick={() => go(p.id, istToday())}>
                        <div className="grow">
                          <div className="title">{p.fullName} <span className="muted small">· {ROLE_LABEL[p.role]}</span></div>
                          <div className="sub">{p.shift ? `${p.shift.projectName} · in ${fmtTime(p.shift.inAt)}${p.shift.outAt ? ` – out ${fmtTime(p.shift.outAt)}` : ""}` : "Not signed in today"}</div>
                          <div className="sub tiny">{p.last ? `Last place ${ago(p.last.at, now)} (${SOURCE[p.last.source] ?? p.last.source})` : "No location today"}</div>
                        </div>
                        <div className="end">{open ? (p.last && !p.last.within && p.last.distanceM !== null ? <Pill tone="bad">Away</Pill> : <Pill tone="ok">Working</Pill>) : p.shift ? <Pill>Signed out</Pill> : <Pill tone="warn">Not in</Pill>}</div>
                      </button>
                    );
                  })}
                </div>
                {!d.people.length && <Empty title="No site staff yet" />}
              </>
            )}
          </>
        );
      }}
    </Loaded>
  );
}

export default function LivePage() {
  return (
    <Screen title="Live location" roles={["admin"]} testId="live">
      <Suspense><LiveBody /></Suspense>
    </Screen>
  );
}
