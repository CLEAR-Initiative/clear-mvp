"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapMarker } from "~/components/map/crisis-map";
import {
  Box,
  Text,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Collapse,
  UnstyledButton,
  ActionIcon,
  Select,
  Loader,
} from "@mantine/core";
import {
  IconFileText,
  IconBolt,
  IconPlayerSkipBack,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconDatabase,
  IconRefresh,
  IconChevronDown,
  IconMapPin,
  IconWorld,
  IconSparkles,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { mapSeverity, severityColor } from "~/lib/types/django";
import type { DjangoAlert } from "~/lib/types/django";
import { buildSituationAnalysisPrompt, SITUATION_ANALYSIS_SYSTEM_PROMPT } from "~/lib/prompts";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

/* ========== Country Configuration ========== */
interface CountryConfig {
  center: [number, number];
  zoom: number;
  regions: string[];
  hasCrisisData: boolean;
}

const countryConfig: Record<string, CountryConfig> = {
  Sudan: {
    center: [30.0, 15.5],
    zoom: 5,
    regions: ["All Regions", "Khartoum", "North Darfur", "South Darfur", "West Darfur", "Central Darfur", "Blue Nile", "Red Sea", "Kassala"],
    hasCrisisData: true,
  },
  Ethiopia: {
    center: [40.5, 8.5],
    zoom: 5.5,
    regions: ["All Regions", "Somali", "Oromia", "Afar", "Amhara", "Tigray", "SNNPR"],
    hasCrisisData: true,
  },
  "South Sudan": {
    center: [31.0, 7.0],
    zoom: 5.5,
    regions: ["All Regions", "Central Equatoria", "Jonglei", "Unity", "Upper Nile", "Lakes"],
    hasCrisisData: false,
  },
  Somalia: {
    center: [46.0, 5.0],
    zoom: 5,
    regions: ["All Regions", "Banadir", "Bay", "Gedo", "Lower Juba", "Middle Shabelle"],
    hasCrisisData: false,
  },
  Yemen: {
    center: [48.0, 15.5],
    zoom: 5.5,
    regions: ["All Regions", "Sana'a", "Aden", "Taiz", "Hodeidah", "Marib"],
    hasCrisisData: false,
  },
  Afghanistan: {
    center: [67.7, 33.9],
    zoom: 5.5,
    regions: ["All Regions", "Kabul", "Herat", "Kandahar", "Mazar-i-Sharif"],
    hasCrisisData: false,
  },
  Ukraine: {
    center: [31.2, 48.4],
    zoom: 5,
    regions: ["All Regions", "Kyiv", "Kharkiv", "Odesa", "Lviv"],
    hasCrisisData: false,
  },
  Iraq: {
    center: [44.4, 33.3],
    zoom: 5.5,
    regions: ["All Regions", "Baghdad", "Erbil", "Mosul", "Basra"],
    hasCrisisData: false,
  },
  Syria: {
    center: [38.9, 34.8],
    zoom: 6,
    regions: ["All Regions", "Damascus", "Aleppo", "Idlib", "Homs"],
    hasCrisisData: false,
  },
  Colombia: {
    center: [-74.3, 4.6],
    zoom: 5,
    regions: ["All Regions", "Bogota", "Medellin", "Cali"],
    hasCrisisData: false,
  },
};

const countries = Object.keys(countryConfig).sort();

/* ========== NRC Global Data ========== */
interface NRCRegionData {
  color: string;
  countries: { name: string; activities: string[]; description?: string }[];
}

const nrcRegions: Record<string, NRCRegionData> = {
  "East Africa & Yemen": {
    color: "#E85D3D",
    countries: [
      { name: "Ethiopia", activities: ["Education", "WASH", "Shelter", "ICLA", "Food Security"], description: "Multi-sector emergency response" },
      { name: "Kenya", activities: ["Education", "WASH", "Shelter"], description: "Refugee and host community support" },
      { name: "Somalia", activities: ["Education", "WASH", "Shelter", "ICLA"], description: "Complex emergency response" },
      { name: "South Sudan", activities: ["Education", "WASH", "Shelter", "Camp Management"], description: "Conflict and displacement response" },
      { name: "Uganda", activities: ["Education", "WASH", "ICLA"], description: "Refugee response and integration" },
      { name: "Yemen", activities: ["Education", "WASH", "Shelter", "ICLA", "Food Security"], description: "Largest humanitarian crisis" },
    ],
  },
  "Central & West Africa": {
    color: "#2563EB",
    countries: [
      { name: "Cameroon", activities: ["Education", "Shelter", "ICLA"] },
      { name: "DRC", activities: ["Education", "WASH", "Shelter", "ICLA", "Camp Management"] },
      { name: "Mali", activities: ["Education", "WASH", "Shelter"] },
      { name: "Niger", activities: ["Education", "Shelter", "ICLA"] },
      { name: "Nigeria", activities: ["Education", "WASH", "Shelter", "ICLA", "Food Security"] },
      { name: "Burkina Faso", activities: ["Education", "Shelter"] },
      { name: "CAR", activities: ["Education", "WASH", "Shelter", "ICLA"] },
    ],
  },
  "Middle East": {
    color: "#059669",
    countries: [
      { name: "Iraq", activities: ["Education", "Shelter", "ICLA", "Camp Management"] },
      { name: "Jordan", activities: ["Education", "ICLA"] },
      { name: "Lebanon", activities: ["Education", "Shelter", "ICLA"] },
      { name: "Syria", activities: ["Education", "WASH", "Shelter", "ICLA"] },
      { name: "Palestine", activities: ["Education", "Shelter", "ICLA"] },
    ],
  },
  Asia: {
    color: "#7C3AED",
    countries: [
      { name: "Afghanistan", activities: ["Education", "WASH", "Shelter", "ICLA"] },
      { name: "Myanmar", activities: ["Education", "Shelter", "ICLA"] },
      { name: "Pakistan", activities: ["Education", "WASH", "Shelter"] },
    ],
  },
  Europe: {
    color: "#0891B2",
    countries: [
      { name: "Ukraine", activities: ["Education", "Shelter", "ICLA", "WASH", "Food Security"] },
    ],
  },
  Americas: {
    color: "#D97706",
    countries: [
      { name: "Colombia", activities: ["Education", "ICLA", "Shelter"] },
      { name: "Venezuela", activities: ["Education", "ICLA"] },
    ],
  },
};

const nrcTotalCountries = Object.values(nrcRegions).reduce((sum, r) => sum + r.countries.length, 0);

/* ========== Helpers to derive markers & crises from API alerts ========== */

interface CrisisItem {
  id: number;
  name: string;
  meta: string;
  severity: "critical" | "high" | "medium";
}

function alertsToMarkers(alerts: DjangoAlert[]): MapMarker[] {
  const markers: MapMarker[] = [];
  for (const alert of alerts) {
    for (const loc of alert.locations) {
      if (loc.latitude != null && loc.longitude != null) {
        markers.push({
          id: alert.id * 100 + loc.id,
          lng: loc.longitude,
          lat: loc.latitude,
          title: alert.title,
          severity: mapSeverity(alert.severity),
          type: alert.shock_type?.name,
          description: `${loc.name} • ${alert.shock_type?.name ?? ""}`,
        });
      }
    }
  }
  return markers;
}

function alertsToCrises(alerts: DjangoAlert[]): CrisisItem[] {
  return alerts.map((a) => {
    const sev = mapSeverity(a.severity);
    return {
      id: a.id,
      name: a.title,
      meta: `${a.locations?.[0]?.name ?? "Unknown"} • ${a.shock_type?.name ?? ""}`,
      severity: sev === "low" ? "medium" : sev,
    };
  });
}

/* Static fallback markers for countries without location coordinates in DB */
const fallbackMarkers: Record<string, MapMarker[]> = {
  Sudan: [
    { id: 101, lng: 32.53, lat: 15.5, title: "Active Conflict - Khartoum", severity: "critical", type: "Conflict", description: "2.5M affected • Khartoum" },
    { id: 102, lng: 25.35, lat: 13.63, title: "Armed Clashes - El Fasher", severity: "critical", type: "Conflict", description: "450k affected • North Darfur" },
    { id: 103, lng: 23.47, lat: 12.91, title: "IDP Camp - Zalingei", severity: "critical", type: "Displacement", description: "180k displaced • Central Darfur" },
    { id: 104, lng: 22.45, lat: 13.45, title: "Famine Risk - West Darfur", severity: "critical", type: "Food Security", description: "IPC Phase 5 • 890k affected" },
    { id: 105, lng: 37.22, lat: 19.62, title: "Cholera - Port Sudan", severity: "critical", type: "Health", description: "1,847 cases • Red Sea" },
    { id: 106, lng: 32.5, lat: 13.16, title: "Flood Risk - White Nile", severity: "medium", type: "Natural Disaster", description: "Seasonal • White Nile" },
  ],
  Ethiopia: [
    { id: 1, lng: 42.79, lat: 9.35, title: "Cholera Outbreak", severity: "critical", type: "Health", description: "247 cases • Somali Region" },
    { id: 3, lng: 39.76, lat: 7.0, title: "Flood Risk", severity: "high", type: "Natural Disaster", description: "36h warning • Oromia" },
    { id: 4, lng: 40.0, lat: 11.5, title: "Drought Zone", severity: "medium", type: "Natural Disaster", description: "Monitoring • Afar" },
  ],
};

/* ========== Activity Items ========== */
const recentActivity = [
  { time: "15 min ago", title: "Alert acknowledged", description: "Cholera outbreak alert reviewed by Dr. Melese A.", type: "alert" as const },
  { time: "42 min ago", title: "Team check-in", description: "WASH Team Alpha reported safe arrival in Jijiga", type: "team" as const },
  { time: "1h ago", title: "Resource request", description: "Emergency IV fluid request submitted for Somali Region", type: "resource" as const },
  { time: "2h ago", title: "Analysis generated", description: "AI situation analysis updated for cholera outbreak", type: "analysis" as const },
  { time: "3h ago", title: "Distribution complete", description: "Cash assistance distributed to 1,247 households", type: "cash" as const },
];

/* ========== Timeline Data ========== */
const timelineMonths = [
  { label: "Sep", hasEvent: false },
  { label: "Oct", hasEvent: true },
  { label: "Nov", hasEvent: true },
  { label: "Dec", hasEvent: false },
  { label: "Jan", hasEvent: false },
  { label: "Feb", hasEvent: false },
];

const severityDotColors: Record<string, string> = {
  critical: "bg-[#DC2626]",
  high: "bg-[#D97706]",
  medium: "bg-[#D97706]",
};

const severityBadgeColors: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#FEE2E2", text: "#DC2626" },
  high: { bg: "#FEF3C7", text: "#D97706" },
  medium: { bg: "#FEF3C7", text: "#D97706" },
};

