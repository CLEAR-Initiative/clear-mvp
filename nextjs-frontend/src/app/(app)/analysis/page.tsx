"use client";

import { useState, useMemo } from "react";
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
  Progress,
  Loader,
  Select,
} from "@mantine/core";
import {
  IconDownload,
  IconChartPie,
  IconAlertTriangle,
  IconClock,
  IconCircleCheck,
  IconPointFilled,
  IconShield,
  IconDroplet,
  IconHome,
  IconHeart,
  IconToolsKitchen2,
  IconUsers,
  IconSparkles,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { SITUATION_ANALYSIS_SYSTEM_PROMPT } from "~/lib/prompts";
import { mapSeverity } from "~/lib/types/django";

const situationReports = [
  {
    title: "Cholera Outbreak Analysis",
    meta: "Somali Region \u2022 Critical severity",
    severity: "Critical",
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    markerColor: "#DC2626",
    description: "Detailed epidemiological analysis with 72-hour projection. Recommends immediate WASH intervention.",
  },
  {
    title: "Flood Risk Assessment",
    meta: "Oromia Region \u2022 High severity",
    severity: "High",
    severityColor: "#F59E0B",
    severityBg: "#FEF3C7",
    markerColor: "#F59E0B",
    description: "Weather pattern analysis indicates elevated flooding risk. Pre-positioning recommended.",
  },
  {
    title: "Drought Monitoring Update",
    meta: "Afar Region \u2022 Medium severity",
    severity: "Medium",
    severityColor: "#D97706",
    severityBg: "#FEF3C7",
    markerColor: "#D97706",
    description: "Long-term drought indicators show gradual deterioration. Early action window available.",
  },
];

const scenarios = [
  {
    name: "Best Case",
    sub: "Rapid containment scenario",
    likelihood: "25% likely",
    likelihoodBg: "#D1FAE5",
    likelihoodColor: "#059669",
    description: "Early intervention with full WASH coverage achieves containment within 2 weeks. Estimated affected: 2,400 people.",
    highlighted: false,
  },
  {
    name: "Most Likely",
    sub: "Moderate spread scenario",
    likelihood: "55% likely",
    likelihoodBg: "#DBEAFE",
    likelihoodColor: "#2563EB",
    description: "Partial containment with ongoing transmission in 3 woredas. Peak in 3-4 weeks. Estimated affected: 8,500 people.",
    highlighted: true,
  },
  {
    name: "Worst Case",
    sub: "Regional spread scenario",
    likelihood: "20% likely",
    likelihoodBg: "#FEE2E2",
    likelihoodColor: "#DC2626",
    description: "Widespread transmission across 8+ woredas with health system strain. Estimated affected: 24,000+ people.",
    highlighted: false,
  },
];

const insights = [
  {
    type: "Critical Pattern",
    typeColor: "#DC2626",
    icon: IconAlertTriangle,
    title: "Water Source Clustering",
    description: "87% of cases within 500m of 3 water points. Immediate testing and treatment recommended.",
    borderColor: "#DC2626",
  },
  {
    type: "Time Sensitive",
    typeColor: "#F59E0B",
    icon: IconClock,
    title: "Peak Timing Prediction",
    description: "Historical patterns suggest peak transmission 14-21 days from outbreak start. Current: Day 8.",
    borderColor: "#F59E0B",
  },
  {
    type: "Opportunity",
    typeColor: "#059669",
    icon: IconCircleCheck,
    title: "Resource Optimization",
    description: "ORS supplies in Dire Dawa can reach affected areas within 6 hours. Pre-positioning available.",
    borderColor: "#059669",
  },
];

const dataQuality = [
  { source: "MOH PHEM Data", completeness: 94, timeliness: "Real-time", timelinessColor: "#059669", confidence: "High", confidenceColor: "#059669", lastUpdate: "3 min ago" },
  { source: "WHO EWARN", completeness: 88, timeliness: "Hourly", timelinessColor: "#059669", confidence: "High", confidenceColor: "#059669", lastUpdate: "1h ago" },
  { source: "Field Reports", completeness: 76, timeliness: "Daily", timelinessColor: "#D97706", confidence: "Medium", confidenceColor: "#D97706", lastUpdate: "4h ago" },
  { source: "Satellite Imagery", completeness: 92, timeliness: "6h cycle", timelinessColor: "#059669", confidence: "High", confidenceColor: "#059669", lastUpdate: "2h ago" },
];

// New: Current Situation data
const currentSituation = [
  "Active cholera outbreak in Jijiga and Kebridehar zones with 847 confirmed cases",
  "WASH infrastructure severely compromised in 3 woredas affecting 45,000 people",
  "Health facilities operating at 140% capacity in affected areas",
  "Displacement of 12,500 people due to combined flooding and disease outbreak",
  "Food insecurity affecting 68% of households in cholera-affected zones",
];

// New: Population Impact data
const populationImpact = {
  households: 8750,
  totalDisplaced: 12500,
  children: 4800,
  women: 3200,
  elderly: 1100,
  infrastructureStress: "Health facilities at 140% capacity in 3 woredas",
  hostCapacity: "Host communities absorbing displaced beyond sustainable limits",
};

// New: Impact Assessment data
const impactAssessment = [
  { sector: "Shelter", icon: IconHome, severity: "critical" as const, severityColor: "#DC2626", severityBg: "#FEE2E2", number: 12500, unit: "people", description: "45% of shelters damaged or destroyed in flood-affected areas" },
  { sector: "WASH", icon: IconDroplet, severity: "critical" as const, severityColor: "#DC2626", severityBg: "#FEE2E2", number: 45000, unit: "people", description: "3 water treatment facilities non-functional, contamination detected" },
  { sector: "Protection", icon: IconShield, severity: "high" as const, severityColor: "#F59E0B", severityBg: "#FEF3C7", number: 8200, unit: "people", description: "GBV risks elevated, child protection concerns in displacement sites" },
  { sector: "Health", icon: IconHeart, severity: "critical" as const, severityColor: "#DC2626", severityBg: "#FEE2E2", number: 847, unit: "cases", description: "Cholera outbreak with Case Fatality Rate of 2.1%, above emergency threshold" },
  { sector: "Food Security", icon: IconToolsKitchen2, severity: "high" as const, severityColor: "#F59E0B", severityBg: "#FEF3C7", number: 32000, unit: "people", description: "IPC Phase 3+ food insecurity in 5 woredas, market disruption ongoing" },
];

// New: Environmental factors
const environmentalFactors = {
  floodRisk: "GloFAS indicates 75% probability of above-normal river levels in next 14 days",
  rainfallForecast: "150-200mm expected in Somali Region over next week, 40% above seasonal average",
  secondaryRisk: "Waterborne disease outbreak risk HIGH due to flood contamination of water sources",
};

// New: Protection concerns
const protectionConcerns = [
  "Increased GBV risks in overcrowded displacement sites, particularly for women and girls",
  "Separated and unaccompanied children identified in 3 displacement sites",
  "Barriers to accessing services for persons with disabilities in temporary shelters",
  "Documentation loss affecting access to basic services for displaced populations",
];

// New: Secondary effects
const secondaryEffects = [
  "Market disruption causing 28% food price increase in affected areas",
  "School closures affecting 15,000 children across 23 schools",
  "Livestock losses estimated at $2.3M impacting pastoral livelihoods",
  "Transport route disruptions delaying humanitarian supply chains by 48-72 hours",
  "Mental health impacts reported in 60% of displaced households",
  "Agricultural season disruption threatening next harvest in 4 woredas",
];

/* ========== Country / Region configuration ========== */
const countryRegions: Record<string, string[]> = {
  Sudan: ["All Regions", "Khartoum", "North Darfur", "South Darfur", "West Darfur", "Central Darfur", "Blue Nile", "Red Sea", "Kassala"],
  Ethiopia: ["All Regions", "Somali", "Oromia", "Afar", "Amhara", "Tigray", "SNNPR"],
  "South Sudan": ["All Regions", "Central Equatoria", "Jonglei", "Unity", "Upper Nile", "Lakes"],
  Somalia: ["All Regions", "Banadir", "Bay", "Gedo", "Lower Juba", "Middle Shabelle"],
  Yemen: ["All Regions", "Sana'a", "Aden", "Taiz", "Hodeidah", "Marib"],
};
const countries = Object.keys(countryRegions).sort();
const dateOptions = ["Feb 2026", "Jan 2026", "Dec 2025", "Nov 2025", "Last 7 days", "Last 30 days", "Last 90 days"];

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<string | null>("reports");
  const [generatedAnalysis, setGeneratedAnalysis] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState("Feb 2026");

  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true });
  const statsQuery = api.alerts.getStats.useQuery();
  const llmMutation = api.llm.query.useMutation();

  const allAlerts = alertsQuery.data?.alerts ?? [];
  const overview = statsQuery.data?.stats?.overview;

  // Derive real situation items from alerts
  const realSituationItems = useMemo(() => {
    if (allAlerts.length === 0) return null;
    return allAlerts.slice(0, 5).map((a) => {
      const loc = a.locations?.[0]?.name ?? "Unknown";
      const sev = mapSeverity(a.severity);
      return `${a.title} — ${loc} (${sev} severity)${a.text ? `: ${a.text.slice(0, 120)}` : ""}`;
    });
  }, [allAlerts]);

  // Summary stats from real data
  const summaryStats = useMemo(() => {
    const critical = allAlerts.filter((a) => a.severity >= 4).length;
    const total = allAlerts.length;
    const types = [...new Set(allAlerts.map((a) => a.shock_type?.name).filter(Boolean))];
    return { critical, total, types };
  }, [allAlerts]);

  const handleGenerateAnalysis = () => {
    if (allAlerts.length === 0) return;
    const alertContext = allAlerts.map((a) => `- ${a.title} (severity ${a.severity}/5): ${a.text?.slice(0, 150) ?? ""}`).join("\n");
    llmMutation.mutate(
      {
        prompt: `Analyze the following active humanitarian alerts and generate a comprehensive situation analysis:\n\n${alertContext}\n\nProvide:\n1. Executive summary\n2. Key findings\n3. Priority recommendations\n4. Risk assessment`,
        system: SITUATION_ANALYSIS_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 1000,
      },
      {
        onSuccess: (data) => setGeneratedAnalysis(data.response),
      },
    );
  };

  return (
    <Box>
      {/* Header — matches wireframe: breadcrumbs, title, then filters + buttons in one row */}
      <Box px={24} py={12} className="border-b border-[#E5E5E5]" style={{ background: "#FFFFFF" }}>
        {/* Breadcrumbs */}
        <Group gap={4} mb={8}>
          <Text size="xs" c="#E85D3D" fw={600} style={{ cursor: "pointer" }}>CLEAR</Text>
          <Text size="xs" c="#A3A3A3">&gt;</Text>
          <Text size="xs" c="#525252" fw={500}>Analysis</Text>
        </Group>

        {/* Title row */}
        <Group gap={12} mb={12}>
          <Text fw={700} c="#171717" style={{ fontSize: 20 }}>AI-Powered Analysis</Text>
          {alertsQuery.isLoading && <Loader size={14} />}
        </Group>

        {/* Filters + Action buttons row */}
        <Group justify="space-between">
          <Group gap={12}>
            <Select
              size="xs"
              value={selectedCountry}
              onChange={(v) => { setSelectedCountry(v ?? "Sudan"); setSelectedRegion("All Regions"); }}
              data={countries}
              style={{ minWidth: 130 }}
              styles={{ input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5" } }}
              label={<Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Country</Text>}
            />
            <Select
              size="xs"
              value={selectedRegion}
              onChange={(v) => setSelectedRegion(v ?? "All Regions")}
              data={countryRegions[selectedCountry] ?? ["All Regions"]}
              style={{ minWidth: 130 }}
              styles={{ input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5" } }}
              label={<Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Region</Text>}
            />
            <Select
              size="xs"
              value={selectedDate}
              onChange={(v) => setSelectedDate(v ?? "Feb 2026")}
              data={dateOptions}
              style={{ minWidth: 120 }}
              styles={{ input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5" } }}
              label={<Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Date</Text>}
            />
          </Group>
          <Group gap={8}>
            <Button variant="outline" color="gray" size="xs" leftSection={<IconDownload size={14} />} style={{ fontSize: 13 }}>
              Export Report
            </Button>
            <Button
              size="xs"
              leftSection={llmMutation.isPending ? <Loader size={12} color="white" /> : <IconSparkles size={14} />}
              style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
              onClick={handleGenerateAnalysis}
              disabled={llmMutation.isPending}
            >
              {llmMutation.isPending ? "Generating..." : "Generate Analysis"}
            </Button>
          </Group>
        </Group>
      </Box>

      <Box p={24}>
        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab} mb={24} styles={{ tab: { fontSize: 13, fontWeight: 500 } }}>
          <Tabs.List>
            <Tabs.Tab value="reports">Situation Reports</Tabs.Tab>
            <Tabs.Tab value="scenarios">Scenario Planning</Tabs.Tab>
            <Tabs.Tab value="impact">Impact Assessment</Tabs.Tab>
            <Tabs.Tab value="insights">AI Insights</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Executive Summary Banner */}
        <Card p="lg" mb={24} style={{ border: "1px solid #2563EB", background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)" }}>
          <Group align="flex-start" gap={16}>
            <Box
              style={{
                width: 48, height: 48, background: "#2563EB",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <IconChartPie size={24} color="white" />
            </Box>
            <Box style={{ flex: 1 }}>
              <Group gap={8} mb={4}>
                <Text size="xs" fw={600} c="#2563EB" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                  Latest AI Analysis
                </Text>
                {summaryStats.critical > 0 && (
                  <Badge size="xs" style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FCA5A5" }}>
                    {summaryStats.critical} Critical
                  </Badge>
                )}
                {summaryStats.total > 0 && (
                  <Badge size="xs" style={{ background: "#DC2626", color: "white" }}>
                    {summaryStats.total} Active
                  </Badge>
                )}
              </Group>
              <Text fw={600} c="#171717" mb={8}>
                {allAlerts.length > 0
                  ? `Situation Report — ${selectedCountry}`
                  : `Cholera Outbreak Situation Report - ${selectedCountry}`}
              </Text>

              <Group gap={24} mb={12}>
                <Box style={{ textAlign: "center" }}>
                  <Text size="xl" fw={700} c="#DC2626">{overview?.active_alerts ?? "—"}</Text>
                  <Text size="xs" c="#737373" tt="uppercase">Active Alerts</Text>
                </Box>
                <Box style={{ textAlign: "center" }}>
                  <Text size="xl" fw={700} c="#171717">{overview?.total_alerts ?? "—"}</Text>
                  <Text size="xs" c="#737373" tt="uppercase">Total Alerts</Text>
                </Box>
                <Box style={{ textAlign: "center" }}>
                  <Text size="xl" fw={700} c="#DC2626">
                    {overview?.recent_7_days != null ? `${overview.recent_7_days} / 7d` : "\u2191 23%"}
                  </Text>
                  <Text size="xs" c="#737373" tt="uppercase">Trend</Text>
                </Box>
              </Group>

              <Group gap={6} mb={12}>
                {(summaryStats.types.length > 0 ? summaryStats.types : ["WASH", "Health", "Shelter", "Food Security", "Protection"]).map((s) => (
                  <Text key={s} size="xs" px={8} py={2} style={{ background: "white", border: "1px solid #E5E5E5", color: "#525252" }}>
                    {s}
                  </Text>
                ))}
              </Group>

              <Group gap={8}>
                <Button size="xs" color="blue">View Full Report</Button>
                <Button size="xs" variant="outline" color="gray">Download PDF</Button>
              </Group>
            </Box>
            <Box style={{ textAlign: "right" }}>
              <Text size="xs" c="#A3A3A3">
                {alertsQuery.dataUpdatedAt
                  ? `Updated ${new Date(alertsQuery.dataUpdatedAt).toLocaleTimeString()}`
                  : "Updated 30 min ago"}
              </Text>
              <Text size="xs" c="#A3A3A3" mt={4}>Confidence: 94%</Text>
            </Box>
          </Group>
        </Card>

        {/* LLM Generated Analysis */}
        {(generatedAnalysis ?? llmMutation.isPending) && (
          <Card p="lg" mb={24} style={{ border: "1px solid #7C3AED", background: "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)" }}>
            <Group gap={8} mb={12}>
              <IconSparkles size={16} color="#7C3AED" />
              <Text size="xs" fw={600} c="#7C3AED" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                AI-Generated Analysis
              </Text>
              {llmMutation.data && (
                <Badge size="xs" variant="light" color="violet">
                  {llmMutation.data.provider} • {llmMutation.data.response_time_ms}ms
                </Badge>
              )}
            </Group>
            {llmMutation.isPending ? (
              <Group gap={8}>
                <Loader size={16} />
                <Text size="sm" c="#737373">Generating comprehensive analysis from {allAlerts.length} active alerts...</Text>
              </Group>
            ) : generatedAnalysis ? (
              <Text size="sm" c="#525252" lh={1.65} style={{ fontSize: 13, whiteSpace: "pre-line" }}>
                {generatedAnalysis}
              </Text>
            ) : null}
            {llmMutation.isError && (
              <Text size="xs" c="#DC2626" mt={4}>Failed to generate analysis. Please try again.</Text>
            )}
          </Card>
        )}

        {/* ========== Situation Reports Tab ========== */}
        {activeTab === "reports" && (
          <SimpleGrid cols={2} spacing={16} mb={24}>
            {/* Current Situation */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Group justify="space-between">
                  <Box>
                    <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Current Situation</Text>
                    <Text size="xs" c="#737373">{selectedCountry}{selectedRegion !== "All Regions" ? ` - ${selectedRegion}` : ""}</Text>
                  </Box>
                  {summaryStats.critical > 0 ? (
                    <Badge size="xs" style={{ background: "#FEE2E2", color: "#DC2626" }}>{summaryStats.critical} Critical</Badge>
                  ) : (
                    <Badge size="xs" style={{ background: "#FEE2E2", color: "#DC2626" }}>Active Outbreak</Badge>
                  )}
                </Group>
              </Box>
              <Box p={16}>
                {(realSituationItems ?? currentSituation).map((item, idx) => (
                  <Group key={idx} gap={8} mb={8} align="flex-start" wrap="nowrap">
                    <Box style={{ width: 6, height: 6, background: "#DC2626", marginTop: 6, flexShrink: 0 }} />
                    <Text size="sm" c="#525252" style={{ lineHeight: 1.5 }}>{item}</Text>
                  </Group>
                ))}
              </Box>
            </Card>

            {/* Population Impact */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Population Impact</Text>
                <Text size="xs" c="#737373">Affected demographics</Text>
              </Box>
              <Box p={16}>
                <SimpleGrid cols={2} spacing={12} mb={16}>
                  <Box p={12} style={{ background: "#FEE2E2", borderLeft: "3px solid #DC2626", textAlign: "center" }}>
                    <Text size="xl" fw={700} c="#DC2626">{populationImpact.households.toLocaleString()}</Text>
                    <Text size="xs" c="#737373" tt="uppercase">Households Affected</Text>
                  </Box>
                  <Box p={12} style={{ background: "#FEF3C7", borderLeft: "3px solid #F59E0B", textAlign: "center" }}>
                    <Text size="xl" fw={700} c="#D97706">{populationImpact.totalDisplaced.toLocaleString()}</Text>
                    <Text size="xs" c="#737373" tt="uppercase">Total Displaced</Text>
                  </Box>
                </SimpleGrid>

                <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={8} style={{ letterSpacing: "0.5px" }}>Vulnerable Groups</Text>
                <SimpleGrid cols={3} spacing={8} mb={16}>
                  {[
                    { label: "Children", value: populationImpact.children },
                    { label: "Women", value: populationImpact.women },
                    { label: "Elderly", value: populationImpact.elderly },
                  ].map((g) => (
                    <Box key={g.label} p={8} style={{ background: "#F5F5F5", textAlign: "center" }}>
                      <Text size="lg" fw={700} c="#171717">{g.value.toLocaleString()}</Text>
                      <Text size="xs" c="#737373">{g.label}</Text>
                    </Box>
                  ))}
                </SimpleGrid>

                <Group gap={8} mb={8}>
                  <IconAlertTriangle size={14} color="#D97706" />
                  <Text size="xs" c="#D97706">{populationImpact.infrastructureStress}</Text>
                </Group>
                <Group gap={8}>
                  <IconUsers size={14} color="#DC2626" />
                  <Text size="xs" c="#DC2626">{populationImpact.hostCapacity}</Text>
                </Group>
              </Box>
            </Card>

            {/* Situation Reports */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Group justify="space-between">
                  <Box>
                    <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Situation Reports</Text>
                    <Text size="xs" c="#737373">AI-generated assessments</Text>
                  </Box>
                  <Button size="xs" variant="outline" color="gray">View All</Button>
                </Group>
              </Box>
              <Box p={16} pl={24} style={{ position: "relative" }}>
                {/* Vertical timeline line */}
                <Box style={{ position: "absolute", left: 22, top: 16, bottom: 16, width: 2, background: "#E5E5E5" }} />
                {situationReports.map((report) => (
                  <Box key={report.title} mb={16} style={{ display: "flex", gap: 12, position: "relative" }}>
                    <Box style={{ width: 10, height: 10, background: report.markerColor, marginTop: 4, flexShrink: 0, borderRadius: "50%", position: "relative", zIndex: 1 }} />
                    <Box style={{ flex: 1 }}>
                      <Group justify="space-between" mb={4}>
                        <Box>
                          <Text fw={600} c="#171717" style={{ fontSize: 14 }}>{report.title}</Text>
                          <Text size="xs" c="#737373">{report.meta}</Text>
                        </Box>
                        <Badge size="xs" style={{ background: report.severityBg, color: report.severityColor }}>{report.severity}</Badge>
                      </Group>
                      <Text size="xs" c="#525252" mt={8}>{report.description}</Text>
                      <Text size="xs" c="#2563EB" mt={8} style={{ cursor: "pointer" }}>Read full report →</Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Card>

            {/* Scenario Planning */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Group justify="space-between">
                  <Box>
                    <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Scenario Planning</Text>
                    <Text size="xs" c="#737373">Projection models</Text>
                  </Box>
                  <Button size="xs" variant="outline" color="gray">+ New Scenario</Button>
                </Group>
              </Box>
              <Box p={16}>
                {scenarios.map((scenario) => (
                  <Box
                    key={scenario.name}
                    p={16}
                    mb={12}
                    style={{
                      background: "#F9FAFB",
                      borderLeft: scenario.highlighted ? "3px solid #2563EB" : undefined,
                    }}
                  >
                    <Group justify="space-between" mb={12}>
                      <Box>
                        <Text fw={600} c="#171717">{scenario.name}</Text>
                        <Text size="xs" c="#525252">{scenario.sub}</Text>
                      </Box>
                      <Text size="xs" px={8} py={2} style={{ background: scenario.likelihoodBg, color: scenario.likelihoodColor }}>
                        {scenario.likelihood}
                      </Text>
                    </Group>
                    <Text size="sm" c="#525252" style={{ lineHeight: 1.5 }}>{scenario.description}</Text>
                  </Box>
                ))}
              </Box>
            </Card>
          </SimpleGrid>
        )}

        {/* ========== Scenario Planning Tab ========== */}
        {activeTab === "scenarios" && (
          <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Scenario Comparison</Text>
              <Text size="xs" c="#737373">Compare projected outcomes</Text>
            </Box>
            <Box p={16}>
              <SimpleGrid cols={3} spacing={16}>
                {scenarios.map((scenario) => (
                  <Box
                    key={scenario.name}
                    p={20}
                    style={{
                      border: `1px solid ${scenario.likelihoodColor}20`,
                      background: `${scenario.likelihoodBg}40`,
                    }}
                  >
                    <Text size="xl" fw={700} c={scenario.likelihoodColor} mb={8}>{scenario.likelihood.replace(" likely", "")}</Text>
                    <Text fw={600} c="#171717">{scenario.name}</Text>
                    <Text size="xs" c="#525252" mb={12}>{scenario.sub}</Text>
                    <Text size="sm" c="#525252" style={{ lineHeight: 1.5 }}>{scenario.description}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          </Card>
        )}

        {/* ========== Impact Assessment Tab (NEW) ========== */}
        {activeTab === "impact" && (
          <Box>
            {/* Sector Impact Table */}
            <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Sector Impact Assessment</Text>
                <Text size="xs" c="#737373">Humanitarian needs by sector</Text>
              </Box>
              <Table>
                <Table.Thead>
                  <Table.Tr style={{ background: "#F5F5F5" }}>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Sector</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Severity</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Affected</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Details</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {impactAssessment.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Table.Tr key={item.sector}>
                        <Table.Td>
                          <Group gap={8}>
                            <Box style={{ width: 32, height: 32, background: item.severityBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon size={16} color={item.severityColor} />
                            </Box>
                            <Text fw={600} style={{ fontSize: 13 }}>{item.sector}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" style={{ background: item.severityBg, color: item.severityColor, border: `1px solid ${item.severityColor}30`, textTransform: "uppercase" }}>
                            {item.severity}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={700} c={item.severityColor} style={{ fontSize: 13 }}>
                            {item.number.toLocaleString()} {item.unit}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="#525252" style={{ fontSize: 13 }}>{item.description}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Card>

            <SimpleGrid cols={2} spacing={16} mb={24}>
              {/* Environmental Factors */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Environmental Factors</Text>
                  <Text size="xs" c="#737373">Climate and environmental risks</Text>
                </Box>
                <Box p={16} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Box p={12} style={{ background: "#FEF3C7", borderLeft: "3px solid #F59E0B" }}>
                    <Text size="xs" fw={700} c="#92400E" tt="uppercase" mb={4}>Flood Risk</Text>
                    <Text size="sm" c="#525252">{environmentalFactors.floodRisk}</Text>
                  </Box>
                  <Box p={12} style={{ background: "#DBEAFE", borderLeft: "3px solid #3B82F6" }}>
                    <Text size="xs" fw={700} c="#1E40AF" tt="uppercase" mb={4}>Rainfall Forecast</Text>
                    <Text size="sm" c="#525252">{environmentalFactors.rainfallForecast}</Text>
                  </Box>
                  <Box p={12} style={{ background: "#FEE2E2", borderLeft: "3px solid #DC2626" }}>
                    <Text size="xs" fw={700} c="#991B1B" tt="uppercase" mb={4}>Secondary Risk</Text>
                    <Text size="sm" c="#525252">{environmentalFactors.secondaryRisk}</Text>
                  </Box>
                </Box>
              </Card>

              {/* Protection Concerns */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Protection Concerns</Text>
                  <Text size="xs" c="#737373">Identified vulnerabilities</Text>
                </Box>
                <Box p={16} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {protectionConcerns.map((concern, idx) => (
                    <Group key={idx} gap={8} p={8} align="flex-start" wrap="nowrap" style={{ background: "#F5F3FF", borderLeft: "3px solid #7C3AED" }}>
                      <IconShield size={16} color="#7C3AED" style={{ marginTop: 2, flexShrink: 0 }} />
                      <Text size="sm" c="#525252" style={{ lineHeight: 1.5 }}>{concern}</Text>
                    </Group>
                  ))}
                </Box>
              </Card>
            </SimpleGrid>

            {/* Secondary Effects */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Secondary Effects</Text>
                <Text size="xs" c="#737373">Anticipated cascading impacts</Text>
              </Box>
              <Box p={16}>
                <SimpleGrid cols={3} spacing={12}>
                  {secondaryEffects.map((effect, idx) => (
                    <Box key={idx} p={12} style={{ background: "#F5F5F5", border: "1px solid #E5E5E5" }}>
                      <Group gap={8} align="flex-start" wrap="nowrap">
                        <IconAlertTriangle size={16} color="#F59E0B" style={{ marginTop: 2, flexShrink: 0 }} />
                        <Text size="sm" c="#525252" style={{ lineHeight: 1.5 }}>{effect}</Text>
                      </Group>
                    </Box>
                  ))}
                </SimpleGrid>
              </Box>
            </Card>
          </Box>
        )}

        {/* ========== AI Insights Tab ========== */}
        {activeTab === "insights" && (
          <Box>
            {/* AI Insights */}
            <Card p={0} mb={24} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Group justify="space-between">
                  <Box>
                    <Text fw={600} c="#171717" style={{ fontSize: 14 }}>AI-Generated Insights</Text>
                    <Text size="xs" c="#737373">Pattern detection and recommendations</Text>
                  </Box>
                  <Group gap={8}>
                    <Button size="xs" variant="outline" color="gray">Epidemiological</Button>
                    <Button size="xs" variant="light" color="blue">All Types</Button>
                    <Button size="xs" variant="outline" color="gray">Logistics</Button>
                  </Group>
                </Group>
              </Box>
              <Box p={16}>
                <SimpleGrid cols={3} spacing={16}>
                  {insights.map((insight) => {
                    const Icon = insight.icon;
                    return (
                      <Box key={insight.title} p={16} style={{ background: "#F9FAFB", borderLeft: `3px solid ${insight.borderColor}` }}>
                        <Group gap={8} mb={8}>
                          <Icon size={16} color={insight.typeColor} />
                          <Text size="xs" fw={600} c={insight.typeColor} tt="uppercase">{insight.type}</Text>
                        </Group>
                        <Text fw={600} c="#171717" mb={8}>{insight.title}</Text>
                        <Text size="sm" c="#525252" style={{ lineHeight: 1.5 }}>{insight.description}</Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Box>
            </Card>

            {/* Data Quality Table */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Analysis Data Quality</Text>
                <Text size="xs" c="#737373">Source reliability metrics</Text>
              </Box>
              <Table>
                <Table.Thead>
                  <Table.Tr style={{ background: "#F5F5F5" }}>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Data Source</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Completeness</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Timeliness</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Confidence</Table.Th>
                    <Table.Th style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#737373", fontWeight: 600 }}>Last Update</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {dataQuality.map((row) => (
                    <Table.Tr key={row.source}>
                      <Table.Td><Text fw={600} style={{ fontSize: 13 }}>{row.source}</Text></Table.Td>
                      <Table.Td>
                        <Group gap={8}>
                          <Progress value={row.completeness} size={4} color={row.completeness >= 80 ? "green" : "yellow"} style={{ flex: 1 }} />
                          <Text c="#525252" style={{ fontSize: 13 }}>{row.completeness}%</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <IconPointFilled size={10} color={row.timelinessColor} />
                          <Text c="#525252" style={{ fontSize: 13 }}>{row.timeliness}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500} c={row.confidenceColor} style={{ fontSize: 13 }}>{row.confidence}</Text>
                      </Table.Td>
                      <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{row.lastUpdate}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
}
