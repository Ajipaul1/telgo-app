"use client";
// Draw one line on the map (owner's ask): tap along the road to add points; the line between them follows
// the road (or goes straight, for an HDD bore); drag a point to move it; tap a point, then Remove it;
// Undo; Clear; Add where I am. The length is measured along the drawn line, never typed.
import { useEffect, useRef, useState } from "react";
import { MapView, type MapLine, type MapPin } from "./Map";
import { Button } from "./ui";
import { drawLine } from "@/lib/client/roads";
import { getPosition } from "@/lib/client/device";
import { routeLengthM, type LatLng } from "@/lib/shared/geo";
import { metres } from "@/lib/shared/format";
import type { PlanLine } from "@/lib/shared/plan";

export function LineEditor({ line, onChange, color = "#5b3fe6", others = [], fitKey, testId = "line-editor" }: {
  line: PlanLine; onChange: (l: PlanLine) => void; color?: string; others?: MapLine[]; fitKey: string; testId?: string;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [straight, setStraight] = useState(0);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const seq = useRef(0);
  const latest = useRef(line);
  latest.current = line;
  useEffect(() => { setSel(null); }, [fitKey]);

  // new points or a new mode: draw the line again (an older answer that comes late is thrown away)
  const redraw = async (waypoints: LatLng[], follow: boolean) => {
    const my = ++seq.current;
    onChange({ ...latest.current, waypoints, follow, path: waypoints, lengthM: Math.round(routeLengthM(waypoints)) });
    if (!follow || waypoints.length < 2) { setStraight(0); return; }
    setBusy(true);
    const r = await drawLine(waypoints, follow);
    if (my !== seq.current) return;
    setBusy(false);
    setStraight(r.straightPieces);
    onChange({ ...latest.current, waypoints, follow, path: r.path, lengthM: Math.round(routeLengthM(r.path)) });
  };
  const w = line.waypoints;
  const add = (at: LatLng) => { setSel(null); redraw([...w, at], line.follow); };
  const move = (i: number, at: LatLng) => redraw(w.map((p, j) => (j === i ? at : p)), line.follow);
  const remove = (i: number) => { setSel(null); redraw(w.filter((_, j) => j !== i), line.follow); };

  const pins: MapPin[] = w.map((p, i) => ({
    at: p, kind: "way", text: i === 0 ? "S" : i === w.length - 1 ? "E" : String(i + 1), title: i === 0 ? "Start" : i === w.length - 1 ? "End" : `Point ${i + 1}`,
    draggable: true, selected: sel === i, onTap: () => setSel(sel === i ? null : i), onDragEnd: (at) => move(i, at),
  }));
  const lines: MapLine[] = [...others, ...(line.path.length > 1 ? [{ points: line.path, color, weight: 6 }] : [])];

  return (
    <div className="stack tight" data-vm-editing="1" data-testid={testId}>
      <MapView size="tall" pins={pins} lines={lines} fitKey={fitKey} onTap={add} testId={`${testId}-map`}>
        {sel !== null ? (
          <>
            <Button kind="danger" small onClick={() => remove(sel)} testId={`${testId}-remove`}>Remove point {sel === 0 ? "S" : sel === w.length - 1 ? "E" : sel + 1}</Button>
            <Button kind="soft" small onClick={() => setSel(null)}>Keep it</Button>
          </>
        ) : (
          <>
            <Button kind="soft" small onClick={() => redraw(w.slice(0, -1), line.follow)} disabled={!w.length} testId={`${testId}-undo`}>Undo</Button>
            <Button kind="soft" small onClick={() => redraw([], line.follow)} disabled={!w.length}>Clear</Button>
            <Button kind={line.follow ? "primary" : "soft"} small onClick={() => redraw(w, !line.follow)} testId={`${testId}-follow`}>{line.follow ? "Follows the roads" : "Straight lines"}</Button>
            <Button kind="soft" small onClick={async () => { setGpsErr(null); try { const f = await getPosition(); add([f.lat, f.lng]); } catch (e) { setGpsErr((e as Error).message); } }}>Add where I am</Button>
          </>
        )}
      </MapView>
      <p className="small" data-testid={`${testId}-length`}>
        {w.length < 2 ? <span className="muted">Tap the map at the start, then along the road to the end.</span>
          : busy ? <span className="muted">Finding the road…</span>
          : <><b>{metres(line.lengthM)}</b> <span className="muted">{line.follow ? "along the road" : "in straight lines"} · {w.length} points</span></>}
      </p>
      {sel !== null && <p className="tiny muted">Drag a point to move it. Tap it again to let go.</p>}
      {!busy && straight > 0 && <p className="tiny" style={{ color: "var(--warn)" }}>{straight === 1 ? "One piece" : `${straight} pieces`} couldn&apos;t find a road (or there is no signal), so {straight === 1 ? "it is" : "they are"} drawn straight. Move a point closer to the road, or try again.</p>}
      {gpsErr && <p className="small" style={{ color: "var(--bad)" }}>{gpsErr}</p>}
    </div>
  );
}