const activityIcons: Record<string, { bg: string; icon: string }> = {
  alert: { bg: "#FEE2E2", icon: "!" },
  team: { bg: "#D1FAE5", icon: "T" },
  resource: { bg: "#FEF3C7", icon: "R" },
  analysis: { bg: "#F3E8FF", icon: "A" },
  cash: { bg: "#DBEAFE", icon: "$" },
};

/* ========== Helper Components ========== */

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Box className="border-b border-[#E5E5E5]">
      <UnstyledButton
        onClick={() => setOpen(!open)}
        w="100%"
        px={24}
        py={16}
        className="flex justify-between items-center cursor-pointer hover:bg-[#F5F5F5] transition-colors"
      >
        <Text fw={700} tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 11 }}>
          {title}
        </Text>
        <Box
          w={24}
          h={24}
          className={cn(
            "border flex items-center justify-center",
            open
              ? "bg-[#171717] text-white border-[#171717]"
              : "border-[#E5E5E5] text-[#737373]",
          )}
          style={{ fontSize: 14 }}
        >
          {open ? "\u2212" : "+"}
        </Box>
      </UnstyledButton>
      <Collapse in={open}>
        {children && <Box px={24} pb={24}>{children}</Box>}
      </Collapse>
    </Box>
  );
}

/* ========== Main Page ========== */
export default function DashboardPage() {
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [activeView, setActiveView] = useState("single");
  const [activeMonth, setActiveMonth] = useState(2);
  const [expandedNRCRegion, setExpandedNRCRegion] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // tRPC queries
  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true });
  const statsQuery = api.alerts.getStats.useQuery();
  const pipelineStatsQuery = api.pipeline.getStatistics.useQuery();
  const llmMutation = api.llm.query.useMutation();

  const allAlerts = alertsQuery.data?.alerts ?? [];
  const overview = statsQuery.data?.stats?.overview;

  const config = countryConfig[selectedCountry];
  const hasCrisisData = config?.hasCrisisData ?? false;

  // Filter alerts by selected country — match location names against known regions
  const countryAlerts = useMemo(() => {
    if (allAlerts.length === 0) return [];
    const regions = config?.regions?.map((r) => r.toLowerCase()) ?? [];
    const countryLower = selectedCountry.toLowerCase();
    const regionLower = selectedRegion !== "All Regions" ? selectedRegion.toLowerCase() : null;

    return allAlerts.filter((alert) => {
      // Check if any alert location matches a known region for this country
      const matchesCountry = alert.locations.some((loc) => {
        const locName = loc.name.toLowerCase();
        return regions.some((r) => r !== "all regions" && locName.includes(r)) || locName.includes(countryLower);
      }) || alert.title.toLowerCase().includes(countryLower)
        || (alert.text?.toLowerCase().includes(countryLower) ?? false);

      if (!matchesCountry) return false;

      // If a specific region is selected, further filter
      if (regionLower) {
        return alert.locations.some((loc) => loc.name.toLowerCase().includes(regionLower))
          || alert.title.toLowerCase().includes(regionLower)
          || (alert.text?.toLowerCase().includes(regionLower) ?? false);
      }
      return true;
    });
  }, [allAlerts, selectedCountry, selectedRegion, config?.regions]);

  // Derive markers and crises from country-filtered API data, fall back to static
  const apiMarkers = useMemo(() => alertsToMarkers(countryAlerts), [countryAlerts]);
  const apiCrises = useMemo(() => alertsToCrises(countryAlerts), [countryAlerts]);
  const currentMarkers = useMemo(() => apiMarkers.length > 0 ? apiMarkers : (fallbackMarkers[selectedCountry] ?? []), [apiMarkers, selectedCountry]);
  const currentCrises = useMemo(() => apiCrises.length > 0 ? apiCrises : [], [apiCrises]);

  // Generate AI analysis when country changes
  useEffect(() => {
    setAiAnalysis(null);
    if (!hasCrisisData || countryAlerts.length === 0) return;
    const alertSummaries = countryAlerts.slice(0, 10).map((a) => ({
      title: a.title,
      severity: a.severity,
      shock_type: a.shock_type?.name ?? "",
      location: a.locations?.[0]?.name ?? "",
      text: a.text?.slice(0, 200) ?? "",
    }));
    llmMutation.mutate(
      {
        prompt: buildSituationAnalysisPrompt(selectedCountry, alertSummaries),
        system: SITUATION_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 500,
      },
      {
        onSuccess: (data) => setAiAnalysis(data.response),
        onError: () => setAiAnalysis(null),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, countryAlerts.length]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (activeView === "nrc-global") return [20, 15];
    return config?.center ?? [40.5, 8.5];
  }, [activeView, config?.center]);

  const mapZoom = useMemo(() => {
    if (activeView === "nrc-global") return 2;
    return config?.zoom ?? 5.5;
  }, [activeView, config?.zoom]);

  const handleCountryChange = (country: string | null) => {
    if (!country) return;
    setSelectedCountry(country);
    setSelectedRegion("All Regions");
    if (activeView === "nrc-global") setActiveView("single");
  };

  const regionOptions = config?.regions ?? ["All Regions"];

  const views = [
    { key: "single", label: "\u25FB Single" },
    { key: "compare", label: "\u25EB Compare" },
    { key: "timelapse", label: "\u25B6 Time" },
    { key: "nrc-global", label: "\uD83C\uDF0D NRC" },
  ];

  // Find NRC region info for non-crisis countries
  const nrcCountryInfo = useMemo(() => {
    for (const [regionName, regionData] of Object.entries(nrcRegions)) {
      const found = regionData.countries.find((c) => c.name === selectedCountry);
      if (found) return { regionName, regionColor: regionData.color, ...found };
    }
    return null;
  }, [selectedCountry]);

  return (
    <Box className="flex-1 grid grid-cols-[1fr_380px]" style={{ height: "100vh" }}>
      {/* Map Section */}
      <Box className="relative h-full">
        {/* Map header overlay */}
        <Box
          className="absolute top-0 left-0 right-0 z-10 flex justify-between items-start"
          px={24}
          py={16}
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,0))",
          }}
        >
          <Group gap={12}>
            <Select
              size="xs"
              value={selectedCountry}
              onChange={handleCountryChange}
              data={countries}
              style={{ minWidth: 140 }}
              styles={{
                input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5" },
              }}
              label={<Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Country</Text>}
            />
            <Select
              size="xs"
              value={selectedRegion}
              onChange={(v) => setSelectedRegion(v ?? "All Regions")}
              data={regionOptions}
              style={{ minWidth: 140 }}
              styles={{
                input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5" },
              }}
              label={<Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Region</Text>}
            />
            <Box>
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Date</Text>
              <Box
                className="bg-white border border-[#E5E5E5] cursor-pointer"
                px={12}
                py={6}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                Feb 2026
              </Box>
            </Box>
          </Group>
          <Group gap={0} className="bg-white border border-[#E5E5E5] overflow-hidden">
            {views.map((view) => (
              <UnstyledButton
                key={view.key}
                onClick={() => setActiveView(view.key)}
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

        {/* Mapbox map */}
        <CrisisMap
          markers={activeView === "nrc-global" ? [] : currentMarkers}
          center={mapCenter}
          zoom={mapZoom}
          className="w-full h-full"
        />

        {/* Map Legend */}
        <Box
          className="absolute bottom-[100px] left-4 bg-white border border-[#E5E5E5] z-10"
          p={16}
          style={{ minWidth: 150 }}
        >
          <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }} mb={12}>
            {activeView === "nrc-global" ? "NRC Regions" : "Legend"}
          </Text>
          {activeView === "nrc-global" ? (
            <Stack gap={6}>
              {Object.entries(nrcRegions).map(([name, data]) => (
                <Group key={name} gap={8}>
                  <Box w={10} h={10} style={{ backgroundColor: data.color, borderRadius: "50%" }} />
                  <Text size="xs" style={{ fontSize: 11 }}>{name}</Text>
                </Group>
              ))}
            </Stack>
          ) : (
            <Stack gap={6}>
              {[
                { label: "Critical", color: "#DC2626" },
                { label: "High", color: "#D97706" },
                { label: "Medium", color: "#FBBF24" },
                { label: "Teams", color: "#059669" },
              ].map((item) => (
                <Group key={item.label} gap={8}>
                  <Box w={10} h={10} style={{ backgroundColor: item.color }} />
                  <Text size="xs" style={{ fontSize: 11 }}>{item.label}</Text>
                </Group>
              ))}
            </Stack>
          )}
        </Box>

        {/* Time Slider */}
        <Box className="absolute bottom-4 left-4 right-4 bg-white border border-[#E5E5E5] z-10" p={16}>
          <Group justify="space-between" mb={12}>
            <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
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
                onClick={() => setActiveMonth(i)}
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
                  size="xs"
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
      </Box>

      {/* Right Panel */}
      <Box component="aside" className="bg-white border-l border-[#E5E5E5] overflow-y-auto flex flex-col">
        {/* Panel header */}
        <Box px={24} py={24} className="border-b border-[#E5E5E5] bg-[#F9FAFB]">
          <Group justify="space-between" align="flex-start" mb={4}>
            <Group gap={8}>
              <Text fw={700} style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
                {selectedCountry}
              </Text>
              {alertsQuery.isLoading && <Loader size={16} />}
            </Group>
            {hasCrisisData ? (
              <Badge
                size="sm"
                tt="uppercase"
                style={{ fontSize: 10, fontWeight: 700, background: "#DC2626", color: "white" }}
              >
                {countryAlerts.length > 0 ? countryAlerts.length : (overview?.active_alerts ?? currentCrises.length)} Active
              </Badge>
            ) : nrcCountryInfo ? (
              <Badge
                size="sm"
                tt="uppercase"
                style={{ fontSize: 10, fontWeight: 700, background: nrcCountryInfo.regionColor, color: "white" }}
              >
                NRC Ops
              </Badge>
            ) : null}
          </Group>
          <Text size="sm" c="#E85D3D" style={{ fontSize: 13 }}>
            {hasCrisisData ? "Humanitarian" : nrcCountryInfo ? nrcCountryInfo.regionName : "Overview"}{" "}
            <Text component="span" c="#737373">
              | Feb 2026
            </Text>
          </Text>
        </Box>

        {/* Quick stats — matching wireframe: Active Crises, Teams Deployed, At Risk */}
        <SimpleGrid cols={3} spacing={8} px={24} py={16} className="bg-[#F9FAFB] border-b border-[#E5E5E5]">
          {hasCrisisData ? (
            <>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#DC2626" lh={1}>{countryAlerts.length > 0 ? countryAlerts.length : (overview?.active_alerts ?? currentCrises.length)}</Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Active Crises</Text>
                <Text size="xs" c="#DC2626" style={{ fontSize: 10 }}>&uarr; +{overview?.recent_7_days ?? 1}</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#DC2626" lh={1}>
                  {selectedCountry === "Sudan" ? "2" : "2"}
                </Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Teams Deployed</Text>
                <Text size="xs" c="#DC2626" style={{ fontSize: 10 }}>&uarr; {selectedCountry === "Sudan" ? "+3" : "+2"}</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#DC2626" lh={1}>
                  {selectedCountry === "Sudan" ? "4.5M" : "45K"}
                </Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>At Risk</Text>
                <Text size="xs" c="#DC2626" style={{ fontSize: 10 }}>&uarr; {selectedCountry === "Sudan" ? "+28%" : "+12%"}</Text>
              </Stack>
            </>
          ) : nrcCountryInfo ? (
            <>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#E85D3D" lh={1}>{nrcCountryInfo.activities.length}</Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Core Activities</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#171717" lh={1}>Active</Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Status</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#171717" lh={1}>{nrcCountryInfo.regionName.split(" ")[0]}</Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Region</Text>
              </Stack>
            </>
          ) : (
            <>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#A3A3A3" lh={1}>&mdash;</Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10 }}>Active Crises</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#A3A3A3" lh={1}>&mdash;</Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10 }}>Teams</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="#A3A3A3" lh={1}>&mdash;</Text>
                <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10 }}>At Risk</Text>
              </Stack>
            </>
          )}
        </SimpleGrid>

        {/* EWAS Pipeline Status (Sudan only) */}
        {selectedCountry === "Sudan" && (() => {
          const ps = pipelineStatsQuery.data?.statistics;
          return (
            <Box px={24} py={16} className="border-b border-[#E5E5E5]" style={{ background: "linear-gradient(to right, #FEF2F0, white)" }}>
              <Group justify="space-between" mb={8}>
                <Group gap={8}>
                  <IconDatabase size={16} color="#E85D3D" />
                  <Text fw={700} tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 11, color: "#525252" }}>EWAS Sudan Pipeline</Text>
                </Group>
                <Group gap={6}>
                  <Box w={8} h={8} style={{ background: "#059669" }} className="animate-pulse" />
                  <Text fw={600} style={{ fontSize: 10, color: "#059669" }}>CONNECTED</Text>
                </Group>
              </Group>
              <SimpleGrid cols={3} spacing={8} mb={8}>
                <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
                  <Text fw={700} c="#E85D3D" style={{ fontSize: 14 }}>{ps?.sources.total ?? "—"}</Text>
                  <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Sources</Text>
                </Box>
                <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
                  <Text fw={700} c="#E85D3D" style={{ fontSize: 14 }}>{ps ? `${(ps.data.total_records / 1000).toFixed(1)}k` : "—"}</Text>
                  <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Records</Text>
                </Box>
                <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
                  <Text fw={700} c="#DC2626" style={{ fontSize: 14 }}>{overview?.active_alerts ?? "—"}</Text>
                  <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Critical</Text>
                </Box>
              </SimpleGrid>
              <Group justify="space-between">
                <Group gap={4}>
                  <IconRefresh size={12} color="#737373" />
                  <Text c="#737373" style={{ fontSize: 10 }}>Last sync: {ps ? "5 min ago" : "—"}</Text>
                </Group>
                <Text component={Link} href="/detection" c="#E85D3D" fw={500} style={{ fontSize: 10 }} className="no-underline">
                  View sources &rarr;
                </Text>
              </Group>
            </Box>
          );
        })()}

        {/* Active Crises / NRC Activities */}
        {hasCrisisData ? (
          <CollapsibleSection title={`Active Crises (${currentCrises.length})`} defaultOpen>
            <Stack gap={8} style={{ maxHeight: 360, overflowY: "auto" }}>
              {currentCrises.map((crisis) => (
                <UnstyledButton
                  key={crisis.id}
                  component={Link}
                  href={`/crisis/${crisis.id}`}
                  p={12}
                  className="flex items-center gap-3 bg-[#F5F5F5] cursor-pointer hover:bg-[#E5E5E5] transition-colors no-underline"
                >
                  <Box
                    w={10}
                    h={10}
                    className={cn(
                      "shrink-0",
                      severityDotColors[crisis.severity],
                      crisis.severity === "critical" && "animate-pulse-dot",
                    )}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} c="#171717" style={{ fontSize: 13 }}>
                      {crisis.name}
                    </Text>
                    <Text c="#737373" style={{ fontSize: 11 }}>
                      {crisis.meta}
                    </Text>
                  </Box>
                  <Badge
                    size="xs"
                    tt="uppercase"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: severityBadgeColors[crisis.severity]?.bg,
                      color: severityBadgeColors[crisis.severity]?.text,
                      flexShrink: 0,
                    }}
                  >
                    {crisis.severity}
                  </Badge>
                </UnstyledButton>
              ))}
            </Stack>
          </CollapsibleSection>
        ) : nrcCountryInfo ? (
          <CollapsibleSection title={`NRC Core Activities (${nrcCountryInfo.activities.length})`} defaultOpen>
            <Stack gap={8}>
              {nrcCountryInfo.activities.map((activity) => (
                <Box key={activity} p={12} className="bg-[#F5F5F5]">
                  <Group gap={8}>
                    <Box w={10} h={10} style={{ background: nrcCountryInfo.regionColor, borderRadius: "50%" }} />
                    <Box style={{ flex: 1 }}>
                      <Text fw={600} c="#171717" style={{ fontSize: 13 }}>{activity}</Text>
                      <Text c="#737373" style={{ fontSize: 11 }}>
                        {activity === "Education" && "Ensuring displaced children access quality education"}
                        {activity === "WASH" && "Clean water and sanitation facilities"}
                        {activity === "Shelter" && "Providing safe and dignified housing"}
                        {activity === "ICLA" && "Helping obtain documentation and exercise rights"}
                        {activity === "Food Security" && "Addressing hunger and food insecurity"}
                        {activity === "Camp Management" && "Coordinating services in displacement sites"}
                        {activity === "Protection" && "Protecting vulnerable populations from harm"}
                      </Text>
                    </Box>
                    <Badge size="xs" color="green" variant="light" style={{ fontSize: 10, fontWeight: 600 }}>Active</Badge>
                  </Group>
                </Box>
              ))}
            </Stack>
          </CollapsibleSection>
        ) : null}

        {/* AI Situation Analysis */}
        <CollapsibleSection title={hasCrisisData ? "AI Situation Analysis" : "Location Overview"} defaultOpen>
          {hasCrisisData ? (
            <>
              <Group justify="space-between" mb={8}>
                <Badge
                  size="xs"
                  variant="light"
                  color="violet"
                  tt="uppercase"
                  style={{ fontSize: 9, fontWeight: 700 }}
                >
                  <IconSparkles size={10} style={{ display: "inline", marginRight: 4 }} />
                  AI Analysis
                </Badge>
                {llmMutation.isPending && <Loader size={14} />}
              </Group>
              {aiAnalysis ? (
                <Text size="sm" c="#525252" lh={1.65} style={{ fontSize: 13, whiteSpace: "pre-line" }}>
                  {aiAnalysis}
                </Text>
              ) : llmMutation.isPending ? (
                <Text size="sm" c="#A3A3A3" style={{ fontSize: 13 }}>Generating AI situation analysis...</Text>
              ) : countryAlerts.length > 0 ? (
                <>
                  <Text size="sm" c="#525252" lh={1.65} style={{ fontSize: 13 }}>
                    {countryAlerts.length} active alert{countryAlerts.length > 1 ? "s" : ""} for {selectedCountry}. {countryAlerts[0]?.title ?? ""} — {countryAlerts[0]?.text?.slice(0, 200) ?? ""}
                  </Text>
                  {llmMutation.isError && (
                    <Text size="xs" c="#DC2626" mt={4} style={{ fontSize: 11 }}>
                      LLM unavailable — showing alert summary.
                    </Text>
                  )}
                </>
              ) : selectedCountry === "Sudan" ? (
                <>
                  <Text size="sm" c="#525252" lh={1.65} style={{ fontSize: 13 }}>
                    <Text component="span" className="bg-[#FEE2E2] px-1" fw={500}>Armed conflict in Khartoum has displaced 2.5M people</Text>{" "}
                    with urgent humanitarian needs across multiple sectors. Fighting has spread to Darfur regions with{" "}
                    <Text component="span" className="bg-[#FEF3C7] px-1" fw={500}>famine conditions (IPC Phase 5)</Text>{" "}
                    in West Darfur affecting 890,000 people.
                  </Text>
                  <Text size="sm" c="#525252" lh={1.65} mt={16} style={{ fontSize: 13 }}>
                    Cholera outbreak in Port Sudan requires immediate WASH intervention. 1,847 confirmed cases with limited medical supplies reaching affected areas.
                  </Text>
                </>
              ) : (
                <>
                  <Text size="sm" c="#525252" lh={1.65} style={{ fontSize: 13 }}>
                    <Text component="span" className="bg-[#FEF3C7] px-1" fw={500}>Cholera outbreak requires immediate action</Text>{" "}
                    with 46-hour intervention window remaining. Current spread pattern indicates waterborne transmission from contaminated wells in Jijiga.
                    Response teams deployed but{" "}
                    <Text component="span" className="bg-[#FEF3C7] px-1" fw={500}>IV fluid supplies critically low</Text>{" "}
                    at 32% capacity.
                  </Text>
                  <Text size="sm" c="#525252" lh={1.65} mt={16} style={{ fontSize: 13 }}>
                    Flood risk in Oromia elevated due to seasonal rainfall patterns. Pre-positioning recommended for Bale and West Arsi zones.
                  </Text>
                </>
              )}
              <Text
                component={Link}
                href="/analysis"
                size="xs"
                c="#E85D3D"
                fw={500}
                mt={12}
                className="inline-block no-underline"
              >
                View full analysis &rarr;
              </Text>
            </>
          ) : nrcCountryInfo ? (
            <>
              <Badge
                size="xs"
                tt="uppercase"
                mb={8}
                style={{ fontSize: 9, fontWeight: 700, background: nrcCountryInfo.regionColor, color: "white" }}
              >
                {nrcCountryInfo.regionName}
              </Badge>
              <Text size="sm" c="#525252" lh={1.65} style={{ fontSize: 13 }}>
                {nrcCountryInfo.description ?? `NRC operates in ${selectedCountry} providing humanitarian assistance to displaced and vulnerable populations.`}
              </Text>
              <Text size="sm" c="#525252" lh={1.6} mt={16} style={{ fontSize: 13 }}>
                <Text component="span" className="bg-[#FEF2F0] px-1" fw={500}>
                  NRC provides multi-sector humanitarian response
                </Text>{" "}
                including {nrcCountryInfo.activities.slice(0, 3).join(", ").toLowerCase()} and other core competencies.
              </Text>
            </>
          ) : (
            <Text size="sm" c="#737373" style={{ fontSize: 13 }}>No detailed information available for this location.</Text>
          )}
        </CollapsibleSection>

        {/* Response Status */}
        <CollapsibleSection title={hasCrisisData ? "Response Status" : "NRC Presence"}>
          {hasCrisisData ? (
            <>
              {/* Team Deployments */}
              <Box mb={16}>
                <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 10 }} mb={8}>
                  Active Deployments
                </Text>
                <Stack gap={8}>
                  <Box p={10} className="border-l-[3px] border-l-[#059669]" style={{ background: "#F0FDF4" }}>
                    <Group justify="space-between">
                      <Group gap={8}>
                        <Box w={8} h={8} style={{ background: "#059669" }} className="animate-pulse" />
                        <Box>
                          <Text fw={500} style={{ fontSize: 13 }}>WASH Team Alpha</Text>
                          <Text c="#737373" style={{ fontSize: 11 }}>Jijiga • 6 members</Text>
                        </Box>
                      </Group>
                      <Badge size="xs" color="green" variant="light" style={{ fontSize: 10, fontWeight: 600 }}>Active</Badge>
                    </Group>
                  </Box>
                  <Box p={10} className="border-l-[3px] border-l-[#059669]" style={{ background: "#F0FDF4" }}>
                    <Group justify="space-between">
                      <Group gap={8}>
                        <Box w={8} h={8} style={{ background: "#059669" }} className="animate-pulse" />
                        <Box>
                          <Text fw={500} style={{ fontSize: 13 }}>Health Team Bravo</Text>
                          <Text c="#737373" style={{ fontSize: 11 }}>Kebridehar • 5 members</Text>
                        </Box>
                      </Group>
                      <Badge size="xs" color="green" variant="light" style={{ fontSize: 10, fontWeight: 600 }}>Active</Badge>
                    </Group>
                  </Box>
                  <Box p={10} className="border-l-[3px] border-l-[#D97706]" style={{ background: "#FFFBEB" }}>
                    <Group justify="space-between">
                      <Group gap={8}>
                        <Box w={8} h={8} style={{ background: "#D97706" }} />
                        <Box>
                          <Text fw={500} style={{ fontSize: 13 }}>Assessment Team</Text>
                          <Text c="#737373" style={{ fontSize: 11 }}>En route to Gode • 4 members</Text>
                        </Box>
                      </Group>
                      <Badge size="xs" color="yellow" variant="light" style={{ fontSize: 10, fontWeight: 600 }}>Transit</Badge>
                    </Group>
                  </Box>
                </Stack>
              </Box>

              {/* Critical Resources */}
              <Box mb={8}>
                <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 10 }} mb={8}>
                  Critical Resources
                </Text>
                <Stack gap={8}>
                  {[
                    { name: "IV Fluids", pct: 32, color: "#DC2626" },
                    { name: "ORS Packets", pct: 58, color: "#D97706" },
                    { name: "Water Purification", pct: 74, color: "#059669" },
                  ].map((resource) => (
                    <Group key={resource.name} justify="space-between">
                      <Text style={{ fontSize: 13 }}>{resource.name}</Text>
                      <Group gap={8}>
                        <Box w={96} h={8} style={{ background: "#E5E5E5" }}>
                          <Box h="100%" style={{ background: resource.color, width: `${resource.pct}%` }} />
                        </Box>
                        <Text fw={600} style={{ fontSize: 11, color: resource.color }}>{resource.pct}%</Text>
                      </Group>
                    </Group>
                  ))}
                </Stack>
              </Box>
              <Text
                component={Link}
                href="/operations"
                size="xs"
                c="#E85D3D"
                fw={500}
                mt={8}
                className="inline-block no-underline"
              >
                View Operations Center &rarr;
              </Text>
            </>
          ) : nrcCountryInfo ? (
            <>
              <Box mb={16}>
                <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 10 }} mb={8}>
                  Country Office
                </Text>
                <Box p={10} className="border-l-[3px]" style={{ borderLeftColor: nrcCountryInfo.regionColor, background: "#FEF2F0" }}>
                  <Group justify="space-between">
                    <Group gap={8}>
                      <Box w={8} h={8} style={{ background: nrcCountryInfo.regionColor }} />
                      <Box>
                        <Text fw={500} style={{ fontSize: 13 }}>NRC {selectedCountry}</Text>
                        <Text c="#737373" style={{ fontSize: 11 }}>Country Office</Text>
                      </Box>
                    </Group>
                    <Badge size="xs" color="green" variant="light" style={{ fontSize: 10, fontWeight: 600 }}>Active</Badge>
                  </Group>
                </Box>
              </Box>
              <Box mb={8}>
                <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 10 }} mb={8}>
                  Other {nrcCountryInfo.regionName.split(" ")[0]} Countries
                </Text>
                <Group gap={4}>
                  {nrcRegions[nrcCountryInfo.regionName]?.countries
                    .filter((c) => c.name !== selectedCountry)
                    .slice(0, 5)
                    .map((c) => (
                      <UnstyledButton
                        key={c.name}
                        onClick={() => handleCountryChange(c.name)}
                        px={8}
                        py={4}
                        style={{ fontSize: 10, background: "#F5F5F5", color: "#525252" }}
                        className="hover:bg-[#E5E5E5]"
                      >
                        {c.name}
                      </UnstyledButton>
                    ))}
                </Group>
              </Box>
            </>
          ) : (
            <Text size="sm" c="#737373" style={{ fontSize: 13 }}>No response data available.</Text>
          )}
        </CollapsibleSection>

        {/* NRC Global Operations */}
        <CollapsibleSection title={`NRC Global Operations (${nrcTotalCountries})`}>
          {/* Quick Stats */}
          <SimpleGrid cols={3} spacing={8} mb={16}>
            <Box p={8} style={{ background: "#F5F5F5", textAlign: "center" }}>
              <Text fw={700} c="#E85D3D" style={{ fontSize: 18 }}>{nrcTotalCountries}</Text>
              <Text c="#737373" tt="uppercase" style={{ fontSize: 9 }}>Countries</Text>
            </Box>
            <Box p={8} style={{ background: "#F5F5F5", textAlign: "center" }}>
              <Text fw={700} c="#E85D3D" style={{ fontSize: 18 }}>{Object.keys(nrcRegions).length}</Text>
              <Text c="#737373" tt="uppercase" style={{ fontSize: 9 }}>Regions</Text>
            </Box>
            <Box p={8} style={{ background: "#F5F5F5", textAlign: "center" }}>
              <Text fw={700} c="#E85D3D" style={{ fontSize: 18 }}>~16.5k</Text>
              <Text c="#737373" tt="uppercase" style={{ fontSize: 9 }}>Staff</Text>
            </Box>
          </SimpleGrid>

          {/* View on Map Button */}
          <UnstyledButton
            onClick={() => setActiveView(activeView === "nrc-global" ? "single" : "nrc-global")}
            w="100%"
            mb={16}
            py={8}
            px={12}
            style={{
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              border: "1px solid #E5E5E5",
              background: activeView === "nrc-global" ? "#E85D3D" : "white",
              color: activeView === "nrc-global" ? "white" : "#171717",
            }}
          >
            <IconWorld size={16} />
            {activeView === "nrc-global" ? "Viewing Global Map" : "View All on Map"}
          </UnstyledButton>

          {/* Regions Accordions */}
          <Stack gap={8}>
            {Object.entries(nrcRegions).map(([regionName, regionData]) => {
              const isExpanded = expandedNRCRegion === regionName;
              return (
                <Box key={regionName} style={{ border: "1px solid #E5E5E5" }}>
                  <UnstyledButton
                    onClick={() => setExpandedNRCRegion(isExpanded ? null : regionName)}
                    w="100%"
                    px={12}
                    py={8}
                    className="flex items-center justify-between hover:bg-[#F5F5F5] transition-colors"
                  >
                    <Group gap={8}>
                      <Box w={10} h={10} style={{ background: regionData.color, borderRadius: "50%" }} />
                      <Text fw={600} style={{ fontSize: 12 }}>{regionName}</Text>
                      <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>{regionData.countries.length}</Badge>
                    </Group>
                    <IconChevronDown
                      size={16}
                      color="#A3A3A3"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                    />
                  </UnstyledButton>
                  <Collapse in={isExpanded}>
                    <Box className="border-t border-[#F0F0F0]" style={{ background: "#F9FAFB" }}>
                      {regionData.countries.map((country, idx) => (
                        <UnstyledButton
                          key={country.name}
                          onClick={() => handleCountryChange(country.name)}
                          w="100%"
                          px={12}
                          py={10}
                          className={cn(
                            "flex items-start gap-8 hover:bg-[#F0F0F0] transition-colors",
                            idx < regionData.countries.length - 1 && "border-b border-[#F0F0F0]",
                          )}
                        >
                          <IconMapPin size={14} color="#E85D3D" style={{ marginTop: 2, flexShrink: 0 }} />
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Group justify="space-between" gap={8}>
                              <Text fw={500} style={{ fontSize: 12 }}>{country.name}</Text>
                              {selectedCountry === country.name && (
                                <Badge size="xs" style={{ fontSize: 9, background: "#E85D3D", color: "white" }}>Selected</Badge>
                              )}
                            </Group>
                            <Group gap={4} mt={4}>
                              {country.activities.slice(0, 3).map((a) => (
                                <Text key={a} px={6} py={1} style={{ fontSize: 9, background: "white", border: "1px solid #E5E5E5", color: "#525252" }}>
                                  {a === "Legal Assistance (ICLA)" ? "ICLA" : a}
                                </Text>
                              ))}
                              {country.activities.length > 3 && (
                                <Text c="#A3A3A3" style={{ fontSize: 9 }}>+{country.activities.length - 3}</Text>
                              )}
                            </Group>
                          </Box>
                        </UnstyledButton>
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>

          {/* Core Competencies */}
          <Box mt={16} pt={16} className="border-t border-[#F0F0F0]">
            <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 10 }} mb={8}>
              Core Competencies
            </Text>
            <Group gap={4}>
              {["Education", "Food Security", "ICLA", "Shelter", "WASH", "Camp Mgmt"].map((comp) => (
                <Text key={comp} px={8} py={3} style={{ fontSize: 9, background: "#FEF2F0", color: "#E85D3D", border: "1px solid #FECACA" }}>
                  {comp}
                </Text>
              ))}
            </Group>
          </Box>
        </CollapsibleSection>

        {/* Recent Activity */}
        <CollapsibleSection title="Recent Activity">
          <Stack gap={12}>
            {recentActivity.map((item, i) => {
              const icon = activityIcons[item.type] ?? { bg: "#F5F5F5", icon: "?" };
              return (
                <Group key={i} gap={12} align="flex-start">
                  <Box
                    w={32}
                    h={32}
                    style={{
                      background: icon.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {icon.icon}
                  </Box>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" gap={8}>
                      <Text fw={500} style={{ fontSize: 13 }} lineClamp={1}>{item.title}</Text>
                      <Text c="#A3A3A3" style={{ fontSize: 10, flexShrink: 0 }}>{item.time}</Text>
                    </Group>
                    <Text c="#737373" style={{ fontSize: 11 }} lineClamp={1}>{item.description}</Text>
                  </Box>
                </Group>
              );
            })}
          </Stack>
          <Text
            component={Link}
            href="/detection"
            size="xs"
            c="#E85D3D"
            fw={500}
            mt={12}
            className="inline-block no-underline"
          >
            View all activity &rarr;
          </Text>
        </CollapsibleSection>

        {/* Action buttons */}
        <Group gap={8} px={24} py={16} className="border-t border-[#E5E5E5] mt-auto">
          <Button
            leftSection={<IconFileText size={14} />}
            variant="unstyled"
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: "#171717",
              color: "white",
              border: "none",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            Generate Briefing
          </Button>
          <Button
            leftSection={<IconBolt size={14} />}
            variant="unstyled"
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: "white",
              color: "#171717",
              border: "1px solid #E5E5E5",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            Create Alert
          </Button>
        </Group>

        {/* Data source footer — matching wireframe */}
        <Box px={24} py={16} className="border-t border-[#E5E5E5] bg-[#F5F5F5]">
          <Text size="xs" c="#737373" style={{ fontSize: 11 }}>
            Data:{" "}
            <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>MOH PHEM</Text>
            ,{" "}
            <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>WHO</Text>
            ,{" "}
            <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>FEWS</Text>
            {" "}| AI Analysis
          </Text>
          <Text size="xs" c="#A3A3A3" mt={8} style={{ fontSize: 9 }}>
            &copy; Mapbox | {alertsQuery.dataUpdatedAt ? `Updated: ${Math.round((Date.now() - alertsQuery.dataUpdatedAt) / 60000)}m ago` : "Updated: 30m ago"}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
