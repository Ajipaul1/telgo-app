"use client";
// Maps (Leaflet, loaded only in the browser). Free map tiles with their credits shown (the licence
// requires it), a Map / Satellite switch, pins drawn as text only (no HTML from data ever reaches
// the map, so a name can't inject anything).
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { LatLng } from "@/lib/shared/geo";
import { routeLengthM } from "@/lib/shared/geo";
import { metres } from "@/lib/shared/format";
import { getPosition } from "@/lib/client/device";
import { Button } from "./ui";

export type MapPin = { at: LatLng; text: string; kind?: "in" | "away" | "old" | "start" | "end" | "pt" | "brand"; title?: string; lines?: string[]; onTap?: () => void };
export type MapLine = { points: LatLng[]; color?: string; dashed?: boolean; weight?: number; title?: string };
export type MapCircle = { at: LatLng; radiusM: number; color?: string };

const TILES = {
  map: { url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attribution: "© OpenStreetMap contributors © CARTO", subdomains: "abcd", maxZoom: 20 },
  sat: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles © Esri", subdomains: "", maxZoom: 19 },
};
const KERALA: LatLng = [10.3, 76.3];

function pinEl(p: MapPin) {
  const el = document.createElement("div");
  el.className = "pin " + (p.kind ?? "brand");
  el.textContent = p.kind === "pt" ? "" : p.text.slice(0, 3);
  if (p.title) el.title = p.title;
  return el;
}
function tipEl(p: MapPin) {
  const el = document.createElement("div");
  const b = document.createElement("b");
  b.textContent = p.title ?? p.text;
  el.appendChild(b);
  for (const line of p.lines ?? []) { const d = document.createElement("div"); d.textContent = line; el.appendChild(d); }
  return el;
}

export function MapView({ pins = [], lines = [], circles = [], size = "", fitKey, onTap, testId, children }: {
  pins?: MapPin[]; lines?: MapLine[]; circles?: MapCircle[]; size?: "" | "tall" | "short"; fitKey?: string;
  onTap?: (at: LatLng) => void; testId?: string; children?: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const tiles = useRef<Leaflet.TileLayer | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const [ready, setReady] = useState(false);
  const [sat, setSat] = useState(false);
  const fitted = useRef<string | null>(null);

  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead || !box.current || map.current) return;
      const Lf = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      L.current = Lf;
      const m = Lf.map(box.current, { zoomControl: true, attributionControl: true, tapTolerance: 20 }).setView(KERALA, 8);
      m.attributionControl.setPrefix(false);
      map.current = m;
      layer.current = Lf.layerGroup().addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => tapRef.current?.([e.latlng.lat, e.latlng.lng]));
      setReady(true);
    });
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const Lf = L.current, m = map.current;
    if (!Lf || !m) return;
    tiles.current?.remove();
    const t = sat ? TILES.sat : TILES.map;
    tiles.current = Lf.tileLayer(t.url, { attribution: t.attribution, subdomains: t.subdomains || "abc", maxZoom: t.maxZoom, detectRetina: true }).addTo(m);
  }, [sat, ready]);

  useEffect(() => {
    const Lf = L.current, m = map.current, g = layer.current;
    if (!Lf || !m || !g) return;
    g.clearLayers();
    const all: LatLng[] = [];
    for (const c of circles) { Lf.circle(c.at, { radius: c.radiusM, color: c.color ?? "#478bd0", weight: 1.5, fillOpacity: 0.08 }).addTo(g); all.push(c.at); }
    for (const l of lines) {
      if (l.points.length < 2) continue;
      const pl = Lf.polyline(l.points, { color: l.color ?? "#5b3fe6", weight: l.weight ?? 5, opacity: 0.9, dashArray: l.dashed ? "8 8" : undefined });
      if (l.title) { const el = document.createElement("div"); el.textContent = l.title; pl.bindTooltip(el, { sticky: true }); }
      pl.addTo(g);
      all.push(...l.points);
    }
    for (const p of pins) {
      const size = p.kind === "pt" ? 16 : p.kind === "start" || p.kind === "end" ? 26 : 36;
      const mk = Lf.marker(p.at, { icon: Lf.divIcon({ html: pinEl(p), className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }), keyboard: false });
      mk.bindTooltip(tipEl(p), { direction: "top", offset: [0, -size / 2] });
      if (p.onTap) mk.on("click", () => p.onTap?.());
      mk.addTo(g);
      all.push(p.at);
    }
    const key = fitKey ?? String(all.length);
    if (all.length && fitted.current !== key) {
      fitted.current = key;
      if (all.length === 1) m.setView(all[0], 16);
      else m.fitBounds(Lf.latLngBounds(all.map((a) => Lf.latLng(a[0], a[1]))), { padding: [36, 36], maxZoom: 17 });
    }
  }, [pins, lines, circles, ready, fitKey]);

  return (
    <div className="stack tight">
      <div ref={box} className={"map " + size} data-testid={testId} role="application" aria-label="Map" />
      <div className="map-tools">
        <Button kind="soft" small onClick={() => setSat(!sat)}>{sat ? "Map" : "Satellite"}</Button>
        {children}
      </div>
    </div>
  );
}

// draw a route: tap along the road to add points; Undo; Clear; Add where I am. The length is measured.
export function RouteEditor({ points, onChange, others = [] }: { points: LatLng[]; onChange: (p: LatLng[]) => void; others?: MapLine[] }) {
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const pins: MapPin[] = points.map((p, i) => ({
    at: p, text: i === 0 ? "S" : i === points.length - 1 ? "E" : "", kind: i === 0 ? "start" : i === points.length - 1 ? "end" : "pt",
    title: i === 0 ? "Start" : i === points.length - 1 ? "End" : `Point ${i + 1}`,
  }));
  return (
    <div className="stack tight" data-vm-editing="1">
      <MapView size="tall" pins={pins} lines={[...others, { points, color: "#5b3fe6" }]} fitKey={points.length ? "edit" : "empty"} onTap={(at) => onChange([...points, at])} testId="route-editor">
        <Button kind="soft" small onClick={() => onChange(points.slice(0, -1))} disabled={!points.length}>Undo</Button>
        <Button kind="soft" small onClick={() => onChange([])} disabled={!points.length}>Clear</Button>
        <Button kind="soft" small onClick={async () => { setGpsErr(null); try { const f = await getPosition(); onChange([...points, [f.lat, f.lng]]); } catch (e) { setGpsErr((e as Error).message); } }}>Add where I am</Button>
      </MapView>
      <p className="small muted">Tap along the road to draw the route, start to end. {points.length ? `${points.length} points · ${metres(routeLengthM(points))} measured on the map.` : "No route yet."}</p>
      {gpsErr && <p className="small" style={{ color: "var(--bad)" }}>{gpsErr}</p>}
    </div>
  );
}
