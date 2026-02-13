"use client";

import { useState, useMemo, useEffect } from "react";
import { Box } from "@mantine/core";
import type { MapMarker } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { mapSeverity } from "~/lib/types/django";
import type { DjangoAlert } from "~/lib/types/django";
import { buildSituationAnalysisPrompt, SITUATION_ANALYSIS_SYSTEM_PROMPT } from "~/lib/prompts";
import { countryConfig, countries } from "~/lib/constants/country-config";
import { nrcRegions } from "~/lib/constants/nrc-regions";
import { MapSection } from "./_components/map-section";
import { RightPanel } from "./_components/right-panel";

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
          description: `${loc.name} \u2022 ${alert.shock_type?.name ?? ""}`,
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
      meta: `${a.locations?.[0]?.name ?? "Unknown"} \u2022 ${a.shock_type?.name ?? ""}`,
      severity: sev === "low" ? "medium" : sev,
    };
  });
}

/* Static fallback markers for countries without location coordinates in DB */
const fallbackMarkers: Record<string, MapMarker[]> = {
  Sudan: [
    { id: 101, lng: 32.53, lat: 15.5, title: "Active Conflict - Khartoum", severity: "critical", type: "Conflict", description: "2.5M affected \u2022 Khartoum" },
    { id: 102, lng: 25.35, lat: 13.63, title: "Armed Clashes - El Fasher", severity: "critical", type: "Conflict", description: "450k affected \u2022 North Darfur" },
    { id: 103, lng: 23.47, lat: 12.91, title: "IDP Camp - Zalingei", severity: "critical", type: "Displacement", description: "180k displaced \u2022 Central Darfur" },
    { id: 104, lng: 22.45, lat: 13.45, title: "Famine Risk - West Darfur", severity: "critical", type: "Food Security", description: "IPC Phase 5 \u2022 890k affected" },
    { id: 105, lng: 37.22, lat: 19.62, title: "Cholera - Port Sudan", severity: "critical", type: "Health", description: "1,847 cases \u2022 Red Sea" },
    { id: 106, lng: 32.5, lat: 13.16, title: "Flood Risk - White Nile", severity: "medium", type: "Natural Disaster", description: "Seasonal \u2022 White Nile" },
  ],
  Ethiopia: [
    { id: 1, lng: 42.79, lat: 9.35, title: "Cholera Outbreak", severity: "critical", type: "Health", description: "247 cases \u2022 Somali Region" },
    { id: 3, lng: 39.76, lat: 7.0, title: "Flood Risk", severity: "high", type: "Natural Disaster", description: "36h warning \u2022 Oromia" },
    { id: 4, lng: 40.0, lat: 11.5, title: "Drought Zone", severity: "medium", type: "Natural Disaster", description: "Monitoring \u2022 Afar" },
  ],
};

/* ========== Main Page ========== */
export default function DashboardPage() {
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [activeView, setActiveView] = useState("single");
  const [activeMonth, setActiveMonth] = useState(2);
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

  // Filter alerts by selected country
  const countryAlerts = useMemo(() => {
    if (allAlerts.length === 0) return [];
    const regions = config?.regions?.map((r) => r.toLowerCase()) ?? [];
    const countryLower = selectedCountry.toLowerCase();
    const regionLower = selectedRegion !== "All Regions" ? selectedRegion.toLowerCase() : null;

    return allAlerts.filter((alert) => {
      const matchesCountry = alert.locations.some((loc) => {
        const locName = loc.name.toLowerCase();
        return regions.some((r) => r !== "all regions" && locName.includes(r)) || locName.includes(countryLower);
      }) || alert.title.toLowerCase().includes(countryLower)
        || (alert.text?.toLowerCase().includes(countryLower) ?? false);

      if (!matchesCountry) return false;

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
      <MapSection
        selectedCountry={selectedCountry}
        selectedRegion={selectedRegion}
        onCountryChange={handleCountryChange}
        onRegionChange={(v) => setSelectedRegion(v ?? "All Regions")}
        activeView={activeView}
        onViewChange={setActiveView}
        currentMarkers={currentMarkers}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
        countries={countries}
        regionOptions={regionOptions}
      />
      <RightPanel
        selectedCountry={selectedCountry}
        config={config}
        hasCrisisData={hasCrisisData}
        countryAlerts={countryAlerts}
        currentCrises={currentCrises}
        overview={overview}
        pipelineStats={pipelineStatsQuery.data?.statistics}
        aiAnalysis={aiAnalysis}
        llmMutation={{ isPending: llmMutation.isPending, isError: llmMutation.isError }}
        nrcCountryInfo={nrcCountryInfo}
        activeView={activeView}
        onViewChange={setActiveView}
        onCountryChange={handleCountryChange}
        alertsQuery={{ isLoading: alertsQuery.isLoading, dataUpdatedAt: alertsQuery.dataUpdatedAt }}
      />
    </Box>
  );
}
