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
      const lng = loc.longitude ?? loc.point?.coordinates[0];
      const lat = loc.latitude ?? loc.point?.coordinates[1];
      if (lat != null && lng != null) {
        markers.push({
          id: alert.id * 100 + loc.id,
          lng,
          lat,
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
  const pipelineStatsQuery = api.pipeline.getStatistics.useQuery(undefined, {
    // Don't throw error if endpoint doesn't exist yet - UI handles undefined gracefully
    retry: false,
    onError: (error) => {
      console.warn("Pipeline statistics endpoint not available:", error.message);
    },
  });
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

  // Derive markers and crises from country-filtered API data
  const apiMarkers = useMemo(() => alertsToMarkers(countryAlerts), [countryAlerts]);
  const apiCrises = useMemo(() => alertsToCrises(countryAlerts), [countryAlerts]);
  const currentMarkers = useMemo(() => apiMarkers, [apiMarkers]);
  const currentCrises = useMemo(() => apiCrises, [apiCrises]);

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
        pipelineStats={pipelineStatsQuery.data}
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
