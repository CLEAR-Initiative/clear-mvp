"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "~/env";

interface CrisisMarker {
  id: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: string;
  type: string;
  status: string;
  affectedPopulation: number;
}

interface CrisisMapProps {
  crises: CrisisMarker[];
  filters?: {
    severity?: string;
    type?: string;
    status?: string;
  };
}

const severityColors: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MODERATE: "#ca8a04",
  LOW: "#16a34a",
};

const typeIcons: Record<string, string> = {
  NATURAL_DISASTER: "Natural Disaster",
  CONFLICT: "Conflict",
  EPIDEMIC: "Epidemic",
  FAMINE: "Famine",
  REFUGEE_CRISIS: "Refugee Crisis",
  ECONOMIC_CRISIS: "Economic Crisis",
  OTHER: "Other",
};

export function CrisisMap({ crises, filters }: CrisisMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const router = useRouter();
  const [mapReady, setMapReady] = useState(false);

  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!token) {
      setMapReady(true);
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [30, 10], // Center on Africa/Middle East (humanitarian hotspot)
      zoom: 2.5,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Update markers when crises or filters change
  useEffect(() => {
    if (!mapReady || !map.current || !token) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Filter crises
    let filtered = crises.filter(
      (c) => c.latitude != null && c.longitude != null,
    );

    if (filters?.severity) {
      filtered = filtered.filter((c) => c.severity === filters.severity);
    }
    if (filters?.type) {
      filtered = filtered.filter((c) => c.type === filters.type);
    }
    if (filters?.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    // Add markers
    filtered.forEach((crisis) => {
      const color = severityColors[crisis.severity] ?? "#6b7280";

      const el = document.createElement("div");
      el.className = "crisis-marker";
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = color;
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";

      // Scale marker based on severity
      if (crisis.severity === "CRITICAL") {
        el.style.width = "32px";
        el.style.height = "32px";
      } else if (crisis.severity === "HIGH") {
        el.style.width = "28px";
        el.style.height = "28px";
      }

      const popup = new mapboxgl.Popup({ offset: 25, maxWidth: "300px" }).setHTML(`
        <div style="font-family: system-ui, sans-serif; padding: 4px;">
          <h3 style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0;">${crisis.title}</h3>
          <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">${crisis.location}</p>
          <div style="display: flex; gap: 8px; font-size: 11px; margin-bottom: 4px;">
            <span style="background: ${color}; color: white; padding: 1px 6px; border-radius: 4px;">${crisis.severity}</span>
            <span style="background: #f3f4f6; padding: 1px 6px; border-radius: 4px;">${typeIcons[crisis.type] ?? crisis.type}</span>
          </div>
          ${crisis.affectedPopulation > 0 ? `<p style="color: #6b7280; font-size: 11px; margin: 0;">Affected: ${crisis.affectedPopulation.toLocaleString()}</p>` : ""}
          <button
            onclick="window.__navigateToCrisis('${crisis.id}')"
            style="margin-top: 6px; font-size: 12px; color: #2563eb; background: none; border: none; cursor: pointer; padding: 0; text-decoration: underline;"
          >View details</button>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([crisis.longitude!, crisis.latitude!])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [crises, filters, mapReady, token, router]);

  // Navigation helper exposed to popup HTML
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__navigateToCrisis = (id: string) => {
      router.push(`/crises/${id}`);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__navigateToCrisis;
    };
  }, [router]);

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/50">
        <div className="text-center">
          <p className="text-sm font-medium">Mapbox Token Not Configured</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your{" "}
            <code className="rounded bg-muted px-1">.env</code> file to enable the crisis map.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full rounded-lg" />;
}
