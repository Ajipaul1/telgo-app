"use client";

import { useEffect, useRef, useState } from "react";
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

export function LiveMap({
  className,
  compact = false,
  focusProjectId
}: {
  className?: string;
  compact?: boolean;
  focusProjectId?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const focus = projects.find((project) => project.id === focusProjectId) ?? projects[0];
    const map = new maplibregl.Map({
      container: ref.current,
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${telgoConfig.mapTilerKey}`,
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

      const visibleProjects = compact ? [focus] : projects;

      visibleProjects.forEach((project) => {
        addProjectMarker(map, project, markerRefs.current, project.id === focus.id);
        if (hasCorridor(project)) {
          addCorridorLayers(map, project, project.id === focus.id);
          addCorridorMarkers(map, project, markerRefs.current);
        }
      });

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

      fitMapToProject(map, focus, compact);
    });

    return () => {
      clearMarkers(markerRefs.current);
      map.remove();
      mapRef.current = null;
    };
  }, [compact, focusProjectId]);

  const focus = projects.find((project) => project.id === focusProjectId) ?? projects[0];
  const corridor = focus.corridor;
  const latestUpdate = corridor?.progressUpdates[0];
  const googleMapsLinked = Boolean(telgoConfig.googleMapsApiKey);

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
        <div className="absolute inset-0 bg-ink-950/82 p-4">
          <div className="mb-3 flex items-center justify-between">
            <Badge tone="amber">Map Fallback</Badge>
            <span className="text-xs text-slate-300">Route summary only</span>
          </div>
          <div className="grid h-full place-items-center">
            <div className="w-full max-w-md space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">{focus.name}</p>
                <p className="mt-2 text-lg font-semibold text-white">{corridor ? `${corridor.startLabel} to ${corridor.endLabel}` : focus.location}</p>
                {corridor ? (
                  <p className="mt-2 text-sm text-telgo-cyan">
                    {formatMeters(corridor.completedMeters)} completed of {formatMeters(corridor.totalMeters)}
                  </p>
                ) : null}
              </div>
              {latestUpdate ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                  <p className="font-medium text-white">{latestUpdate.label}</p>
                  <p className="mt-2">{latestUpdate.detail}</p>
                  <p className="mt-2 text-telgo-cyan">{latestUpdate.recordedAt}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-ink-950/64 text-sm text-slate-300">
          Loading live map
        </div>
      ) : null}
      {!compact ? (
        <>
          <GlassCard className="absolute left-4 top-4 w-[240px] space-y-3 p-3">
            <div className="flex items-center justify-between">
              <Badge tone={googleMapsLinked ? "green" : "amber"}>
                {googleMapsLinked ? "Google Maps Linked" : "Google Maps Missing"}
              </Badge>
              <span className="text-xs text-slate-300">MapTiler canvas</span>
            </div>
            <div className="space-y-2 text-sm text-slate-200">
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

function buildRouteMarker(label: string, classes: string) {
  const element = document.createElement("div");
  element.className = `grid h-9 w-9 place-items-center rounded-full border text-xs font-semibold shadow-[0_0_20px_rgba(15,23,42,0.35)] ${classes}`;
  element.textContent = label;
  return element;
}

function fitMapToProject(map: maplibregl.Map, project: Project, compact: boolean) {
  if (hasCorridor(project)) {
    const corridor = project.corridor;
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend(corridor.startCoordinates);
    bounds.extend(corridor.endCoordinates);
    bounds.extend(getCorridorProgressPoint(corridor));
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
