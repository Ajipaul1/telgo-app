import type { MapLine, MapPin } from "./Map";
import type { ProjectView } from "@/lib/shared/project";

// a project drawn on a map: its route (violet), the old app's planned layers (dashed), start and end pins
export function projectMap(p: ProjectView): { pins: MapPin[]; lines: MapLine[] } {
  const lines: MapLine[] = p.layers.map((l) => ({ points: l.route, color: l.key === "hdd" ? "#f5b400" : l.key === "trench" ? "#e8702a" : "#13d3e3", dashed: true, weight: 4, title: l.label }));
  if (p.route.length > 1) lines.unshift({ points: p.route, color: "#5b3fe6", weight: 6, title: "Project route" });
  const pins: MapPin[] = [];
  if (p.route.length) pins.push({ at: p.route[0], text: "S", kind: "start", title: p.startLabel ?? "Start" });
  if (p.route.length > 1) pins.push({ at: p.route[p.route.length - 1], text: "E", kind: "end", title: p.endLabel ?? "End" });
  return { pins, lines };
}
