"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Text, Group, Stack, ActionIcon, UnstyledButton, Select } from "@mantine/core";
import { IconPlayerSkipBack, IconPlayerPlay, IconPlayerSkipForward } from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import {
  getOperationalLocations,
  regionColors,
  getCrisisPins,
  CRISIS_COUNTRIES,
  type CrisisPin,
  type NRCLocation,
} from "~/lib/data/nrc-locations";

/* ========== CDN Loader (same pattern as crisis-map.tsx) ========== */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapboxGLAny = any;

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadMapboxGL(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>).mapboxgl) {
      resolve((window as unknown as Record<string, unknown>).mapboxgl);
      return;
    }
    if (!document.querySelector('link[href*="mapbox-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js";
    script.onload = () => resolve((window as unknown as Record<string, unknown>).mapboxgl);
    script.onerror = () => reject(new Error("Failed to load Mapbox GL JS"));
    document.head.appendChild(script);
  });
}

/* ========== Timeline ========== */

// TODO(demo): months, range, and hasEvent flags are hardcoded — replace with dynamic date range
// derived from the active crisis data or a configurable time window
const timelineMonths = [
  { label: "Sep", hasEvent: false },
  { label: "Oct", hasEvent: true },
  { label: "Nov", hasEvent: true },
  { label: "Dec", hasEvent: false },
  { label: "Jan", hasEvent: false },
  { label: "Feb", hasEvent: false },
];

const views = [
  { key: "single", label: "\u25FB Single" },
  { key: "compare", label: "\u25EB Compare" },
  { key: "timelapse", label: "\u25B6 Time" },
  { key: "nrc-global", label: "\uD83C\uDF0D NRC" },
];

/* ========== Marker helpers ========== */

// Color by event TYPE (what it is), not severity (how bad it is).
// Severity is still communicated via pulse animation (critical) and popup badges.
const typeColors: Record<string, string> = {
  conflict:    "#DC2626", // red
  famine:      "#DC2626", // red — famine is conflict-adjacent in severity
  cholera:     "#F59E0B", // amber — disease outbreak
  flood:       "#2563EB", // blue — water/flood
  drought:     "#D97706", // dark amber — land/earth
  team:        "#059669", // green — response teams
};

function addCrisisMarkersToMap(
  mapboxgl: MapboxGLAny,
  map: MapboxGLAny,
  pins: CrisisPin[],
  markersRef: React.MutableRefObject<MapboxGLAny[]>,
) {
  markersRef.current.forEach((m: MapboxGLAny) => m.remove());
  markersRef.current = [];

  pins.forEach((pin) => {
    const color = typeColors[pin.type] ?? typeColors[pin.severity] ?? "#DC2626";
    const el = document.createElement("div");
    el.style.cssText = `
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: white; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); cursor: pointer; background: ${color};
      ${pin.severity === "critical" ? "animation: marker-pulse 1.5s infinite;" : ""}
    `;
    el.innerHTML = pin.severity === "response" ? "●" : "!";

    const isCritical = pin.severity === "critical";
    const rows: string[] = [];
    if (pin.cases) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E5E5E5;"><span style="font-size:13px;color:#525252;">Cases</span><span style="font-size:13px;font-weight:700;color:#DC2626;">${pin.cases}</span></div>`);
    }
    if (pin.affectedPopulation) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E5E5E5;"><span style="font-size:13px;color:#525252;">Affected</span><span style="font-size:13px;font-weight:700;color:#DC2626;">${(pin.affectedPopulation / 1000).toFixed(0)}k</span></div>`);
    }
    if (pin.members) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E5E5E5;"><span style="font-size:13px;color:#525252;">Members</span><span style="font-size:13px;font-weight:700;">${pin.members}</span></div>`);
    }
    if (pin.trend ?? pin.status) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E5E5E5;"><span style="font-size:13px;color:#525252;">${pin.cases ? "Trend" : "Status"}</span><span style="font-size:13px;font-weight:700;${isCritical ? "color:#DC2626;" : ""}">${pin.trend ?? pin.status ?? ""}</span></div>`);
    }
    if (pin.region) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;"><span style="font-size:13px;color:#525252;">Region</span><span style="font-size:13px;font-weight:700;">${pin.region}</span></div>`);
    }

    const popupHtml = `
      <div style="padding: 12px 16px; font-family: Inter, -apple-system, sans-serif; min-width: 240px;">
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 12px; color: #171717; line-height: 1.3;">${pin.name}</div>
        ${rows.join("")}
      </div>
    `;

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(pin.coordinates)
      .setPopup(popup)
      .addTo(map);
    markersRef.current.push(marker);
  });
}

