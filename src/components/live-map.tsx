"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { telgoConfig } from "@/lib/config";
import { engineers, projects } from "@/lib/demo-data";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const focus = projects.find((project) => project.id === focusProjectId) ?? projects[0];
    const map = new maplibregl.Map({
      container: ref.current,
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${telgoConfig.mapTilerKey}`,
      center: compact ? focus.coordinates : [76.35, 10.45],
      zoom: compact ? 10.2 : 7.1,
      attributionControl: false
    });

    mapRef.current = map;
    map.on("load", () => {
      setReady(true);

      projects.forEach((project) => {
        const marker = document.createElement("div");
        marker.className =
          "grid h-8 w-8 place-items-center rounded-full border border-green-300/60 bg-green-500/25 shadow-[0_0_28px_rgba(34,224,82,0.45)]";
        marker.innerHTML = "<span class='h-3 w-3 rounded-full bg-green-400'></span>";
        new maplibregl.Marker({ element: marker })
          .setLngLat(project.coordinates)
          .setPopup(
            new maplibregl.Popup({ closeButton: false }).setHTML(
              `<strong>${project.name}</strong><br/>${project.location}<br/>${project.progress}% complete`
            )
          )
          .addTo(map);
      });

      engineers.forEach((engineer, index) => {
        const marker = document.createElement("div");
        const moving = engineer.status === "Moving" || engineer.status === "Active";
        marker.className = `grid h-9 w-9 place-items-center rounded-full border ${
          moving
            ? "border-cyan-300/70 bg-cyan-500/25 shadow-[0_0_28px_rgba(5,217,255,0.45)]"
            : "border-amber-300/70 bg-amber-500/25 shadow-[0_0_28px_rgba(255,159,10,0.35)]"
        }`;
        marker.innerHTML = moving ? "↟" : "•";
        const base = projects[index % projects.length].coordinates;
        new maplibregl.Marker({ element: marker })
          .setLngLat([base[0] + 0.08, base[1] + 0.06])
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [compact, focusProjectId]);

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
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-ink-950/64 text-sm text-slate-300">
          Loading live map
        </div>
      ) : null}
      {!compact ? (
        <>
          <GlassCard className="absolute left-4 top-4 w-[190px] space-y-3 p-3">
            {[
              ["Moving", "cyan"],
              ["Idle", "amber"],
              ["Alert", "red"],
              ["Site Online", "green"]
            ].map(([label, tone]) => (
              <div key={label} className="flex items-center gap-2 text-sm text-slate-200">
                <span className={cn("h-3 w-3 rounded-full", dotClass(tone))} />
                {label}
              </div>
            ))}
          </GlassCard>
          <div className="absolute right-4 top-4 grid overflow-hidden rounded-2xl border border-white/10 bg-ink-950/80">
            {["Layers", "Sites", "Geofences"].map((label) => (
              <button
                key={label}
                className="flex min-h-16 w-24 flex-col items-center justify-center gap-1 border-b border-white/10 text-sm text-white last:border-b-0"
                type="button"
              >
                <Icon name={label === "Layers" ? "Layers" : label === "Sites" ? "MapPin" : "Circle"} />
                {label}
              </button>
            ))}
          </div>
          <GlassCard className="absolute bottom-6 left-4 w-[260px] border-red-400/40 bg-red-950/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <Badge tone="red">Active Alert</Badge>
              <span className="text-xs text-slate-300">10 min ago</span>
            </div>
            <h3 className="text-lg font-semibold">Machine Breakdown</h3>
            <p className="mt-1 text-sm text-slate-300">CIAL 33kV UG Cable Laying</p>
            <button
              className="mt-4 w-full rounded-xl border border-red-400/60 py-2 text-sm font-semibold text-red-300"
              type="button"
            >
              View Details
            </button>
          </GlassCard>
        </>
      ) : null}
    </div>
  );
}

function dotClass(tone: string) {
  if (tone === "cyan") return "bg-telgo-cyan";
  if (tone === "amber") return "bg-telgo-amber";
  if (tone === "red") return "bg-telgo-red";
  return "bg-telgo-green";
}
