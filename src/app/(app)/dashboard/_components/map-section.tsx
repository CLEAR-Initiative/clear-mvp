"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Box, Text, Group, Stack, ActionIcon, UnstyledButton, Select } from "@mantine/core";
import {
  IconPlayerSkipBack,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconAlertCircle,
  IconSword,
  IconGrain,
  IconVirus,
  IconDroplets,
  IconSun,
  IconUsers,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
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

// TODO(demo): months, range, and hasEvent flags are hardcoded - replace with dynamic date range
// derived from the active crisis data or a configurable time window
const timelineMonths = [
  { label: "Sep", hasEvent: false },
  { label: "Oct", hasEvent: true },
  { label: "Nov", hasEvent: true },
  { label: "Dec", hasEvent: false },
  { label: "Jan", hasEvent: false },
  { label: "Feb", hasEvent: false },
];

// labelKey: i18n keys under dashboard.mapSection.views.* - resolved via t() at render time.
const views = [
  { key: "single", labelKey: "single" },
  { key: "compare", labelKey: "compare" },
  { key: "timelapse", labelKey: "time" },
  { key: "nrc-global", labelKey: "nrc" },
] as const;

/* ========== Marker helpers ========== */

// Color encodes SEVERITY (how urgent), icon encodes TYPE (what it is).
// Together they give both dimensions at a glance.
const severityColors: Record<string, string> = {
  critical: "#DC2626",
  high:     "#F59E0B",
  medium:   "#D97706",
  response: "#059669",
};

// SVG icon strings for Mapbox DOM markers (set as innerHTML).
// Each is a 16×16 white icon on a transparent background, viewBox 0 0 24 24.
const typeIcons: Record<string, string> = {
  // Crisis: alert circle with exclamation (Tabler IconAlertCircle)
  crisis: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  // Conflict: crossed swords - simplified as an X with pointed ends
  conflict: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/><line x1="5" y1="4" x2="6" y2="7"/><line x1="18" y1="4" x2="19" y2="7"/></svg>`,
  // Famine: grain stalks
  famine: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-9"/><path d="M9 8a3 3 0 0 0 3 3"/><path d="M15 8a3 3 0 0 1-3 3"/><path d="M9 4a3 3 0 0 0 3 3"/><path d="M15 4a3 3 0 0 1-3 3"/><path d="M6 20a3 3 0 0 0 3-3"/><path d="M18 20a3 3 0 0 1-3-3"/></svg>`,
  // Cholera: medical cross (plus sign in circle)
  cholera: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  // Flood: water drops / waves
  flood: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 C5 9, 7 9, 9 12 C11 15, 13 15, 15 12 C17 9, 19 9, 21 12"/><path d="M3 17 C5 14, 7 14, 9 17 C11 20, 13 20, 15 17 C17 14, 19 14, 21 17"/><path d="M12 3 L12 7"/><path d="M9 6 L12 3 L15 6"/></svg>`,
  // Drought: sun with rays
  drought: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/><line x1="6.3" y1="6.3" x2="7.8" y2="7.8"/><line x1="16.2" y1="16.2" x2="17.7" y2="17.7"/><line x1="6.3" y1="17.7" x2="7.8" y2="16.2"/><line x1="16.2" y1="7.8" x2="17.7" y2="6.3"/></svg>`,
  // Team: person silhouettes (simplified)
  team: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="7" r="2"/><path d="M21 21v-1a3 3 0 0 0-2-2.83"/></svg>`,
};

function addCrisisMarkersToMap(
  mapboxgl: MapboxGLAny,
  map: MapboxGLAny,
  pins: CrisisPin[],
  markersRef: React.MutableRefObject<MapboxGLAny[]>,
  labels: Record<string, string>,
) {
  markersRef.current.forEach((m: MapboxGLAny) => m.remove());
  markersRef.current = [];

  pins.forEach((pin) => {
    const color = severityColors[pin.severity] ?? "#DC2626";
    const icon = typeIcons[pin.type] ?? "!";
    const el = document.createElement("div");
    el.style.cssText = `
      width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      border: 2.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.35); cursor: pointer; background: ${color};
      ${pin.severity === "critical" ? "animation: marker-pulse 1.5s infinite;" : ""}
    `;
    el.innerHTML = icon;

    const isCritical = pin.severity === "critical";
    const rows: string[] = [];
    if (pin.cases) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E5E5E5;"><span style="font-size:13px;color:#525252;">${labels.cases}</span><span style="font-size:13px;font-weight:700;color:#DC2626;">${pin.cases}</span></div>`);
    }
    if (pin.affectedPopulation) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E5E5E5;"><span style="font-size:13px;color:#525252;">${labels.affected}</span><span style="font-size:13px;font-weight:700;color:#DC2626;">${(pin.affectedPopulation / 1000).toFixed(0)}k</span></div>`);
    }
    if (pin.members) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E5E5E5;"><span style="font-size:13px;color:#525252;">${labels.members}</span><span style="font-size:13px;font-weight:700;">${pin.members}</span></div>`);
    }
    if (pin.trend ?? pin.status) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #E5E5E5;"><span style="font-size:13px;color:#525252;">${pin.cases ? labels.trend : labels.status}</span><span style="font-size:13px;font-weight:700;${isCritical ? "color:#DC2626;" : ""}">${pin.trend ?? pin.status ?? ""}</span></div>`);
    }
    if (pin.region) {
      rows.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;"><span style="font-size:13px;color:#525252;">${labels.region}</span><span style="font-size:13px;font-weight:700;">${pin.region}</span></div>`);
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
  labels: Record<string, string>,
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
        : labels.operationsActive;

    const popupHtml = `
      <div style="padding: 12px 16px; font-family: Inter, -apple-system, sans-serif; min-width: 220px;">
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px; color: #171717;">${location.country}</div>
        <div style="font-size: 11px; color: ${regionColor}; font-weight: 600; margin-bottom: 10px;">${location.region}</div>
        ${location.description ? `<p style="font-size: 12px; color: #525252; margin-bottom: 10px; line-height: 1.5;">${location.description}</p>` : ""}
        <div style="font-size: 11px; color: #737373; border-top: 1px solid #E5E5E5; padding-top: 10px;">
          <strong style="color: #525252;">${labels.coreActivities}</strong><br/>
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
  const t = useTranslations("dashboard");
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxGLAny>(null);
  const mbRef = useRef<MapboxGLAny>(null);
  const markersRef = useRef<MapboxGLAny[]>([]);
  const nrcMarkersRef = useRef<MapboxGLAny[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const allTypes = ["crisis", "conflict", "famine", "cholera", "flood", "drought", "team"] as const;
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(allTypes));

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

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
        {
          operationsActive: t("mapSection.popup.operationsActive"),
          coreActivities: t("mapSection.popup.coreActivities"),
        },
      );
      map.current.flyTo({ center: [20, 15], zoom: 2, duration: 1500 });
    } else {
      // Clear NRC markers, show crisis markers for the selected country
      nrcMarkersRef.current.forEach((m: MapboxGLAny) => m.remove());
      nrcMarkersRef.current = [];
      if (CRISIS_COUNTRIES.has(selectedCountry)) {
        const pins = getCrisisPins(selectedCountry).filter((p) => activeTypes.has(p.type));
        addCrisisMarkersToMap(mapboxgl, map.current, pins, markersRef, {
          cases: t("mapSection.popup.cases"),
          affected: t("mapSection.popup.affected"),
          members: t("mapSection.popup.members"),
          trend: t("mapSection.popup.trend"),
          status: t("mapSection.popup.status"),
          region: t("mapSection.popup.region"),
        });
      } else {
        markersRef.current.forEach((m: MapboxGLAny) => m.remove());
        markersRef.current = [];
      }
    }
  }, [loaded, selectedCountry, activeView, activeTypes, t]);

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
      <Box className="relative h-[50vh] sm:min-h-0 sm:h-full flex-1 bg-[var(--color-bg-muted)] flex items-center justify-center text-sm text-[#737373]">
        {t("mapSection.tokenMissing")}
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
          background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-bg-white) 98%, transparent), transparent)",
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
              input: { fontWeight: 600, fontSize: 13, border: "1px solid var(--color-border)", background: "var(--color-bg-white)", color: "#171717", height: 30 },
              dropdown: { background: "var(--color-bg-white)", border: "1px solid var(--color-border)" },
              option: { color: "#171717", fontSize: 13 },
            }}
            label={
              <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
                {t("mapSection.country")}
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
              input: { fontWeight: 600, fontSize: 13, border: "1px solid var(--color-border)", background: "var(--color-bg-white)", color: "#171717", height: 30 },
              dropdown: { background: "var(--color-bg-white)", border: "1px solid var(--color-border)" },
              option: { color: "#171717", fontSize: 13 },
            }}
            label={
              <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
                {t("mapSection.region")}
              </Text>
            }
          />
          <Box>
            <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10, marginBottom: 5 }}>
              {t("mapSection.date")}
            </Text>
            <Box
              style={{
                height: 30,
                background: "var(--color-bg-white)",
                border: "1px solid var(--color-border)",
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
              Feb 2026 {/* TODO(demo): hardcoded date - tie to activeMonth state */}
            </Box>
          </Box>
        </Group>

        {/* View toggle */}
        <Group gap={0} className="bg-[var(--color-bg-white)] border border-[var(--color-border)] overflow-hidden pointer-events-auto" visibleFrom="sm">
          {views.map((view) => (
            <UnstyledButton
              key={view.key}
              onClick={() => onViewChange(view.key)}
              px={10}
              py={8}
              className={cn(
                "text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-all border-r border-[var(--color-border)] last:border-r-0",
                activeView === view.key
                  ? view.key === "nrc-global"
                    ? "bg-[#E85D3D] text-white"
                    : "bg-[#171717] text-white"
                  : "bg-transparent text-[#171717] hover:bg-[var(--color-bg-muted)]",
              )}
            >
              {t(`mapSection.views.${view.labelKey}`)}
            </UnstyledButton>
          ))}
        </Group>
      </Box>

      {/* Map */}
      <div ref={mapContainer} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Legend - anchored just above the timeline, grows upward when open */}
      <Box
        className="absolute z-10 bg-[var(--color-bg-white)] border border-[var(--color-border)]"
        style={{ bottom: 104, left: 16, minWidth: 168 }}
        visibleFrom="sm"
      >
        {/* Header - always visible, click to collapse/expand */}
        <UnstyledButton
          onClick={() => setLegendOpen((o) => !o)}
          style={{
            width: "100%",
            padding: "7px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: legendOpen ? "1px solid var(--color-border)" : "none",
          }}
        >
          <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ letterSpacing: "0.05em", fontSize: 10 }}>
            {activeView === "nrc-global" ? t("mapSection.nrcRegions") : t("mapSection.legend")}
          </Text>
          {legendOpen ? <IconChevronDown size={12} color="#737373" /> : <IconChevronUp size={12} color="#737373" />}
        </UnstyledButton>

        {legendOpen && (
          <Box style={{ padding: "10px 10px 10px" }}>
            {activeView === "nrc-global" ? (
              <Stack gap={6}>
                {(
                  // Second element: i18n key under dashboard.mapSection.regionShort.* - resolved via t() at render time.
                  [
                    ["East Africa and Yemen", "eastAfricaYemen"],
                    ["Central and West Africa", "centralWestAfrica"],
                    ["Southern Africa", "southernAfrica"],
                    ["Middle East", "middleEast"],
                    ["Asia", "asia"],
                    ["Europe", "europe"],
                    ["Americas", "americas"],
                  ] as [
                    keyof typeof regionColors,
                    "eastAfricaYemen" | "centralWestAfrica" | "southernAfrica" | "middleEast" | "asia" | "europe" | "americas",
                  ][]
                ).map(([key, labelKey]) => (
                  <Group key={key} gap={8}>
                    <Box w={10} h={10} style={{ backgroundColor: regionColors[key], borderRadius: "50%", flexShrink: 0 }} />
                    <Text style={{ fontSize: 10 }}>{t(`mapSection.regionShort.${labelKey}`)}</Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Stack gap={3}>
                <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.05em", marginBottom: 2 }}>{t("mapSection.severity")}</Text>
                {(
                  // labelKey: i18n keys under dashboard.mapSection.severities.* - resolved via t() at render time.
                  [
                    { labelKey: "critical", color: "#DC2626" },
                    { labelKey: "high",     color: "#F59E0B" },
                    { labelKey: "medium",   color: "#D97706" },
                    { labelKey: "teams",    color: "#059669" },
                  ] as const
                ).map((item) => (
                  <Group key={item.labelKey} gap={6}>
                    <Box w={10} h={10} style={{ backgroundColor: item.color, flexShrink: 0 }} />
                    <Text style={{ fontSize: 10 }}>{t(`mapSection.severities.${item.labelKey}`)}</Text>
                  </Group>
                ))}

                <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.05em", marginTop: 6, marginBottom: 2 }}>{t("mapSection.eventType")}</Text>
                {(
                  // labelKey: i18n keys under dashboard.mapSection.eventTypes.* - resolved via t() at render time.
                  [
                    { IconComponent: IconAlertCircle, labelKey: "crisis",   type: "crisis"   },
                    { IconComponent: IconSword,        labelKey: "conflict", type: "conflict" },
                    { IconComponent: IconGrain,        labelKey: "famine",   type: "famine"   },
                    { IconComponent: IconVirus,        labelKey: "disease",  type: "cholera"  },
                    { IconComponent: IconDroplets,     labelKey: "flood",    type: "flood"    },
                    { IconComponent: IconSun,          labelKey: "drought",  type: "drought"  },
                    { IconComponent: IconUsers,        labelKey: "response", type: "team"     },
                  ] as {
                    IconComponent: React.ComponentType<{ size: number; color: string }>;
                    labelKey: "crisis" | "conflict" | "famine" | "disease" | "flood" | "drought" | "response";
                    type: string;
                  }[]
                ).map(({ IconComponent, labelKey, type }) => {
                  const active = activeTypes.has(type);
                  return (
                    <UnstyledButton
                      key={type}
                      onClick={() => toggleType(type)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: active ? 1 : 0.35,
                        cursor: "pointer",
                        padding: "1px 0",
                      }}
                    >
                      <IconComponent size={12} color={active ? "#525252" : "#A0A0A0"} />
                      <Text style={{ fontSize: 10, textDecoration: active ? "none" : "line-through", color: active ? "#171717" : "#A0A0A0" }}>
                        {t(`mapSection.eventTypes.${labelKey}`)}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* Timeline */}
      <Box
        className="absolute z-10 bg-[var(--color-bg-white)] border border-[var(--color-border)]"
        style={{ bottom: 16, left: 16, right: 16, padding: 16 }}
        visibleFrom="sm"
      >
        <Group justify="space-between" mb={12}>
          <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            {t("mapSection.timeline")}
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
          <Box className="absolute top-1/2 left-0 right-0 h-1 bg-[var(--color-border)] -translate-y-1/2" />
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
