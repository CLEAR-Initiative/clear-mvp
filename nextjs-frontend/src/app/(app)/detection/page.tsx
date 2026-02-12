"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Table,
  Tabs,
  Switch,
  Loader,
  Select,
} from "@mantine/core";
import {
  IconSearch,
  IconPlus,
  IconPointFilled,
  IconDatabase,
  IconRefresh,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { mapSeverity, severityColor } from "~/lib/types/django";
import type { DjangoAlert } from "~/lib/types/django";
import type { MapMarker } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

const severityBgColors: Record<string, string> = {
  critical: "#FEE2E2",
  high: "#FEF3C7",
  medium: "#FEF3C7",
  low: "#ECFDF5",
};

const severityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/* ========== Country / Region configuration ========== */
const countryRegions: Record<
  string,
  { regions: string[]; center: [number, number]; zoom: number }
> = {
  Sudan: {
    regions: [
      "All Regions",
      "Khartoum",
      "North Darfur",
      "South Darfur",
      "West Darfur",
      "Central Darfur",
      "Blue Nile",
      "Red Sea",
      "Kassala",
    ],
    center: [30.0, 15.5],
    zoom: 5,
  },
  Ethiopia: {
    regions: [
      "All Regions",
      "Somali",
      "Oromia",
      "Afar",
      "Amhara",
      "Tigray",
      "SNNPR",
    ],
    center: [40.5, 8.5],
    zoom: 5.5,
  },
  "South Sudan": {
    regions: [
      "All Regions",
      "Central Equatoria",
      "Jonglei",
      "Unity",
      "Upper Nile",
      "Lakes",
    ],
    center: [31.0, 7.0],
    zoom: 5.5,
  },
  Somalia: {
    regions: [
      "All Regions",
      "Banadir",
      "Bay",
      "Gedo",
      "Lower Juba",
      "Middle Shabelle",
    ],
    center: [46.0, 5.0],
    zoom: 5,
  },
  Yemen: {
    regions: ["All Regions", "Sana'a", "Aden", "Taiz", "Hodeidah", "Marib"],
    center: [48.0, 15.5],
    zoom: 5.5,
  },
};
const countries = Object.keys(countryRegions).sort();
const dateOptions = [
  "Feb 2026",
  "Jan 2026",
  "Dec 2025",
  "Nov 2025",
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
];

export default function DetectionPage() {
  const [activeTab, setActiveTab] = useState<string | null>("live");
  const [ruleStates, setRuleStates] = useState<Record<string, boolean>>({});
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState("Feb 2026");

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

  const countryConf = countryRegions[selectedCountry];

  // Derived data — sorted by severity (high to low), filtered by country/region
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
  const pipelineStats = pipelineStatsQuery.data?.statistics;
  const detectors = detectorsQuery.data?.detectors ?? [];
  const historyAlerts = historyQuery.data?.alerts ?? [];

  // Map markers derived from filtered alerts
  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    for (const alert of alerts as DjangoAlert[]) {
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

  const statCards = [
    { label: "Active Alerts", value: String(alerts.length), color: "#DC2626" },
    {
      label: "Data Sources Online",
      value: `${sources.filter((s) => s.is_active).length}/${sources.length}`,
      color: "#059669",
    },
    {
      label: "Events Today",
      value: pipelineStats ? formatNumber(pipelineStats.data.recent_24h) : "—",
      color: undefined,
    },
    {
      label: "Recent 7 Days",
      value: String(overview?.recent_7_days ?? "—"),
      color: undefined,
    },
  ];

  return (
    <Box>
      {/* Header — breadcrumbs, title, filters + buttons */}
      <Box
        px={24}
        py={12}
        className="border-b border-[#E5E5E5]"
        style={{ background: "#FFFFFF" }}
      >
        {/* Breadcrumbs */}
        <Group gap={4} mb={8}>
          <Text size="xs" c="#E85D3D" fw={600} style={{ cursor: "pointer" }}>
            CLEAR
          </Text>
          <Text size="xs" c="#A3A3A3">
            &gt;
          </Text>
          <Text size="xs" c="#525252" fw={500}>
            Detection
          </Text>
        </Group>

        {/* Title row */}
        <Group gap={12} mb={12}>
          <Text fw={700} c="#171717" style={{ fontSize: 20 }}>
            Crisis Detection
          </Text>
          {alertsQuery.isLoading && <Loader size={14} />}
        </Group>

        {/* Filters + Action buttons row */}
        <Group justify="space-between">
          <Group gap={12}>
            <Select
              size="xs"
              value={selectedCountry}
              onChange={(v) => {
                setSelectedCountry(v ?? "Sudan");
                setSelectedRegion("All Regions");
              }}
              data={countries}
              style={{ minWidth: 130 }}
              styles={{
                input: {
                  fontWeight: 600,
                  fontSize: 13,
                  border: "1px solid #E5E5E5",
                },
              }}
              label={
                <Text
                  size="xs"
                  c="#737373"
                  tt="uppercase"
                  style={{ letterSpacing: "0.05em", fontSize: 10 }}
                >
                  Country
                </Text>
              }
            />
            <Select
              size="xs"
              value={selectedRegion}
              onChange={(v) => setSelectedRegion(v ?? "All Regions")}
              data={countryConf?.regions ?? ["All Regions"]}
              style={{ minWidth: 130 }}
              styles={{
                input: {
                  fontWeight: 600,
                  fontSize: 13,
                  border: "1px solid #E5E5E5",
                },
              }}
              label={
                <Text
                  size="xs"
                  c="#737373"
                  tt="uppercase"
                  style={{ letterSpacing: "0.05em", fontSize: 10 }}
                >
                  Region
                </Text>
              }
            />
            <Select
              size="xs"
              value={selectedDate}
              onChange={(v) => setSelectedDate(v ?? "Feb 2026")}
              data={dateOptions}
              style={{ minWidth: 120 }}
              styles={{
                input: {
                  fontWeight: 600,
                  fontSize: 13,
                  border: "1px solid #E5E5E5",
                },
              }}
              label={
                <Text
                  size="xs"
                  c="#737373"
                  tt="uppercase"
                  style={{ letterSpacing: "0.05em", fontSize: 10 }}
                >
                  Date
                </Text>
              }
            />
          </Group>
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
              style={{
                background: "#E85D3D",
                borderColor: "#E85D3D",
                fontSize: 13,
              }}
            >
              Create Manual Alert
            </Button>
          </Group>
        </Group>
      </Box>

      <Box p={24}>
        {/* Tabs */}
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

        {/* Stats */}
        <SimpleGrid cols={4} spacing={16} mb={24}>
          {statCards.map((stat) => (
            <Card
              key={stat.label}
              p="lg"
              style={{ border: "1px solid #E5E5E5" }}
            >
              <Text
                c="#737373"
                fw={600}
                tt="uppercase"
                mb={4}
                style={{ fontSize: 11, letterSpacing: "0.5px" }}
              >
                {stat.label}
              </Text>
              <Text
                fw={700}
                c={stat.color ?? "#171717"}
                style={{ fontSize: 28 }}
              >
                {stat.value}
              </Text>
            </Card>
          ))}
        </SimpleGrid>

        {/* ========== Live Alerts Tab ========== */}
        {activeTab === "live" && (
          <Box style={{ display: "flex", gap: 24 }}>
            {/* Left: Alerts List */}
            <Box style={{ flex: 1, minWidth: 0 }}>
              {/* EWAS Pipeline Card */}
              <Card
                p={0}
                mb={24}
                style={{
                  border: "1px solid #2563EB",
                  background:
                    "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
                }}
              >
                <Box px={16} py={12} className="border-b border-[#2563EB30]">
                  <Group justify="space-between">
                    <Group gap={8}>
                      <IconDatabase size={16} color="#2563EB" />
                      <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                        EWAS Sudan Pipeline
                      </Text>
                      <Badge
                        size="xs"
                        style={{ background: "#D1FAE5", color: "#059669" }}
                      >
                        CONNECTED
                      </Badge>
                    </Group>
                    <Group gap={8}>
                      <Text size="xs" c="#737373">
                        Last sync: {pipelineStats ? "2 min ago" : "\u2014"}
                      </Text>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="blue"
                        leftSection={<IconRefresh size={12} />}
                        style={{ fontSize: 11 }}
                        onClick={() => {
                          void sourcesQuery.refetch();
                          void pipelineStatsQuery.refetch();
                        }}
                      >
                        Refresh
                      </Button>
                    </Group>
                  </Group>
                </Box>
                <Box p={16}>
                  <Group gap={12} mb={12}>
                    <Box>
                      <Text size="xs" c="#737373">
                        Sources
                      </Text>
                      <Text fw={700} c="#2563EB" style={{ fontSize: 20 }}>
                        {pipelineStats?.sources.total ?? sources.length}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="#737373">
                        Total Records
                      </Text>
                      <Text fw={700} c="#171717" style={{ fontSize: 20 }}>
                        {pipelineStats
                          ? formatNumber(pipelineStats.data.total_records)
                          : "\u2014"}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="#737373">
                        Status
                      </Text>
                      <Group gap={4}>
                        <IconPointFilled size={10} color="#059669" />
                        <Text fw={600} size="sm" c="#059669">
                          {sources.every((s) => s.is_active)
                            ? "All Online"
                            : `${sources.filter((s) => s.is_active).length} Online`}
                        </Text>
                      </Group>
                    </Box>
                  </Group>
                  <Group gap={8} wrap="wrap">
                    {sources.map((src) => (
                      <Text
                        key={src.id}
                        size="xs"
                        px={8}
                        py={4}
                        fw={500}
                        style={{
                          background: src.is_active ? "#2563EB15" : "#D9770615",
                          color: src.is_active ? "#2563EB" : "#D97706",
                          border: `1px solid ${src.is_active ? "#2563EB30" : "#D9770630"}`,
                        }}
                      >
                        {src.name}{" "}
                        {src.variable_count ? `(${src.variable_count})` : ""}
                      </Text>
                    ))}
                  </Group>
                </Box>
              </Card>

              {/* Active Alerts */}
              <Card
                p={0}
                style={{
                  border: "1px solid #E5E5E5",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Box
                  px={16}
                  py={12}
                  className="border-b border-[#E5E5E5]"
                  style={{ flexShrink: 0 }}
                >
                  <Group justify="space-between">
                    <Box>
                      <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                        Active Alerts ({alerts.length})
                      </Text>
                      <Text size="xs" c="#737373">
                        {selectedCountry}
                        {selectedRegion !== "All Regions"
                          ? ` — ${selectedRegion}`
                          : ""}{" "}
                        — sorted by severity
                      </Text>
                    </Box>
                    {alertsQuery.isLoading && <Loader size="xs" />}
                  </Group>
                </Box>
                <Box
                  style={{
                    maxHeight: "calc(100vh - 400px)",
                    overflowY: "auto",
                  }}
                >
                  {alerts.length === 0 && !alertsQuery.isLoading && (
                    <Box px={16} py={32} style={{ textAlign: "center" }}>
                      <Text c="#737373" size="sm">
                        No active alerts at this time.
                      </Text>
                    </Box>
                  )}
                  {alerts.map((alert) => {
                    const sev = mapSeverity(alert.severity);
                    const sevColor = severityColor(alert.severity);
                    const sevBg = severityBgColors[sev] ?? "#F5F5F5";
                    const location = alert.locations?.[0];
                    return (
                      <Link
                        key={alert.id}
                        href={`/crisis/${alert.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Box
                          px={16}
                          py={12}
                          className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                          style={{ display: "flex", gap: 12 }}
                        >
                          <Box
                            style={{
                              width: 4,
                              background: sevColor,
                              flexShrink: 0,
                            }}
                          />
                          <Box style={{ flex: 1 }}>
                            <Group justify="space-between" mb={4}>
                              <Group gap={8}>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  style={{
                                    background: sevBg,
                                    color: sevColor,
                                    fontWeight: 600,
                                  }}
                                >
                                  {severityLabels[sev]}
                                </Badge>
                                {alert.data_source && (
                                  <Text
                                    size="xs"
                                    px={6}
                                    py={2}
                                    style={{
                                      background: `${sevColor}15`,
                                      color: sevColor,
                                      fontSize: 10,
                                    }}
                                  >
                                    {alert.data_source.name}
                                  </Text>
                                )}
                              </Group>
                              <Text size="xs" c="#A3A3A3">
                                {formatTimeAgo(alert.updated_at)}
                              </Text>
                            </Group>
                            <Text fw={600} size="sm" c="#171717" mb={2}>
                              {alert.title}
                            </Text>
                            <Text size="xs" c="#737373" mb={8} lineClamp={1}>
                              {location ? `${location.name}` : ""}{" "}
                              {alert.shock_type
                                ? `\u2022 ${alert.shock_type.name}`
                                : ""}
                            </Text>
                            <Group gap={16}>
                              <Text size="xs" c="#737373">
                                <Text span size="xs" c="#737373">
                                  Severity:{" "}
                                </Text>
                                <Text span size="xs" fw={500} c="#171717">
                                  {alert.severity}/5
                                </Text>
                              </Text>
                              <Text size="xs" c="#737373">
                                <Text span size="xs" c="#737373">
                                  Shock date:{" "}
                                </Text>
                                <Text span size="xs" fw={500} c="#171717">
                                  {new Date(
                                    alert.shock_date,
                                  ).toLocaleDateString()}
                                </Text>
                              </Text>
                            </Group>
                          </Box>
                        </Box>
                      </Link>
                    );
                  })}
                </Box>
              </Card>
            </Box>

            {/* Right: Crisis Map */}
            <Box style={{ width: 360, flexShrink: 0 }}>
              <Card
                p={0}
                style={{
                  border: "1px solid #E5E5E5",
                  position: "sticky",
                  top: 24,
                }}
              >
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                    Crisis Map
                  </Text>
                </Box>
                <Box style={{ height: 400 }}>
                  <CrisisMap
                    markers={mapMarkers}
                    center={mapCenter}
                    zoom={mapZoom}
                    className="w-full h-full"
                  />
                </Box>
              </Card>
            </Box>
          </Box>
        )}

        {/* ========== Data Sources Tab ========== */}
        {activeTab === "sources" && (
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group justify="space-between">
                <Box>
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                    Connected Data Sources
                  </Text>
                  <Text size="xs" c="#737373">
                    {sources.length} sources feeding the detection engine
                  </Text>
                </Box>
                <Button size="xs" variant="outline" color="gray">
                  + Connect Source
                </Button>
              </Group>
            </Box>
            {sourcesQuery.isLoading ? (
              <Box p={32} style={{ textAlign: "center" }}>
                <Loader size="sm" />
              </Box>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr style={{ background: "#F5F5F5" }}>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Source
                    </Table.Th>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Type
                    </Table.Th>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Status
                    </Table.Th>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Frequency
                    </Table.Th>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Variables
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sources.map((src) => (
                    <Table.Tr key={src.id}>
                      <Table.Td>
                        <Box>
                          <Text fw={600} style={{ fontSize: 13 }}>
                            {src.name}
                          </Text>
                          {src.description && (
                            <Text size="xs" c="#737373" lineClamp={1}>
                              {src.description}
                            </Text>
                          )}
                        </Box>
                      </Table.Td>
                      <Table.Td>
                        <Text c="#525252" style={{ fontSize: 13 }}>
                          {src.type}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <IconPointFilled
                            size={10}
                            color={src.is_active ? "#059669" : "#D97706"}
                          />
                          <Text c="#525252" style={{ fontSize: 13 }}>
                            {src.is_active ? "Online" : "Offline"}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text c="#525252" style={{ fontSize: 13 }}>
                          {src.data_frequency}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text c="#525252" style={{ fontSize: 13 }}>
                          {src.variable_count ?? "—"}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        )}

        {/* ========== Alert Rules Tab ========== */}
        {activeTab === "rules" && (
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group justify="space-between">
                <Box>
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                    Automated Alert Rules (Detectors)
                  </Text>
                  <Text size="xs" c="#737373">
                    {frameworkStatsQuery.data?.stats?.detectors
                      ? `${frameworkStatsQuery.data.stats.detectors.active} active of ${frameworkStatsQuery.data.stats.detectors.total} total`
                      : "Configure automatic alert triggers"}
                  </Text>
                </Box>
                <Button
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  style={{
                    background: "#E85D3D",
                    borderColor: "#E85D3D",
                    fontSize: 13,
                  }}
                >
                  New Rule
                </Button>
              </Group>
            </Box>
            {detectorsQuery.isLoading ? (
              <Box p={32} style={{ textAlign: "center" }}>
                <Loader size="sm" />
              </Box>
            ) : (
              detectors.map((detector, i) => (
                <Box
                  key={detector.id}
                  px={16}
                  py={14}
                  className={
                    i < detectors.length - 1 ? "border-b border-[#E5E5E5]" : ""
                  }
                >
                  <Group justify="space-between">
                    <Box style={{ flex: 1 }}>
                      <Group gap={8} mb={4}>
                        <Text fw={600} size="sm" c="#171717">
                          {detector.name}
                        </Text>
                        <Badge
                          size="xs"
                          style={{ background: "#EFF6FF", color: "#2563EB" }}
                        >
                          {detector.detection_count} detections
                        </Badge>
                        <Badge size="xs" variant="light" c="#737373">
                          {detector.run_count} runs
                        </Badge>
                      </Group>
                      <Text size="xs" c="#737373">
                        {detector.description ?? detector.class_name}
                      </Text>
                      {detector.last_run && (
                        <Text size="xs" c="#A3A3A3" mt={2}>
                          Last run: {formatTimeAgo(detector.last_run)}
                        </Text>
                      )}
                    </Box>
                    <Switch
                      checked={ruleStates[detector.name] ?? detector.active}
                      onChange={() =>
                        setRuleStates((prev) => ({
                          ...prev,
                          [detector.name]: !(
                            prev[detector.name] ?? detector.active
                          ),
                        }))
                      }
                      color="#E85D3D"
                      size="sm"
                    />
                  </Group>
                </Box>
              ))
            )}
          </Card>
        )}

        {/* ========== History Tab ========== */}
        {activeTab === "history" && (
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Box>
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Alert History
                </Text>
                <Text size="xs" c="#737373">
                  {historyQuery.data
                    ? `${historyQuery.data.total ?? historyQuery.data.count} total alerts`
                    : "Past alerts"}
                </Text>
              </Box>
            </Box>
            {historyQuery.isLoading ? (
              <Box p={32} style={{ textAlign: "center" }}>
                <Loader size="sm" />
              </Box>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr style={{ background: "#F5F5F5" }}>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Alert
                    </Table.Th>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Severity
                    </Table.Th>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Type
                    </Table.Th>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Date
                    </Table.Th>
                    <Table.Th
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#737373",
                        fontWeight: 600,
                      }}
                    >
                      Location
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {historyAlerts.map((alert) => {
                    const sev = mapSeverity(alert.severity);
                    const sevColor = severityColor(alert.severity);
                    const sevBg = severityBgColors[sev] ?? "#F5F5F5";
                    return (
                      <Table.Tr key={alert.id}>
                        <Table.Td>
                          <Link
                            href={`/crisis/${alert.id}`}
                            style={{ textDecoration: "none" }}
                          >
                            <Text
                              fw={600}
                              style={{ fontSize: 13, color: "#171717" }}
                            >
                              {alert.title}
                            </Text>
                          </Link>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="xs"
                            style={{ background: sevBg, color: sevColor }}
                          >
                            {severityLabels[sev]}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text c="#525252" style={{ fontSize: 13 }}>
                            {alert.shock_type?.name ?? "—"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="#525252" style={{ fontSize: 13 }}>
                            {new Date(alert.shock_date).toLocaleDateString()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="#525252" style={{ fontSize: 13 }}>
                            {alert.locations?.[0]?.name ?? "—"}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        )}
      </Box>
    </Box>
  );
}
