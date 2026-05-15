"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { telgoConfig } from "@/lib/config";
import { engineers, projects } from "@/lib/demo-data";
import {
  formatMeters,
  getCorridorProgressPoint,
  getGoogleMapsDirectionsUrl,
  getProjectAnchor,
  hasCorridor,
  interpolateAlongCorridor
} from "@/lib/project-corridor";
import type { Project } from "@/lib/types";
import { Badge, GlassCard, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

export type LiveMapTrackedPoint = {
  id: string;
  mobileUserId: string;
  userName: string;
  userLoginId: string;
  userRole: string;
  projectId: string;
  projectName: string;
  latitude: number;
  longitude: number;
  gpsAccuracyM: number | null;
  distanceFromSiteM: number;
  withinGeofence: boolean;
  source: string;
  recordedAt: string;
};

const EMPTY_TRACKED_POINTS: LiveMapTrackedPoint[] = [];

export function LiveMap({
  className,
  compact = false,
  focusProjectId,
  trackedPoints,
  satellite = true,
  projectsData
}: {
  className?: string;
  compact?: boolean;
  focusProjectId?: string;
  trackedPoints?: LiveMapTrackedPoint[];
  satellite?: boolean;
  projectsData?: Project[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const safeTrackedPoints = trackedPoints ?? EMPTY_TRACKED_POINTS;
  const safeProjects = useMemo(() => (projectsData?.length ? projectsData : projects), [projectsData]);

  useEffect(() => {
    if (!ref.current) return;

    setReady(false);
    setMapError(false);

    if (mapRef.current) {
      clearMarkers(markerRefs.current);
      mapRef.current.remove();
      mapRef.current = null;
    }

    const focus = safeProjects.find((project) => project.id === focusProjectId) ?? safeProjects[0];
    const map = new maplibregl.Map({
      container: ref.current,
      style: `https://api.maptiler.com/maps/${satellite ? "hybrid" : "dataviz-dark"}/style.json?key=${telgoConfig.mapTilerKey}`,
      center: getProjectAnchor(focus),
      zoom: compact ? 13.6 : 12.4,
      attributionControl: false
    });

    mapRef.current = map;
    map.on("error", () => {
      setMapError(true);
      setReady(true);
    });

    map.on("load", () => {
      clearMarkers(markerRefs.current);
      setReady(true);

      const visibleProjects = compact ? [focus] : safeProjects;

      visibleProjects.forEach((project) => {
        addProjectMarker(map, project, markerRefs.current, project.id === focus.id);
        if (hasCorridor(project)) {
          addCorridorLayers(map, project, project.id === focus.id);
          addCorridorMarkers(map, project, markerRefs.current);
        }
      });

      if (safeTrackedPoints.length) {
        safeTrackedPoints.forEach((point) => {
          addTrackedLocationMarker(map, point, markerRefs.current);
        });
      } else {
        engineers.forEach((engineer, index) => {
          const project = visibleProjects[index % visibleProjects.length] ?? focus;
          const anchor = getProjectAnchor(project);
          const marker = document.createElement("div");
          const moving = engineer.status === "Moving" || engineer.status === "Active";
          marker.className = `grid h-9 w-9 place-items-center rounded-full border ${
            moving
              ? "border-cyan-300/70 bg-cyan-500/25 shadow-[0_0_28px_rgba(5,217,255,0.45)]"
              : "border-amber-300/70 bg-amber-500/25 shadow-[0_0_28px_rgba(255,159,10,0.35)]"
          }`;
          marker.innerHTML = moving ? "<span class='text-sm text-cyan-200'>E</span>" : "<span class='text-sm text-amber-200'>E</span>";

          const engineerMarker = new maplibregl.Marker({ element: marker })
            .setLngLat([anchor[0] + 0.0008, anchor[1] + 0.0005])
            .setPopup(
              new maplibregl.Popup({ closeButton: false }).setHTML(
                `<strong>${engineer.name}</strong><br/>${engineer.site}<br/>${engineer.status}`
              )
            )
            .addTo(map);
          markerRefs.current.push(engineerMarker);
        });
      }

      fitMapToProject(map, focus, compact, safeTrackedPoints);
    });

    return () => {
      clearMarkers(markerRefs.current);
      map.remove();
      mapRef.current = null;
    };
  }, [compact, focusProjectId, safeProjects, satellite, safeTrackedPoints]);

  const focus = safeProjects.find((project) => project.id === focusProjectId) ?? safeProjects[0];
  const visibleProjects = compact ? [focus] : safeProjects;
  const corridor = focus.corridor;
  const latestUpdate = corridor?.progressUpdates[0];
  const interactiveMapReady = Boolean(telgoConfig.mapTilerKey);
  const googleRouteReady = Boolean(telgoConfig.googleMapsApiKey);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-[url('/assets/background-hero-image.webp')] bg-cover bg-center",
        compact ? "h-[280px]" : "h-[620px] max-h-[68svh]",
        className
      )}
    >
      <div ref={ref} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-ink-950/20" />
      {mapError ? (
        <div className="absolute inset-0 bg-[#07122f]">
          <FallbackProjectMap
            projects={visibleProjects}
            trackedPoints={safeTrackedPoints}
            focusProjectId={focus.id}
            compact={compact}
          />
          <div className="absolute left-4 top-4 flex items-center gap-3">
            <Badge tone="amber">Map Fallback</Badge>
            <span className="text-xs text-slate-300">
              Interactive tiles unavailable, seeded works map shown
            </span>
          </div>
          <div className="absolute bottom-4 right-4 max-w-[360px] rounded-2xl border border-white/10 bg-ink-950/70 px-4 py-3 text-sm text-slate-200 backdrop-blur">
            <p className="font-semibold text-white">{focus.name}</p>
            <p className="mt-1 text-slate-300">
              {corridor ? `${corridor.startLabel} to ${corridor.endLabel}` : focus.location}
            </p>
            {corridor ? (
              <p className="mt-2 text-telgo-cyan">
                {formatMeters(corridor.completedMeters)} completed of {formatMeters(corridor.totalMeters)}
              </p>
            ) : null}
            {latestUpdate ? (
              <p className="mt-2 text-xs leading-5 text-slate-300">{latestUpdate.label} · {latestUpdate.recordedAt}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-ink-950/64 text-sm text-slate-300">
          Loading live map
        </div>
      ) : null}
      {!compact && !mapError ? (
        <>
          <GlassCard className="absolute left-4 top-4 w-[240px] space-y-3 p-3">
            <div className="flex items-center justify-between">
              <Badge tone={interactiveMapReady ? "green" : "amber"}>
                {interactiveMapReady ? "Live Map Ready" : "Map Key Missing"}
              </Badge>
              <span className="text-xs text-slate-300">
                {satellite ? "Satellite live view" : "Map canvas"}
              </span>
            </div>
            <div className="space-y-2 text-sm text-slate-200">
              <p className="text-xs text-slate-300">
                {googleRouteReady ? "Google route link enabled" : "Google route link unavailable"}
              </p>
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-telgo-cyan" />
                Planned corridor
              </p>
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-telgo-green" />
                Completed laying
              </p>
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-telgo-amber" />
                Daily update point
              </p>
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-white" />
                Engineer attendance marker
              </p>
            </div>
          </GlassCard>
          <div className="absolute right-4 top-4 grid overflow-hidden rounded-2xl border border-white/10 bg-ink-950/80">
            {["Route", "Crew", "Geofence"].map((label) => (
              <button
                key={label}
                className="flex min-h-16 w-24 flex-col items-center justify-center gap-1 border-b border-white/10 text-sm text-white last:border-b-0"
                type="button"
              >
                <Icon name={label === "Route" ? "Map" : label === "Crew" ? "Users" : "Circle"} />
                {label}
              </button>
            ))}
          </div>
          {corridor ? (
            <GlassCard className="absolute bottom-6 left-4 w-[320px] p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone="cyan">Corridor Progress</Badge>
                <span className="text-xs text-slate-300">{latestUpdate?.recordedAt ?? "No update yet"}</span>
              </div>
              <h3 className="text-lg font-semibold">{corridor.startLabel} to {corridor.endLabel}</h3>
              <p className="mt-1 text-sm text-slate-300">{latestUpdate?.detail ?? "Progress data will appear here once field updates are recorded."}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-slate-400">Completed</p>
                  <p className="font-semibold text-telgo-green">{formatMeters(corridor.completedMeters)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Remaining</p>
                  <p className="font-semibold text-telgo-cyan">{formatMeters(corridor.totalMeters - corridor.completedMeters)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Geofence</p>
                  <p className="font-semibold text-telgo-amber">{formatMeters(corridor.geofenceMeters)}</p>
                </div>
              </div>
              <a
                href={getGoogleMapsDirectionsUrl(focus)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-white"
              >
                Open route in Google Maps
              </a>
            </GlassCard>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function FallbackProjectMap({
  projects,
  trackedPoints,
  focusProjectId,
  compact
}: {
  projects: Project[];
  trackedPoints: LiveMapTrackedPoint[];
  focusProjectId: string;
  compact: boolean;
}) {
  const viewport = getFallbackViewport(projects, trackedPoints);

  return (
    <svg
      viewBox={`0 0 ${FALLBACK_WIDTH} ${FALLBACK_HEIGHT}`}
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Fallback works location map"
    >
      <defs>
        <linearGradient id="telgoFallbackBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#07122f" />
          <stop offset="52%" stopColor="#0d1c45" />
          <stop offset="100%" stopColor="#132b63" />
        </linearGradient>
        <pattern id="telgoFallbackGrid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M 56 0 L 0 0 0 56" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </pattern>
        <filter id="telgoGlow">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={FALLBACK_WIDTH} height={FALLBACK_HEIGHT} fill="url(#telgoFallbackBg)" />
      <rect width={FALLBACK_WIDTH} height={FALLBACK_HEIGHT} fill="url(#telgoFallbackGrid)" opacity="0.35" />
      <circle cx="180" cy="90" r="220" fill="rgba(17,92,255,0.10)" />
      <circle cx="860" cy="520" r="260" fill="rgba(34,211,238,0.12)" />

      {projects.map((project) => (
        <g key={project.id}>
          {hasCorridor(project) ? (
            <>
              <line
                x1={projectPoint(project.corridor.startCoordinates[0], project.corridor.startCoordinates[1], viewport).x}
                y1={projectPoint(project.corridor.startCoordinates[0], project.corridor.startCoordinates[1], viewport).y}
                x2={projectPoint(project.corridor.endCoordinates[0], project.corridor.endCoordinates[1], viewport).x}
                y2={projectPoint(project.corridor.endCoordinates[0], project.corridor.endCoordinates[1], viewport).y}
                stroke={projectAccentColor(project.accent, 0.4)}
                strokeWidth={compact ? 8 : 10}
                strokeLinecap="round"
              />
              <line
                x1={projectPoint(project.corridor.startCoordinates[0], project.corridor.startCoordinates[1], viewport).x}
                y1={projectPoint(project.corridor.startCoordinates[0], project.corridor.startCoordinates[1], viewport).y}
                x2={projectPoint(
                  getCorridorProgressPoint(project.corridor)[0],
                  getCorridorProgressPoint(project.corridor)[1],
                  viewport
                ).x}
                y2={projectPoint(
                  getCorridorProgressPoint(project.corridor)[0],
                  getCorridorProgressPoint(project.corridor)[1],
                  viewport
                ).y}
                stroke="#22c55e"
                strokeWidth={compact ? 9 : 12}
                strokeLinecap="round"
                filter="url(#telgoGlow)"
              />
            </>
          ) : null}

          {renderProjectMarker(project, viewport, focusProjectId === project.id)}
        </g>
      ))}

      {trackedPoints.map((point) => {
        const pos = projectPoint(point.longitude, point.latitude, viewport);
        return (
          <g key={point.id}>
            <circle cx={pos.x} cy={pos.y} r="16" fill="rgba(17,92,255,0.25)" filter="url(#telgoGlow)" />
            <circle
              cx={pos.x}
              cy={pos.y}
              r="10"
              fill={point.withinGeofence ? "#115cff" : "#f59e0b"}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#ffffff"
            >
              {point.userLoginId.slice(-2) || "E"}
            </text>
            {!compact ? (
              <text x={pos.x + 18} y={pos.y - 14} fontSize="11" fontWeight="600" fill="#ffffff">
                {point.userName}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

const FALLBACK_WIDTH = 1000;
const FALLBACK_HEIGHT = 620;
const FALLBACK_PADDING = 90;

type FallbackViewport = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

function renderProjectMarker(project: Project, viewport: FallbackViewport, focused: boolean) {
  const anchor = getProjectAnchor(project);
  const pos = projectPoint(anchor[0], anchor[1], viewport);
  const accent = projectAccentColor(project.accent);
  const labelY = pos.y - (focused ? 28 : 18);

  return (
    <g key={`${project.id}-marker`}>
      <circle cx={pos.x} cy={pos.y} r={focused ? 18 : 14} fill={projectAccentColor(project.accent, 0.22)} />
      <circle cx={pos.x} cy={pos.y} r={focused ? 10 : 8} fill={accent} stroke="#ffffff" strokeWidth="2" />
      <text
        x={pos.x}
        y={labelY}
        textAnchor="middle"
        fontSize={focused ? "14" : "12"}
        fontWeight="700"
        fill="#ffffff"
      >
        {project.code}
      </text>
      <text
        x={pos.x}
        y={labelY + 18}
        textAnchor="middle"
        fontSize="11"
        fill="rgba(255,255,255,0.8)"
      >
        {project.location}
      </text>
    </g>
  );
}

function getFallbackViewport(projects: Project[], trackedPoints: LiveMapTrackedPoint[]): FallbackViewport {
  const allPoints: Array<[number, number]> = [];

  projects.forEach((project) => {
    allPoints.push(project.coordinates);
    const anchor = getProjectAnchor(project);
    allPoints.push(anchor);
    if (hasCorridor(project)) {
      allPoints.push(project.corridor.startCoordinates);
      allPoints.push(project.corridor.endCoordinates);
      allPoints.push(getCorridorProgressPoint(project.corridor));
    }
  });

  trackedPoints.forEach((point) => {
    allPoints.push([point.longitude, point.latitude]);
  });

  const lngs = allPoints.map((point) => point[0]);
  const lats = allPoints.map((point) => point[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return {
    minLng,
    maxLng,
    minLat,
    maxLat
  };
}

function projectPoint(lng: number, lat: number, viewport: FallbackViewport) {
  const lngSpan = Math.max(viewport.maxLng - viewport.minLng, 0.001);
  const latSpan = Math.max(viewport.maxLat - viewport.minLat, 0.001);
  const x =
    FALLBACK_PADDING +
    ((lng - viewport.minLng) / lngSpan) * (FALLBACK_WIDTH - FALLBACK_PADDING * 2);
  const y =
    FALLBACK_HEIGHT -
    FALLBACK_PADDING -
    ((lat - viewport.minLat) / latSpan) * (FALLBACK_HEIGHT - FALLBACK_PADDING * 2);

  return { x, y };
}

function projectAccentColor(accent: Project["accent"], alpha?: number) {
  const palette: Record<Project["accent"], string> = {
    cyan: alpha ? `rgba(34,211,238,${alpha})` : "#22d3ee",
    blue: alpha ? `rgba(59,130,246,${alpha})` : "#3b82f6",
    green: alpha ? `rgba(34,197,94,${alpha})` : "#22c55e",
    amber: alpha ? `rgba(245,158,11,${alpha})` : "#f59e0b",
    red: alpha ? `rgba(244,63,94,${alpha})` : "#f43f5e",
    violet: alpha ? `rgba(139,92,246,${alpha})` : "#8b5cf6",
    slate: alpha ? `rgba(100,116,139,${alpha})` : "#64748b"
  };

  return palette[accent];
}

function addProjectMarker(
  map: maplibregl.Map,
  project: Project,
  markerRefs: maplibregl.Marker[],
  emphasized = false
) {
  const marker = document.createElement("div");
  marker.className =
    "grid h-8 w-8 place-items-center rounded-full border border-green-300/60 bg-green-500/25 shadow-[0_0_28px_rgba(34,224,82,0.45)]";
  marker.innerHTML = `<span class='h-3 w-3 rounded-full ${emphasized ? "bg-cyan-300" : "bg-green-400"}'></span>`;

  const popupBody = hasCorridor(project)
    ? `${project.corridor.startLabel} to ${project.corridor.endLabel}<br/>${formatMeters(project.corridor.completedMeters)} of ${formatMeters(project.corridor.totalMeters)} completed`
    : `${project.location}<br/>${project.progress}% complete`;

  const projectMarker = new maplibregl.Marker({ element: marker })
    .setLngLat(getProjectAnchor(project))
    .setPopup(
      new maplibregl.Popup({ closeButton: false }).setHTML(
        `<strong>${project.name}</strong><br/>${popupBody}`
      )
    )
    .addTo(map);
  markerRefs.push(projectMarker);
}

function addCorridorLayers(map: maplibregl.Map, project: Project, emphasized: boolean) {
  if (!hasCorridor(project)) return;
  const corridor = project.corridor;
  const progressPoint = getCorridorProgressPoint(corridor);
  const routeSourceId = `${project.id}-corridor-route`;
  const progressSourceId = `${project.id}-corridor-progress`;

  map.addSource(routeSourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { projectId: project.id },
          geometry: {
            type: "LineString",
            coordinates: [corridor.startCoordinates, corridor.endCoordinates]
          }
        }
      ]
    } as any
  });

  map.addSource(progressSourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { projectId: project.id },
          geometry: {
            type: "LineString",
            coordinates: [corridor.startCoordinates, progressPoint]
          }
        }
      ]
    } as any
  });

  map.addLayer({
    id: `${project.id}-corridor-base`,
    type: "line",
    source: routeSourceId,
    paint: {
      "line-color": emphasized ? "#22d3ee" : "#60a5fa",
      "line-width": emphasized ? 7 : 5,
      "line-opacity": 0.36
    }
  });

  map.addLayer({
    id: `${project.id}-corridor-progress`,
    type: "line",
    source: progressSourceId,
    paint: {
      "line-color": "#22c55e",
      "line-width": emphasized ? 8 : 6,
      "line-opacity": 0.9
    }
  });
}

function addCorridorMarkers(
  map: maplibregl.Map,
  project: Project,
  markerRefs: maplibregl.Marker[]
) {
  if (!hasCorridor(project)) return;

  const corridor = project.corridor;
  const progressPoint = getCorridorProgressPoint(corridor);

  const startMarker = buildRouteMarker("S", "border-cyan-300/70 bg-cyan-500/25 text-cyan-200");
  const endMarker = buildRouteMarker("E", "border-violet-300/70 bg-violet-500/25 text-violet-200");
  const progressMarker = buildRouteMarker("P", "border-green-300/70 bg-green-500/25 text-green-200");

  markerRefs.push(
    new maplibregl.Marker({ element: startMarker })
      .setLngLat(corridor.startCoordinates)
      .setPopup(new maplibregl.Popup({ closeButton: false }).setHTML(`<strong>${corridor.startLabel}</strong><br/>Corridor start`))
      .addTo(map)
  );
  markerRefs.push(
    new maplibregl.Marker({ element: endMarker })
      .setLngLat(corridor.endCoordinates)
      .setPopup(new maplibregl.Popup({ closeButton: false }).setHTML(`<strong>${corridor.endLabel}</strong><br/>Corridor end`))
      .addTo(map)
  );
  markerRefs.push(
    new maplibregl.Marker({ element: progressMarker })
      .setLngLat(progressPoint)
      .setPopup(
        new maplibregl.Popup({ closeButton: false }).setHTML(
          `<strong>Progress point</strong><br/>${formatMeters(corridor.completedMeters)} completed`
        )
      )
      .addTo(map)
  );

  corridor.progressUpdates.forEach((update) => {
    const updateMarker = buildRouteMarker("U", "border-amber-300/70 bg-amber-500/25 text-amber-200");
    const updatePoint = interpolateAlongCorridor(
      corridor.startCoordinates,
      corridor.endCoordinates,
      corridor.totalMeters,
      update.metersCompleted
    );

    markerRefs.push(
      new maplibregl.Marker({ element: updateMarker })
        .setLngLat(updatePoint)
        .setPopup(
          new maplibregl.Popup({ closeButton: false }).setHTML(
            `<strong>${update.label}</strong><br/>${update.detail}<br/>${update.recordedAt}`
          )
        )
        .addTo(map)
    );
  });
}

function addTrackedLocationMarker(
  map: maplibregl.Map,
  point: LiveMapTrackedPoint,
  markerRefs: maplibregl.Marker[]
) {
  const marker = document.createElement("div");
  marker.className = `grid h-10 w-10 place-items-center rounded-full border text-xs font-bold shadow-[0_0_28px_rgba(17,92,255,0.32)] ${
    point.withinGeofence
      ? "border-white/90 bg-[#115cff]/80 text-white"
      : "border-amber-200/90 bg-amber-500/80 text-white"
  }`;
  marker.textContent = point.userLoginId.slice(-2) || "E";

  const trackedMarker = new maplibregl.Marker({ element: marker })
    .setLngLat([point.longitude, point.latitude])
    .setPopup(
      new maplibregl.Popup({ closeButton: false }).setHTML(
        `<strong>${point.userName}</strong><br/>@${point.userLoginId}<br/>${point.projectName}<br/>${point.distanceFromSiteM} m from site start<br/>${new Date(point.recordedAt).toLocaleString("en-IN")}`
      )
    )
    .addTo(map);

  markerRefs.push(trackedMarker);
}

function buildRouteMarker(label: string, classes: string) {
  const element = document.createElement("div");
  element.className = `grid h-9 w-9 place-items-center rounded-full border text-xs font-semibold shadow-[0_0_20px_rgba(15,23,42,0.35)] ${classes}`;
  element.textContent = label;
  return element;
}

function fitMapToProject(
  map: maplibregl.Map,
  project: Project,
  compact: boolean,
  trackedPoints: LiveMapTrackedPoint[]
) {
  if (hasCorridor(project)) {
    const corridor = project.corridor;
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend(corridor.startCoordinates);
    bounds.extend(corridor.endCoordinates);
    bounds.extend(getCorridorProgressPoint(corridor));
    trackedPoints.forEach((point) => {
      bounds.extend([point.longitude, point.latitude]);
    });
    map.fitBounds(bounds, {
      padding: compact ? 48 : 96,
      maxZoom: compact ? 15.2 : 14.3,
      duration: 0
    });
    return;
  }

  map.easeTo({
    center: project.coordinates,
    zoom: compact ? 13.5 : 11.8,
    duration: 0
  });
}

function clearMarkers(markers: maplibregl.Marker[]) {
  markers.forEach((marker) => marker.remove());
  markers.length = 0;
}
