"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

declare global {
  interface Window {
    google?: any;
    __telgoGoogleMapsPromise?: Promise<any>;
    gm_authFailure?: () => void;
  }
}

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
  projectsData,
  compactProjectScope = "focus",
  compactActionLabel = "View Full Map",
  onCompactAction
}: {
  className?: string;
  compact?: boolean;
  focusProjectId?: string;
  trackedPoints?: LiveMapTrackedPoint[];
  satellite?: boolean;
  projectsData?: Project[];
  compactProjectScope?: "focus" | "portfolio";
  compactActionLabel?: string;
  onCompactAction?: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlayRefs = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapErrorDetail, setMapErrorDetail] = useState<string | null>(null);
  const safeTrackedPoints = trackedPoints ?? EMPTY_TRACKED_POINTS;
  const safeProjects = useMemo(() => (projectsData?.length ? projectsData : projects), [projectsData]);

  useEffect(() => {
    if (!ref.current) return;

    let cancelled = false;
    const container = ref.current;
    const focus = safeProjects.find((project) => project.id === focusProjectId) ?? safeProjects[0];

    setReady(false);
    setMapError(false);
    setMapErrorDetail(null);
    clearGoogleOverlays(overlayRefs.current);
    mapRef.current = null;
    infoWindowRef.current = null;
    container.innerHTML = "";

    const handleAuthFailure = () => {
      if (cancelled) return;
      setMapErrorDetail(
        "Google Maps authentication failed. Check billing, enable Maps JavaScript API, and allow your Vercel domains in HTTP referrer restrictions."
      );
      setMapError(true);
      setReady(true);
    };

    window.gm_authFailure = handleAuthFailure;

    void loadGoogleMapsApi(telgoConfig.googleMapsApiKey)
      .then((maps) => {
        if (cancelled || !container) return;

        const anchor = getProjectAnchor(focus);
        const map = new maps.Map(container, {
          center: { lat: anchor[1], lng: anchor[0] },
          zoom: compact ? 13.4 : 11.6,
          mapTypeId: compact ? "roadmap" : satellite ? "hybrid" : "roadmap",
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          disableDefaultUI: compact
        });

        mapRef.current = map;
        infoWindowRef.current = new maps.InfoWindow();

        const visibleProjects =
          compact && compactProjectScope === "portfolio" ? safeProjects : compact ? [focus] : safeProjects;

        visibleProjects.forEach((project) => {
          addProjectMarker(maps, map, project, overlayRefs.current, infoWindowRef.current, project.id === focus.id);
          if (hasCorridor(project)) {
            addCorridorLayers(maps, map, project, overlayRefs.current, project.id === focus.id);
            addCorridorMarkers(maps, map, project, overlayRefs.current, infoWindowRef.current);
          }
        });

        if (safeTrackedPoints.length) {
          safeTrackedPoints.forEach((point) => {
            const relatedProject = safeProjects.find((project) => project.id === point.projectId) ?? null;
            if (relatedProject) {
              addTrackedLocationLink(maps, map, point, relatedProject, overlayRefs.current);
            }
            addTrackedLocationMarker(maps, map, point, overlayRefs.current, infoWindowRef.current);
          });
        } else {
          engineers.forEach((engineer, index) => {
            const project = visibleProjects[index % visibleProjects.length] ?? focus;
            const anchorPoint = getProjectAnchor(project);
            const marker = new maps.Marker({
              map,
              position: { lat: anchorPoint[1] + 0.0005, lng: anchorPoint[0] + 0.0008 },
              icon: {
                path: maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: engineer.status === "Moving" || engineer.status === "Active" ? "#22d3ee" : "#f59e0b",
                fillOpacity: 0.92,
                strokeColor: "#ffffff",
                strokeWeight: 2
              },
              label: {
                text: "E",
                color: "#07122f",
                fontSize: "11px",
                fontWeight: "700"
              }
            });

            marker.addListener("click", () => {
              infoWindowRef.current?.setContent(
                `<strong>${engineer.name}</strong><br/>${engineer.site}<br/>${engineer.status}`
              );
              infoWindowRef.current?.open({ anchor: marker, map });
            });

            overlayRefs.current.push(marker);
          });
        }

        fitMapToVisibleProjects(maps, map, visibleProjects, compact, safeTrackedPoints);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setMapErrorDetail(
          error instanceof Error
            ? error.message
            : "Google Maps could not be loaded. Check billing, Maps JavaScript API, and referrer restrictions."
        );
        setMapError(true);
        setReady(true);
      });

    return () => {
      cancelled = true;
      if (window.gm_authFailure === handleAuthFailure) {
        delete window.gm_authFailure;
      }
      clearGoogleOverlays(overlayRefs.current);
      mapRef.current = null;
      infoWindowRef.current = null;
      container.innerHTML = "";
    };
  }, [compact, compactProjectScope, focusProjectId, safeProjects, satellite, safeTrackedPoints]);

  const focus = safeProjects.find((project) => project.id === focusProjectId) ?? safeProjects[0];
  const visibleProjects =
    compact && compactProjectScope === "portfolio" ? safeProjects : compact ? [focus] : safeProjects;
  const corridor = focus.corridor;
  const latestUpdate = corridor?.progressUpdates[0];
  const googleMapsReady = Boolean(telgoConfig.googleMapsApiKey);
  const compactCards = (compactProjectScope === "portfolio" ? safeProjects : [focus]).slice(0, 5);
  const compactViewport = getFallbackViewport(compactCards, safeTrackedPoints);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10",
        compact ? "bg-[#edf3f9]" : "bg-[url('/assets/background-hero-image.webp')] bg-cover bg-center",
        compact ? "h-[280px]" : "h-[620px] max-h-[68svh]",
        className
      )}
    >
      <div ref={ref} className="absolute inset-0" data-telgo-google-map="true" />
      <div className="pointer-events-none absolute inset-0 bg-ink-950/15" />
      {mapError ? (
        <div className="absolute inset-0 bg-[#07122f]">
          <FallbackProjectMap
            projects={visibleProjects}
            trackedPoints={safeTrackedPoints}
            focusProjectId={focus.id}
            compact={compact}
          />
          <div className="absolute left-4 top-4 flex items-center gap-3">
            <Badge tone="amber">Google Maps Fallback</Badge>
            <span className="text-xs text-slate-300">
              Google map tiles unavailable, seeded works plot shown
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
              <p className="mt-2 text-xs leading-5 text-slate-300">
                {latestUpdate.label} · {latestUpdate.recordedAt}
              </p>
            ) : null}
            {mapErrorDetail ? (
              <p className="mt-3 text-xs leading-5 text-amber-200">{mapErrorDetail}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-ink-950/64 text-sm text-slate-300">
          Loading Google map
        </div>
      ) : null}
      {compact ? (
        <CompactMapOverlay
          projects={compactCards}
          viewport={compactViewport}
          focusProjectId={focus.id}
          onAction={onCompactAction}
          actionLabel={compactActionLabel}
        />
      ) : null}
      {!compact && !mapError ? (
        <>
          <GlassCard className="absolute left-4 top-4 w-[240px] space-y-3 p-3">
            <div className="flex items-center justify-between">
              <Badge tone={googleMapsReady ? "green" : "amber"}>
                {googleMapsReady ? "Google Maps Ready" : "Google Key Missing"}
              </Badge>
              <span className="text-xs text-slate-300">
                {satellite ? "Satellite live view" : "Roadmap canvas"}
              </span>
            </div>
            <div className="space-y-2 text-sm text-slate-200">
              <p className="text-xs text-slate-300">Google route link enabled</p>
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
              <p className="mt-1 text-sm text-slate-300">
                {latestUpdate?.detail ?? "Progress data will appear here once field updates are recorded."}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-slate-400">Completed</p>
                  <p className="font-semibold text-telgo-green">{formatMeters(corridor.completedMeters)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Remaining</p>
                  <p className="font-semibold text-telgo-cyan">
                    {formatMeters(corridor.totalMeters - corridor.completedMeters)}
                  </p>
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

function loadGoogleMapsApi(apiKey: string) {
  if (!apiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing."));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__telgoGoogleMapsPromise) {
    return window.__telgoGoogleMapsPromise;
  }

  window.__telgoGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-telgo-google-maps="true"]');

    const finalize = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      window.__telgoGoogleMapsPromise = undefined;
      reject(new Error("Google Maps JavaScript API did not initialize."));
    };

    if (existing) {
      existing.addEventListener("load", finalize, { once: true });
      existing.addEventListener(
        "error",
        () => {
          window.__telgoGoogleMapsPromise = undefined;
          reject(new Error("Google Maps JavaScript API could not be loaded."));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.telgoGoogleMaps = "true";
    script.addEventListener("load", finalize, { once: true });
    script.addEventListener(
      "error",
      () => {
        window.__telgoGoogleMapsPromise = undefined;
        reject(new Error("Google Maps JavaScript API could not be loaded."));
      },
      { once: true }
    );
    document.head.appendChild(script);
  });

  return window.__telgoGoogleMapsPromise;
}

function addProjectMarker(
  maps: any,
  map: any,
  project: Project,
  overlays: any[],
  infoWindow: any,
  emphasized = false
) {
  const anchor = getProjectAnchor(project);
  const popupBody = hasCorridor(project)
    ? `${project.corridor.startLabel} to ${project.corridor.endLabel}<br/>${formatMeters(project.corridor.completedMeters)} of ${formatMeters(project.corridor.totalMeters)} completed`
    : `${project.location}<br/>${project.progress}% complete`;

  const marker = new maps.Marker({
    map,
    position: { lat: anchor[1], lng: anchor[0] },
    icon: {
      path: maps.SymbolPath.CIRCLE,
      scale: emphasized ? 8 : 6,
      fillColor: accentColor(project.accent),
      fillOpacity: 0.95,
      strokeColor: "#ffffff",
      strokeWeight: 2
    }
  });

  marker.addListener("click", () => {
    infoWindow.setContent(`<strong>${project.name}</strong><br/>${popupBody}`);
    infoWindow.open({ anchor: marker, map });
  });

  overlays.push(marker);
}

function addCorridorLayers(
  maps: any,
  map: any,
  project: Project,
  overlays: any[],
  emphasized: boolean
) {
  if (!hasCorridor(project)) return;

  const corridor = project.corridor;
  const progressPoint = getCorridorProgressPoint(corridor);

  const route = new maps.Polyline({
    map,
    path: [
      { lat: corridor.startCoordinates[1], lng: corridor.startCoordinates[0] },
      { lat: corridor.endCoordinates[1], lng: corridor.endCoordinates[0] }
    ],
    geodesic: true,
    strokeColor: accentColor(project.accent),
    strokeOpacity: 0.38,
    strokeWeight: emphasized ? 8 : 6
  });

  const progress = new maps.Polyline({
    map,
    path: [
      { lat: corridor.startCoordinates[1], lng: corridor.startCoordinates[0] },
      { lat: progressPoint[1], lng: progressPoint[0] }
    ],
    geodesic: true,
    strokeColor: "#22c55e",
    strokeOpacity: 0.95,
    strokeWeight: emphasized ? 9 : 7
  });

  overlays.push(route, progress);
}

function addCorridorMarkers(
  maps: any,
  map: any,
  project: Project,
  overlays: any[],
  infoWindow: any
) {
  if (!hasCorridor(project)) return;

  const corridor = project.corridor;
  const progressPoint = getCorridorProgressPoint(corridor);

  const markers = [
    {
      position: { lat: corridor.startCoordinates[1], lng: corridor.startCoordinates[0] },
      label: "S",
      color: "#22d3ee",
      content: `<strong>${corridor.startLabel}</strong><br/>Corridor start`
    },
    {
      position: { lat: corridor.endCoordinates[1], lng: corridor.endCoordinates[0] },
      label: "E",
      color: "#8b5cf6",
      content: `<strong>${corridor.endLabel}</strong><br/>Corridor end`
    },
    {
      position: { lat: progressPoint[1], lng: progressPoint[0] },
      label: "P",
      color: "#22c55e",
      content: `<strong>Progress point</strong><br/>${formatMeters(corridor.completedMeters)} completed`
    }
  ];

  markers.forEach((item) => {
    const marker = new maps.Marker({
      map,
      position: item.position,
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: item.color,
        fillOpacity: 0.95,
        strokeColor: "#ffffff",
        strokeWeight: 2
      },
      label: {
        text: item.label,
        color: "#07122f",
        fontSize: "10px",
        fontWeight: "700"
      }
    });

    marker.addListener("click", () => {
      infoWindow.setContent(item.content);
      infoWindow.open({ anchor: marker, map });
    });

    overlays.push(marker);
  });

  corridor.progressUpdates.forEach((update) => {
    const point = interpolateAlongCorridor(
      corridor.startCoordinates,
      corridor.endCoordinates,
      corridor.totalMeters,
      update.metersCompleted
    );

    const marker = new maps.Marker({
      map,
      position: { lat: point[1], lng: point[0] },
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: "#f59e0b",
        fillOpacity: 0.95,
        strokeColor: "#ffffff",
        strokeWeight: 2
      },
      label: {
        text: "U",
        color: "#07122f",
        fontSize: "10px",
        fontWeight: "700"
      }
    });

    marker.addListener("click", () => {
      infoWindow.setContent(
        `<strong>${update.label}</strong><br/>${update.detail}<br/>${update.recordedAt}`
      );
      infoWindow.open({ anchor: marker, map });
    });

    overlays.push(marker);
  });
}

