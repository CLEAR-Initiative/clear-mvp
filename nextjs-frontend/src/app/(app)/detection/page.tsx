"use client";

import { useState, useMemo, useCallback } from "react";
import { Box, Tabs, Button, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSearch, IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { mapSeverity } from "~/lib/types/django";
import type { DjangoAlert } from "~/lib/types/django";
import type { MapMarker } from "~/components/map/crisis-map";
import { countryConfig, countries, dateOptions } from "~/lib/constants/country-config";
import { PageHeader, StatsGrid, FilterBar } from "~/components/ui";
import type { StatItem } from "~/components/ui";

import { LiveAlertsTab } from "./_components/live-alerts-tab";
import { DataSourcesTab } from "./_components/data-sources-tab";
import { AlertRulesTab } from "./_components/alert-rules-tab";
import { HistoryTab } from "./_components/history-tab";
import { CreateAlertModal } from "./_components/create-alert-modal";

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function DetectionPage() {
  const [activeTab, setActiveTab] = useState<string | null>("live");
  const [ruleStates, setRuleStates] = useState<Record<string, boolean>>({});
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState("Feb 2026");
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

  // tRPC queries
  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true });
  const historyQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: false, pageSize: 20 },
    { enabled: activeTab === "history" },
  );
  const statsQuery = api.alerts.getStats.useQuery();
  const sourcesQuery = api.pipeline.getSources.useQuery(undefined, {
    enabled: activeTab === "sources" || activeTab === "live",
  });
  const pipelineStatsQuery = api.pipeline.getStatistics.useQuery(undefined, {
    enabled: activeTab === "sources" || activeTab === "live",
  });
  const detectorsQuery = api.alertFramework.getDetectors.useQuery(undefined, {
    enabled: activeTab === "rules",
  });
  const frameworkStatsQuery = api.alertFramework.getStats.useQuery(undefined, {
    enabled: activeTab === "rules",
  });

  const countryConf = countryConfig[selectedCountry];

  // Derived data -- sorted by severity (high to low), filtered by country/region
  const allAlerts = useMemo(() => {
    const raw = alertsQuery.data?.alerts ?? [];
    return [...raw].sort((a, b) => b.severity - a.severity);
  }, [alertsQuery.data?.alerts]);

  const alerts = useMemo(() => {
    if (allAlerts.length === 0) return [];
    const regions = countryConf?.regions?.map((r) => r.toLowerCase()) ?? [];
    const countryLower = selectedCountry.toLowerCase();
    const regionLower =
      selectedRegion !== "All Regions" ? selectedRegion.toLowerCase() : null;

    return allAlerts.filter((alert) => {
      const matchesCountry =
        alert.locations.some((loc) => {
          const locName = loc.name.toLowerCase();
          return (
            regions.some((r) => r !== "all regions" && locName.includes(r)) ||
            locName.includes(countryLower)
          );
        }) ||
        alert.title.toLowerCase().includes(countryLower) ||
        (alert.text?.toLowerCase().includes(countryLower) ?? false);

      if (!matchesCountry) return false;

      if (regionLower) {
        return (
          alert.locations.some((loc) =>
            loc.name.toLowerCase().includes(regionLower),
          ) ||
          alert.title.toLowerCase().includes(regionLower) ||
          (alert.text?.toLowerCase().includes(regionLower) ?? false)
        );
      }
      return true;
    });
  }, [allAlerts, selectedCountry, selectedRegion, countryConf?.regions]);

  const overview = statsQuery.data?.stats?.overview;
  const sources = sourcesQuery.data?.sources ?? [];
  const pipelineStats = pipelineStatsQuery.data;
  const detectors = detectorsQuery.data?.detectors ?? [];
  const historyAlerts = historyQuery.data?.alerts ?? [];

  // Map markers derived from filtered alerts
  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    for (const alert of alerts as DjangoAlert[]) {
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
  }, [alerts]);

  const mapCenter = useMemo<[number, number]>(
    () => countryConf?.center ?? [30.0, 15.5],
    [countryConf?.center],
  );
  const mapZoom = useMemo(() => countryConf?.zoom ?? 5, [countryConf?.zoom]);

  // Initialize rule states from detectors
  if (detectors.length > 0 && Object.keys(ruleStates).length === 0) {
    const initial: Record<string, boolean> = {};
    for (const d of detectors) {
      initial[d.name] = d.active;
    }
    setRuleStates(initial);
  }

  const handleToggleRule = useCallback(
    (name: string) => {
      setRuleStates((prev) => ({
        ...prev,
        [name]: !(prev[name] ?? detectors.find((d) => d.name === name)?.active),
      }));
    },
    [detectors],
  );

  const handleRefreshPipeline = useCallback(() => {
    void sourcesQuery.refetch();
    void pipelineStatsQuery.refetch();
  }, [sourcesQuery, pipelineStatsQuery]);

  const statCards: StatItem[] = [
    { label: "Active Alerts", value: String(alerts.length), color: "#DC2626" },
    {
      label: "Data Sources Online",
      value: `${sources.filter((s) => s.is_active).length}/${sources.length}`,
      color: "#059669",
    },
    {
      label: "Events Today",
      value: pipelineStats ? formatNumber(pipelineStats.overall.recent_data_count) : "\u2014",
    },
    {
      label: "Recent 7 Days",
      value: String(overview?.recent_7_days ?? "\u2014"),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Crisis Detection"
        subtitle="Detection"
        breadcrumbs={["CLEAR", "Detection"]}
        loading={alertsQuery.isLoading}
      >
        <FilterBar
          country={selectedCountry}
          onCountryChange={(v) => {
            setSelectedCountry(v);
            setSelectedRegion("All Regions");
          }}
          region={selectedRegion}
          onRegionChange={setSelectedRegion}
          countries={countries}
          regions={countryConf?.regions ?? ["All Regions"]}
          date={selectedDate}
          onDateChange={setSelectedDate}
          dateOptions={dateOptions}
        />
        <Group gap={8}>
          <Button
            variant="outline"
            color="gray"
            size="xs"
            leftSection={<IconSearch size={14} />}
            style={{ fontSize: 13 }}
          >
            Search
          </Button>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={openCreateModal}
            style={{
              background: "#E85D3D",
              borderColor: "#E85D3D",
              fontSize: 13,
            }}
          >
            Create Manual Alert
          </Button>
        </Group>
      </PageHeader>

      <Box p={24}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          mb={24}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List>
            <Tabs.Tab value="live">Live Alerts</Tabs.Tab>
            <Tabs.Tab value="sources">Data Sources</Tabs.Tab>
            <Tabs.Tab value="rules">Alert Rules</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <StatsGrid stats={statCards} />

        {activeTab === "live" && (
          <LiveAlertsTab
            alerts={alerts}
            sources={sources}
            pipelineStats={pipelineStats}
            selectedCountry={selectedCountry}
            selectedRegion={selectedRegion}
            alertsLoading={alertsQuery.isLoading}
            mapMarkers={mapMarkers}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            onRefresh={handleRefreshPipeline}
          />
        )}

        {activeTab === "sources" && (
          <DataSourcesTab
            sources={sources}
            loading={sourcesQuery.isLoading}
          />
        )}

        {activeTab === "rules" && (
          <AlertRulesTab
            detectors={detectors}
            frameworkStats={frameworkStatsQuery.data?.stats}
            loading={detectorsQuery.isLoading}
            ruleStates={ruleStates}
            onToggleRule={handleToggleRule}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            alerts={historyAlerts}
            loading={historyQuery.isLoading}
            total={historyQuery.data?.total}
            count={historyQuery.data?.count}
          />
        )}
      </Box>

      <CreateAlertModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        onSuccess={() => void alertsQuery.refetch()}
      />
    </Box>
  );
}