function addNRCMarkersToMap(
  mapboxgl: MapboxGLAny,
  map: MapboxGLAny,
  locations: NRCLocation[],
  nrcMarkersRef: React.MutableRefObject<MapboxGLAny[]>,
  onCountryClick: (country: string) => void,
) {
  nrcMarkersRef.current.forEach((m: MapboxGLAny) => m.remove());
  nrcMarkersRef.current = [];

  locations.forEach((location) => {
    const regionColor = regionColors[location.region] ?? "#718096";
    const el = document.createElement("div");
    el.style.cssText = `
      width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: white; border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25); cursor: pointer; background: ${regionColor};
      border-radius: 50%;
    `;
    el.innerHTML = "●";
    el.addEventListener("click", () => onCountryClick(location.country));

    const operationsList =
      location.operationTypes.length > 0
        ? location.operationTypes
            .slice(0, 4)
            .map((t) => t.replace("Legal Assistance (ICLA)", "ICLA"))
            .join(", ")
        : "Operations active";

    const popupHtml = `
      <div style="padding: 12px 16px; font-family: Inter, -apple-system, sans-serif; min-width: 220px;">
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px; color: #171717;">${location.country}</div>
        <div style="font-size: 11px; color: ${regionColor}; font-weight: 600; margin-bottom: 10px;">${location.region}</div>
        ${location.description ? `<p style="font-size: 12px; color: #525252; margin-bottom: 10px; line-height: 1.5;">${location.description}</p>` : ""}
        <div style="font-size: 11px; color: #737373; border-top: 1px solid #E5E5E5; padding-top: 10px;">
          <strong style="color: #525252;">Core Activities:</strong><br/>
          <span style="color: #525252;">${operationsList}</span>
        </div>
      </div>
    `;

    const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(popupHtml);
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([location.longitude, location.latitude])
      .setPopup(popup)
      .addTo(map);
    nrcMarkersRef.current.push(marker);
  });
}

/* ========== Props ========== */

interface MapSectionProps {
  selectedCountry: string;
  selectedRegion: string;
  onCountryChange: (country: string) => void;
  onRegionChange: (region: string | null) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  mapCenter: [number, number];
  mapZoom: number;
  activeMonth: number;
  onMonthChange: (month: number) => void;
  countries: string[];
  regionOptions: string[];
}

/* ========== Component ========== */