function addTrackedLocationMarker(
  maps: any,
  map: any,
  point: LiveMapTrackedPoint,
  overlays: any[],
  infoWindow: any
) {
  const marker = new maps.Marker({
    map,
    position: { lat: point.latitude, lng: point.longitude },
    icon: {
      url: buildTrackedMarkerIcon(point.withinGeofence ? "#115cff" : "#f59e0b", point.userName),
      scaledSize: new maps.Size(158, 52),
      anchor: new maps.Point(20, 45)
    },
    zIndex: point.withinGeofence ? 900 : 950
  });

  marker.addListener("click", () => {
    infoWindow.setContent(
      `<strong>${point.userName}</strong><br/>@${point.userLoginId}<br/>${point.projectName}<br/>${point.distanceFromSiteM} m from site start<br/>${new Date(point.recordedAt).toLocaleString("en-IN")}`
    );
    infoWindow.open({ anchor: marker, map });
  });

  overlays.push(marker);
}

function addTrackedLocationLink(
  maps: any,
  map: any,
  point: LiveMapTrackedPoint,
  project: Project,
  overlays: any[]
) {
  const anchor = hasCorridor(project) ? project.corridor.startCoordinates : project.coordinates;

  const line = new maps.Polyline({
    map,
    path: [
      { lat: anchor[1], lng: anchor[0] },
      { lat: point.latitude, lng: point.longitude }
    ],
    geodesic: true,
    strokeColor: point.withinGeofence ? "#115cff" : "#f59e0b",
    strokeOpacity: 0.8,
    strokeWeight: 3,
    icons: [
      {
        icon: {
          path: "M 0,-1 0,1",
          strokeOpacity: 1,
          scale: 3
        },
        offset: "0",
        repeat: "14px"
      }
    ]
  });

  overlays.push(line);
}

