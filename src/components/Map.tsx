"use client";
// Maps. With a Google Maps key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) every map is a Google map; without it,
// OpenStreetMap (free, no key) with Esri satellite pictures. Pins are drawn as text only (no HTML from
// data ever reaches a map). "Open in Google Maps" under a place needs no key at all.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { LatLng } from "@/lib/shared/geo";
import { routeLengthM } from "@/lib/shared/geo";
import { metres } from "@/lib/shared/format";
import { getPosition } from "@/lib/client/device";
import { Button } from "./ui";

// draggable pins (the points of a line being drawn): moved with a finger, onDragEnd gets the new place
export type MapPin = { at: LatLng; text: string; kind?: "in" | "away" | "old" | "start" | "end" | "pt" | "brand" | "way"; title?: string; lines?: string[]; onTap?: () => void; draggable?: boolean; onDragEnd?: (at: LatLng) => void; selected?: boolean };
export type MapLine = { points: LatLng[]; color?: string; dashed?: boolean; weight?: number; title?: string };
export type MapCircle = { at: LatLng; radiusM: number; color?: string };
type Props = { pins?: MapPin[]; lines?: MapLine[]; circles?: MapCircle[]; size?: "" | "tall" | "short"; fitKey?: string; onTap?: (at: LatLng) => void; testId?: string; children?: React.ReactNode };

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const KERALA: LatLng = [10.3, 76.3];
const PIN_COLOR: Record<string, string> = { in: "#0e8a5f", away: "#c6283f", old: "#8a8eab", start: "#0e8a5f", end: "#c6283f", pt: "#5b3fe6", brand: "#5b3fe6", way: "#5b3fe6" };

// a link that opens a place in the Google Maps app or site (directions, street view); no key needed
export const googleMapsLink = (at: LatLng) => `https://www.google.com/maps/search/?api=1&query=${at[0].toFixed(6)},${at[1].toFixed(6)}`;
export function OpenInGoogleMaps({ at, label = "Open in Google Maps" }: { at: LatLng | null | undefined; label?: string }) {
  if (!at) return null;
  return <a className="link-btn" href={googleMapsLink(at)} target="_blank" rel="noopener noreferrer">{label}</a>;
}

function tipEl(p: MapPin) {
  const el = document.createElement("div");
  el.style.cssText = "font:14px/1.4 system-ui,sans-serif;color:#16123a;max-width:220px";
  const b = document.createElement("b");
  b.textContent = p.title ?? p.text;
  el.appendChild(b);
  for (const line of p.lines ?? []) { const d = document.createElement("div"); d.textContent = line; el.appendChild(d); }
  return el;
}

export function MapView(props: Props) {
  return GOOGLE_KEY ? <GoogleMapView {...props} /> : <LeafletMapView {...props} />;
}