export function MapSection({
  selectedCountry,
  selectedRegion,
  onCountryChange,
  onRegionChange,
  activeView,
  onViewChange,
  mapCenter,
  mapZoom,
  activeMonth,
  onMonthChange,
  countries,
  regionOptions,
}: MapSectionProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxGLAny>(null);
  const mbRef = useRef<MapboxGLAny>(null);
  const markersRef = useRef<MapboxGLAny[]>([]);
  const nrcMarkersRef = useRef<MapboxGLAny[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Store latest props in refs to avoid stale closures in effects
  const activeViewRef = useRef(activeView);
  const selectedCountryRef = useRef(selectedCountry);
  const onCountryChangeRef = useRef(onCountryChange);
  activeViewRef.current = activeView;
  selectedCountryRef.current = selectedCountry;
  onCountryChangeRef.current = onCountryChange;

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    let cancelled = false;

    loadMapboxGL().then((mapboxgl) => {
      if (cancelled || !mapContainer.current || map.current) return;
      mbRef.current = mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: mapCenter,
        zoom: mapZoom,
        interactive: true,
      });

      map.current.on("load", () => {
        if (!cancelled) setLoaded(true);
      });

      map.current.on("error", (e: unknown) => {
        console.error("[MapSection] Map error:", e);
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
    });

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when loaded, country, or view changes
  const updateMarkers = useCallback(() => {
    const mapboxgl = mbRef.current;
    if (!map.current || !loaded || !mapboxgl) return;

    if (activeView === "nrc-global") {
      // Clear crisis markers, show NRC markers
      markersRef.current.forEach((m: MapboxGLAny) => m.remove());
      markersRef.current = [];
      addNRCMarkersToMap(
        mapboxgl,
        map.current,
        getOperationalLocations(),
        nrcMarkersRef,
        (country) => onCountryChangeRef.current(country),
      );
      map.current.flyTo({ center: [20, 15], zoom: 2, duration: 1500 });
    } else {
      // Clear NRC markers, show crisis markers for the selected country
      nrcMarkersRef.current.forEach((m: MapboxGLAny) => m.remove());
      nrcMarkersRef.current = [];
      if (CRISIS_COUNTRIES.has(selectedCountry)) {
        addCrisisMarkersToMap(mapboxgl, map.current, getCrisisPins(selectedCountry), markersRef);
      } else {
        markersRef.current.forEach((m: MapboxGLAny) => m.remove());
        markersRef.current = [];
      }
    }
  }, [loaded, selectedCountry, activeView]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // FlyTo when center/zoom change (country change, non-NRC views)
  const prevCenter = useRef(mapCenter);
  const prevZoom = useRef(mapZoom);
  useEffect(() => {
    if (!map.current || !loaded) return;
    if (activeView === "nrc-global") return;
    if (
      prevCenter.current[0] === mapCenter[0] &&
      prevCenter.current[1] === mapCenter[1] &&
      prevZoom.current === mapZoom
    ) return;
    prevCenter.current = mapCenter;
    prevZoom.current = mapZoom;
    map.current.flyTo({ center: mapCenter, zoom: mapZoom, duration: 1500 });
  }, [mapCenter, mapZoom, loaded, activeView]);

  const hasCrisisData = CRISIS_COUNTRIES.has(selectedCountry);

  if (!MAPBOX_TOKEN) {
    return (
      <Box className="relative h-[50vh] sm:min-h-0 sm:h-full flex-1 bg-[#F5F5F5] flex items-center justify-center text-sm text-[#737373]">
        Mapbox token not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env
      </Box>
    );
  }

  return (
    <Box className="relative h-[50vh] sm:min-h-0 sm:h-full flex-1">
      {/* Map header overlay */}
      <Box
        className="absolute top-0 left-0 right-0 z-10 flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 pointer-events-none"
        px={{ base: 12, sm: 24 }}
        py={{ base: 8, sm: 16 }}
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,0))",
        }}
      >
        <Group gap={8} wrap="wrap" style={{ flex: 1 }} className="pointer-events-auto">
          <Select
            size="xs"
            value={selectedCountry}
            onChange={(v) => v && onCountryChange(v)}
            data={countries}
            style={{ minWidth: 120 }}
            styles={{
              input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5", background: "white", color: "#171717", height: 30 },
              dropdown: { background: "white", border: "1px solid #E5E5E5" },
              option: { color: "#171717", fontSize: 13 },
            }}
            label={
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
                Country
              </Text>
            }
          />
          <Select
            size="xs"
            value={selectedRegion}
            onChange={onRegionChange}
            data={regionOptions}
            style={{ minWidth: 120 }}
            styles={{
              input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5", background: "white", color: "#171717", height: 30 },
              dropdown: { background: "white", border: "1px solid #E5E5E5" },
              option: { color: "#171717", fontSize: 13 },
            }}
            label={
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
                Region
              </Text>
            }
          />
          <Box>
            <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10, marginBottom: 5 }}>
              Date
            </Text>
            <Box
              style={{
                height: 30,
                background: "white",
                border: "1px solid #E5E5E5",
                borderRadius: 4,
                padding: "0 12px",
                fontSize: 13,
                fontWeight: 600,
                color: "#171717",
                display: "flex",
                alignItems: "center",
                cursor: "default",
                minWidth: 100,
              }}
            >
              Feb 2026 {/* TODO(demo): hardcoded date — tie to activeMonth state */}
            </Box>
          </Box>
        </Group>

        {/* View toggle */}
        <Group gap={0} className="bg-white border border-[#E5E5E5] overflow-hidden pointer-events-auto" visibleFrom="sm">
          {views.map((view) => (
            <UnstyledButton
              key={view.key}
              onClick={() => onViewChange(view.key)}
              px={10}
              py={8}
              className={cn(
                "text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-all border-r border-[#E5E5E5] last:border-r-0",
                activeView === view.key
                  ? view.key === "nrc-global"
                    ? "bg-[#E85D3D] text-white"
                    : "bg-[#171717] text-white"
                  : "bg-transparent text-[#171717] hover:bg-[#F5F5F5]",
              )}
            >
              {view.label}
            </UnstyledButton>
          ))}
        </Group>
      </Box>

      {/* Map */}
      <div ref={mapContainer} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Legend */}
      <Box
        className="absolute z-10 bg-white border border-[#E5E5E5]"
        style={{ bottom: 100, left: 16, minWidth: 150, padding: 12 }}
        visibleFrom="sm"
      >
        <Text fw={700} tt="uppercase" c="#737373" style={{ letterSpacing: "0.05em", fontSize: 10, marginBottom: 8 }}>
          {activeView === "nrc-global" ? "NRC Regions" : "Legend"}
        </Text>
        {activeView === "nrc-global" ? (
          <Stack gap={6}>
            {(
              [
                ["East Africa and Yemen", "E. Africa & Yemen"],
                ["Central and West Africa", "Central & W. Africa"],
                ["Southern Africa", "Southern Africa"],
                ["Middle East", "Middle East"],
                ["Asia", "Asia"],
                ["Europe", "Europe"],
                ["Americas", "Americas"],
              ] as [keyof typeof regionColors, string][]
            ).map(([key, label]) => (
              <Group key={key} gap={8}>
                <Box w={10} h={10} style={{ backgroundColor: regionColors[key], borderRadius: "50%" }} />
                <Text style={{ fontSize: 10 }}>{label}</Text>
              </Group>
            ))}
          </Stack>
        ) : (
          <Stack gap={6}>
            {[
              { label: "Conflict / Famine", color: "#DC2626" },
              { label: "Cholera / Disease", color: "#F59E0B" },
              { label: "Flood Risk",        color: "#2563EB" },
              { label: "Drought Zone",      color: "#D97706" },
              { label: "Response Teams",    color: "#059669", round: true },
            ].map((item) => (
              <Group key={item.label} gap={8}>
                <Box
                  w={10} h={10}
                  style={{
                    backgroundColor: item.color,
                    borderRadius: item.round ? "50%" : 0,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ fontSize: 10 }}>{item.label}</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Box>

      {/* Timeline */}
      <Box
        className="absolute z-10 bg-white border border-[#E5E5E5]"
        style={{ bottom: 16, left: 16, right: 16, padding: 16 }}
        visibleFrom="sm"
      >
        <Group justify="space-between" mb={12}>
          <Text fw={700} tt="uppercase" c="#737373" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Timeline
          </Text>
          <Group gap={8}>
            <ActionIcon variant="light" color="gray" size="sm">
              <IconPlayerSkipBack size={12} />
            </ActionIcon>
            <ActionIcon variant="filled" size="sm" style={{ background: "#E85D3D" }}>
              <IconPlayerPlay size={12} />
            </ActionIcon>
            <ActionIcon variant="light" color="gray" size="sm">
              <IconPlayerSkipForward size={12} />
            </ActionIcon>
          </Group>
        </Group>
        <Group justify="space-between" className="relative" h={40}>
          <Box className="absolute top-1/2 left-0 right-0 h-1 bg-[#E5E5E5] -translate-y-1/2" />
          {timelineMonths.map((month, i) => (
            <Stack
              key={month.label}
              align="center"
              gap={4}
              className="cursor-pointer z-[1]"
              onClick={() => onMonthChange(i)}
            >
              <Box
                w={i === activeMonth ? 14 : 8}
                h={i === activeMonth ? 14 : 8}
                style={{
                  backgroundColor:
                    i === activeMonth
                      ? "#E85D3D"
                      : month.hasEvent
                        ? "#D97706"
                        : "#E5E5E5",
                  marginTop: i === activeMonth ? 12 : 16,
                }}
              />
              <Text
                fw={i === activeMonth ? 600 : 400}
                c={i === activeMonth ? "#171717" : "#737373"}
                style={{ fontSize: 9 }}
              >
                {month.label}
              </Text>
            </Stack>
          ))}
        </Group>
      </Box>

      {/* Pulse animation for critical markers */}
      <style>{`
        @keyframes marker-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0); }
        }
      `}</style>
    </Box>
  );
}