function fitMapToVisibleProjects(
  maps: any,
  map: any,
  projects: Project[],
  compact: boolean,
  trackedPoints: LiveMapTrackedPoint[]
) {
  const bounds = new maps.LatLngBounds();

  projects.forEach((project) => {
    const anchor = getProjectAnchor(project);
    bounds.extend({ lat: anchor[1], lng: anchor[0] });

    if (hasCorridor(project)) {
      bounds.extend({ lat: project.corridor.startCoordinates[1], lng: project.corridor.startCoordinates[0] });
      bounds.extend({ lat: project.corridor.endCoordinates[1], lng: project.corridor.endCoordinates[0] });
      const progress = getCorridorProgressPoint(project.corridor);
      bounds.extend({ lat: progress[1], lng: progress[0] });
    }
  });

  trackedPoints.forEach((point) => {
    bounds.extend({ lat: point.latitude, lng: point.longitude });
  });

  if (bounds.isEmpty()) return;

  map.fitBounds(bounds, compact ? 56 : 92);
}

function clearGoogleOverlays(overlays: any[]) {
  overlays.forEach((overlay) => {
    if (typeof overlay?.setMap === "function") {
      overlay.setMap(null);
    }
  });
  overlays.length = 0;
}

function CompactMapOverlay({
  projects,
  viewport,
  focusProjectId,
  actionLabel,
  onAction
}: {
  projects: Project[];
  viewport: FallbackViewport;
  focusProjectId: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute right-4 top-4">
        <button
          type="button"
          onClick={onAction}
          className="pointer-events-auto inline-flex min-h-10 items-center gap-2 rounded-full bg-[#0b1737] px-4 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(7,18,47,0.22)]"
        >
          <Icon name="Map" className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      </div>
      {projects.map((project) => {
        const anchor = getProjectAnchor(project);
        const point = projectPoint(anchor[0], anchor[1], viewport);
        const left = `${(point.x / FALLBACK_WIDTH) * 100}%`;
        const top = `${(point.y / FALLBACK_HEIGHT) * 100}%`;
        const isFocused = project.id === focusProjectId;
        return (
          <div
            key={`compact-card-${project.id}`}
            className="absolute"
            style={{
              left,
              top,
              transform: "translate(-34%, -92%)"
            }}
          >
            <div className="pointer-events-auto flex items-start gap-2">
              <div className="mt-7 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white shadow-md">
                <span
                  className="block h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: accentColor(project.accent) }}
                />
              </div>
              <div
                className={cn(
                  "max-w-[140px] rounded-2xl border px-3 py-2 shadow-[0_14px_28px_rgba(15,23,42,0.10)] backdrop-blur-sm",
                  isFocused ? "border-blue-100 bg-white/96" : "border-white/80 bg-white/92"
                )}
              >
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    compactStatusChip(project.status)
                  )}
                >
                  {project.status}
                </span>
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[#07122f]">
                  {compactProjectLabel(project)}
                </p>
                <p className="mt-1 text-[10px] font-medium text-slate-500">{project.totalLengthKm} km</p>
              </div>
            </div>
          </div>
        );
      })}
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
          <stop offset="0%" stopColor={compact ? "#f6f9fc" : "#07122f"} />
          <stop offset="52%" stopColor={compact ? "#eef4fa" : "#0d1c45"} />
          <stop offset="100%" stopColor={compact ? "#e8eff7" : "#132b63"} />
        </linearGradient>
        <pattern id="telgoFallbackGrid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path
            d="M 56 0 L 0 0 0 56"
            fill="none"
            stroke={compact ? "rgba(148,163,184,0.18)" : "rgba(255,255,255,0.08)"}
            strokeWidth="1"
          />
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
      {compact ? (
        <>
          <path
            d="M30 120 C180 80, 260 180, 390 150 S650 70, 960 150"
            fill="none"
            stroke="rgba(59,130,246,0.12)"
            strokeWidth="48"
            strokeLinecap="round"
          />
          <path
            d="M90 500 C220 420, 330 430, 470 360 S760 280, 940 340"
            fill="none"
            stroke="rgba(148,163,184,0.18)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M110 240 C220 200, 360 240, 520 210 S760 170, 900 210"
            fill="none"
            stroke="rgba(148,163,184,0.22)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="12 10"
          />
          <path
            d="M220 60 L240 560"
            fill="none"
            stroke="rgba(148,163,184,0.12)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M650 40 L610 580"
            fill="none"
            stroke="rgba(148,163,184,0.12)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <text x="96" y="222" fontSize="18" fontWeight="600" fill="rgba(71,85,105,0.85)">
            Kochi
          </text>
          <text x="770" y="194" fontSize="18" fontWeight="600" fill="rgba(71,85,105,0.85)">
            Vadakkekotta
          </text>
          <text x="118" y="456" fontSize="18" fontWeight="600" fill="rgba(71,85,105,0.85)">
            Kottayam
          </text>
          <text x="872" y="310" fontSize="18" fontWeight="600" fill="rgba(71,85,105,0.85)">
            Kannur
          </text>
        </>
      ) : (
        <>
          <circle cx="180" cy="90" r="220" fill="rgba(17,92,255,0.10)" />
          <circle cx="860" cy="520" r="260" fill="rgba(34,211,238,0.12)" />
        </>
      )}

      {projects.map((project) => (
        <g key={project.id}>
          {hasCorridor(project) ? (
            <>
              <line
                x1={projectPoint(project.corridor.startCoordinates[0], project.corridor.startCoordinates[1], viewport).x}
                y1={projectPoint(project.corridor.startCoordinates[0], project.corridor.startCoordinates[1], viewport).y}
                x2={projectPoint(project.corridor.endCoordinates[0], project.corridor.endCoordinates[1], viewport).x}
                y2={projectPoint(project.corridor.endCoordinates[0], project.corridor.endCoordinates[1], viewport).y}
                stroke={accentColor(project.accent, 0.4)}
                strokeWidth={compact ? 6 : 10}
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
                strokeWidth={compact ? 7 : 12}
                strokeLinecap="round"
                filter="url(#telgoGlow)"
              />
            </>
          ) : null}

          {!compact ? renderProjectMarker(project, viewport, focusProjectId === project.id) : null}
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
  const accent = accentColor(project.accent);
  const labelY = pos.y - (focused ? 28 : 18);

  return (
    <g key={`${project.id}-marker`}>
      <circle cx={pos.x} cy={pos.y} r={focused ? 18 : 14} fill={accentColor(project.accent, 0.22)} />
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

  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats)
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

function accentColor(accent: Project["accent"], alpha?: number) {
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

function buildTrackedMarkerIcon(fillColor: string, userName: string) {
  const label = escapeSvgText(shortTrackedName(userName));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="158" height="52" viewBox="0 0 158 52" fill="none">
      <path d="M20 1C11.163 1 4 8.163 4 17C4 28.04 15.825 39.996 19.048 43.033C19.594 43.548 20.406 43.548 20.952 43.033C24.175 39.996 36 28.04 36 17C36 8.163 28.837 1 20 1Z" fill="${fillColor}" stroke="white" stroke-width="2"/>
      <circle cx="20" cy="17" r="7" fill="white" fill-opacity="0.18"/>
      <rect x="42" y="6" width="110" height="30" rx="15" fill="white" fill-opacity="0.96" stroke="rgba(15,23,42,0.10)" />
      <text x="97" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#07122f">${label}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function shortTrackedName(userName: string) {
  const normalized = userName.trim();
  if (!normalized) return "Engineer";
  const parts = normalized.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 16);
  const first = parts[0];
  const second = parts[1];
  return `${first} ${second}`.slice(0, 16);
}

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function compactStatusChip(status: Project["status"]) {
  switch (status) {
    case "Completed":
      return "bg-emerald-50 text-[#14b866]";
    case "Delayed":
      return "bg-rose-50 text-[#ef4444]";
    case "At Risk":
      return "bg-amber-50 text-[#ff8a00]";
    case "Active":
      return "bg-blue-50 text-[#115cff]";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function compactProjectLabel(project: Project) {
  if (project.name.includes("Vadakkekotta")) return "Vadakkekotta - SN Junction";
  if (project.name.includes("Kolenchery")) return "Kolenchery - Ernakulam";
  if (project.name.includes("Kannur")) return "Kannur - PWD Road";
  if (project.name.includes("Kottayam")) return "Kottayam - Puthuppally";
  if (project.name.includes("Ernakulam MG Road")) return "Ernakulam - MG Road";
  return project.name;
}
