import type { MapLine, MapPin } from "./Map";
import type { ProjectView } from "@/lib/shared/project";
import { typeColor } from "@/lib/shared/plan";
import { metres } from "@/lib/shared/format";

// a project drawn on a map: its whole route (violet), the work parts on top in the colour of their type
// (open trench orange, HDD gold, cable laying cyan, other types their own colour), start and end pins
export function projectMap(p: ProjectView): { pins: MapPin[]; lines: MapLine[] } {
  const lines: MapLine[] = p.plan.parts.filter((x) => x.path.length > 1)
    .map((x) => ({ points: x.path, color: typeColor(x.type, p.plan.types), weight: 5, title: `${x.type}${x.name ? ` · ${x.name}` : ""} · ${metres(x.lengthM)}` }));
  if (p.route.length > 1) lines.unshift({ points: p.route, color: "#5b3fe6", weight: 8, title: `Whole route · ${metres(p.routeLengthM)}` });
  const pins: MapPin[] = [];
  if (p.route.length) pins.push({ at: p.route[0], text: "S", kind: "start", title: p.startLabel ?? "Start" });
  if (p.route.length > 1) pins.push({ at: p.route[p.route.length - 1], text: "E", kind: "end", title: p.endLabel ?? "End" });
  return { pins, lines };
}
