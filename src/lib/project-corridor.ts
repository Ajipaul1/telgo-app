import type { Project, ProjectCorridor } from "@/lib/types";

export function hasCorridor(project: Project): project is Project & { corridor: ProjectCorridor } {
  return Boolean(project.corridor);
}

export function getProjectAnchor(project: Project): [number, number] {
  if (!project.corridor) return project.coordinates;
  const [startLng, startLat] = project.corridor.startCoordinates;
  const [endLng, endLat] = project.corridor.endCoordinates;
  return [(startLng + endLng) / 2, (startLat + endLat) / 2];
}

export function interpolateAlongCorridor(
  start: [number, number],
  end: [number, number],
  totalMeters: number,
  metersFromStart: number
): [number, number] {
  const safeTotal = Math.max(totalMeters, 1);
  const clamped = Math.min(Math.max(metersFromStart, 0), safeTotal);
  const ratio = clamped / safeTotal;
  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio
  ];
}

export function getCorridorProgressPoint(corridor: ProjectCorridor): [number, number] {
  return interpolateAlongCorridor(
    corridor.startCoordinates,
    corridor.endCoordinates,
    corridor.totalMeters,
    corridor.completedMeters
  );
}

export function getRemainingMeters(project: Project) {
  if (!project.corridor) return Math.max(Math.round((project.totalLengthKm - project.completedKm) * 1000), 0);
  return Math.max(project.corridor.totalMeters - project.corridor.completedMeters, 0);
}

export function getProgressMeters(project: Project) {
  if (!project.corridor) return Math.round(project.completedKm * 1000);
  return project.corridor.completedMeters;
}

export function formatMeters(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

export function getGoogleMapsDirectionsUrl(project: Project) {
  if (!project.corridor) {
    const [lng, lat] = project.coordinates;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const [startLng, startLat] = project.corridor.startCoordinates;
  const [endLng, endLat] = project.corridor.endCoordinates;
  return `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=walking`;
}