// ---------------------------------------------------------------- Google Maps (with the key)
type G = any; // eslint-disable-line @typescript-eslint/no-explicit-any
let googleLoading: Promise<G> | null = null;
function loadGoogle(): Promise<G> {
  const w = window as unknown as { google?: G; __telgoMapsReady?: () => void };
  if (w.google?.maps?.Map) return Promise.resolve(w.google);
  googleLoading ??= new Promise((ok, bad) => {
    w.__telgoMapsReady = () => ok(w.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&v=weekly&loading=async&callback=__telgoMapsReady`;
    s.async = true;
    s.onerror = () => { googleLoading = null; bad(new Error("Google Maps couldn't load. Check the signal, or the key's settings in Google Cloud.")); };
    document.head.appendChild(s);
  });
  return googleLoading;
}

function GoogleMapView({ pins = [], lines = [], circles = [], size = "", fitKey, onTap, testId, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const g = useRef<G>(null);
  const map = useRef<G>(null);
  const drawn = useRef<G[]>([]);
  const info = useRef<G>(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const fitted = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sat, setSat] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    loadGoogle().then((google) => {
      if (dead || !box.current || map.current) return;
      g.current = google;
      map.current = new google.maps.Map(box.current, {
        center: { lat: KERALA[0], lng: KERALA[1] }, zoom: 8, mapTypeId: "roadmap", gestureHandling: "greedy",
        streetViewControl: false, fullscreenControl: false, mapTypeControl: false, clickableIcons: false,
      });
      info.current = new google.maps.InfoWindow();
      map.current.addListener("click", (e: G) => { if (e.latLng) tapRef.current?.([e.latLng.lat(), e.latLng.lng()]); });
      setReady(true);
    }, (e) => setProblem((e as Error).message));
    return () => { dead = true; };
  }, []);

  useEffect(() => { map.current?.setMapTypeId(sat ? "hybrid" : "roadmap"); }, [sat, ready]);

  useEffect(() => {
    const google = g.current, m = map.current;
    if (!google || !m) return;
    drawn.current.forEach((o) => o.setMap(null));
    drawn.current = [];
    const bounds = new google.maps.LatLngBounds();
    let n = 0;
    const add = (at: LatLng) => { bounds.extend({ lat: at[0], lng: at[1] }); n++; };
    for (const c of circles) {
      drawn.current.push(new google.maps.Circle({ map: m, center: { lat: c.at[0], lng: c.at[1] }, radius: c.radiusM, strokeColor: c.color ?? "#478bd0", strokeWeight: 1.5, fillColor: c.color ?? "#478bd0", fillOpacity: 0.08, clickable: false }));
      add(c.at);
    }
    for (const l of lines) {
      if (l.points.length < 2) continue;
      const path = l.points.map((p) => ({ lat: p[0], lng: p[1] }));
      const line = l.dashed
        ? new google.maps.Polyline({ map: m, path, strokeOpacity: 0, icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: l.color ?? "#5b3fe6", scale: 3 }, offset: "0", repeat: "14px" }] })
        : new google.maps.Polyline({ map: m, path, strokeColor: l.color ?? "#5b3fe6", strokeOpacity: 0.9, strokeWeight: l.weight ?? 5, clickable: !!l.title });
      if (l.title) line.addListener("click", (e: G) => { const el = document.createElement("div"); el.textContent = l.title!; info.current.setContent(el); info.current.setPosition(e.latLng); info.current.open({ map: m }); });
      drawn.current.push(line);
      l.points.forEach(add);
    }
    for (const p of pins) {
      const small = p.kind === "pt";
      const mk = new google.maps.Marker({
        map: m, position: { lat: p.at[0], lng: p.at[1] }, title: p.title ?? p.text, draggable: !!p.draggable,
        label: small || !p.text ? undefined : { text: p.text.slice(0, 3), color: "#ffffff", fontWeight: "800", fontSize: "12px" },
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: small ? 6 : p.kind === "way" ? (p.selected ? 14 : 11) : p.kind === "start" || p.kind === "end" ? 11 : 15, fillColor: PIN_COLOR[p.kind ?? "brand"], fillOpacity: 1, strokeColor: p.selected ? "#16123a" : "#ffffff", strokeWeight: 3 },
      });
      mk.addListener("click", () => { if (!p.draggable) { info.current.setContent(tipEl(p)); info.current.open({ map: m, anchor: mk }); } p.onTap?.(); });
      if (p.draggable) mk.addListener("dragend", (e: G) => p.onDragEnd?.([e.latLng.lat(), e.latLng.lng()]));
      drawn.current.push(mk);
      add(p.at);
    }
    const key = fitKey ?? String(n);
    if (n && fitted.current !== key) {
      fitted.current = key;
      if (n === 1) { m.setCenter(bounds.getCenter()); m.setZoom(16); }
      else m.fitBounds(bounds, 36);
    }
  }, [pins, lines, circles, ready, fitKey]);

  return (
    <div className="stack tight">
      {problem ? <div className={"map " + size} style={{ display: "grid", placeItems: "center", padding: 16 }}><p className="small muted center">{problem}</p></div>
        : <div ref={box} className={"map " + size} data-testid={testId} data-map="google" role="application" aria-label="Map" />}
      <div className="map-tools">
        <Button kind="soft" small onClick={() => setSat(!sat)}>{sat ? "Map" : "Satellite"}</Button>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- OpenStreetMap (no key)
const TILES = {
  map: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors", maxZoom: 19 },
  sat: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles © Esri", maxZoom: 19 },
};

function pinEl(p: MapPin) {
  const el = document.createElement("div");
  el.className = "pin " + (p.kind ?? "brand") + (p.selected ? " sel" : "");
  el.textContent = p.kind === "pt" ? "" : p.text.slice(0, 3);
  if (p.title) el.title = p.title;
  return el;
}

function LeafletMapView({ pins = [], lines = [], circles = [], size = "", fitKey, onTap, testId, children }: Props) {
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
    tiles.current = Lf.tileLayer(t.url, { attribution: t.attribution, maxZoom: t.maxZoom }).addTo(m);
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
      const size = p.kind === "pt" ? 16 : p.kind === "way" ? (p.selected ? 34 : 28) : p.kind === "start" || p.kind === "end" ? 26 : 36;
      const mk = Lf.marker(p.at, { icon: Lf.divIcon({ html: pinEl(p), className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }), keyboard: false, draggable: !!p.draggable });
      if (!p.draggable) mk.bindTooltip(tipEl(p), { direction: "top", offset: [0, -size / 2] });
      if (p.onTap) mk.on("click", () => p.onTap?.());
      if (p.draggable) mk.on("dragend", () => { const ll = mk.getLatLng(); p.onDragEnd?.([ll.lat, ll.lng]); });
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
      <div ref={box} className={"map " + size} data-testid={testId} data-map="osm" role="application" aria-label="Map" />
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
