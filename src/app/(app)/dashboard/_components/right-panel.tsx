"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Box,
  Text,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import {
  IconBolt,
  IconDatabase,
  IconRefresh,
  IconGlobe,
  IconMapPin,
  IconChevronDown,
  IconFileText,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import { CollapsibleSection } from "~/components/ui/collapsible-section";
import {
  nrcLocations,
  nrcStatistics,
  regionColors,
  getOperationalLocations,
  getCrisisPins,
  CRISIS_COUNTRIES,
  type NRCRegion,
  nrcOperationDescriptions,
} from "~/lib/data/nrc-locations";

/* ========== Helpers ========== */

function getCountriesByRegion(): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  getOperationalLocations().forEach((loc) => {
    if (!grouped[loc.region]) grouped[loc.region] = [];
    if (!grouped[loc.region].includes(loc.country)) grouped[loc.region].push(loc.country);
  });
  return grouped;
}

const countriesByRegion = getCountriesByRegion();

/* ========== Activity Items (static) ========== */

// TODO(demo): hardcoded — replace with real activity feed from API
const recentActivity = [
  { time: "15 min ago", title: "Alert acknowledged", description: "Cholera outbreak alert reviewed by Dr. Melese A.", type: "alert" },
  { time: "42 min ago", title: "Team check-in", description: "WASH Team Alpha reported safe arrival in Jijiga", type: "team" },
  { time: "1h ago", title: "Resource request", description: "Emergency IV fluid request submitted for Somali Region", type: "resource" },
  { time: "2h ago", title: "Analysis generated", description: "AI situation analysis updated for cholera outbreak", type: "analysis" },
  { time: "3h ago", title: "Distribution complete", description: "Cash assistance distributed to 1,247 households in Dire Dawa", type: "cash" },
];

const activityDotColors: Record<string, string> = {
  alert: "#DC2626",
  team: "#059669",
  resource: "#D97706",
  analysis: "#7C3AED",
  cash: "#E85D3D",
};

/* ========== Mock EWAS data ========== */

// TODO(demo): fallback values shown when the live pipeline API is unavailable
const mockEWASSourcesOnline = 12;
const mockEWASCriticalAlerts = 5;

/* ========== Props ========== */

interface RightPanelProps {
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  onViewChange: (view: string) => void;
  activeView: string;
  pipelineStats:
    | { overall: { total_sources: number; total_data_records: number } }
    | undefined;
}

/* ========== Component ========== */

export function RightPanel({
  selectedCountry,
  onCountryChange,
  onViewChange,
  activeView,
  pipelineStats,
}: RightPanelProps) {
  const [expandedNRCRegion, setExpandedNRCRegion] = useState<string | null>(null);

  const hasCrisisData = CRISIS_COUNTRIES.has(selectedCountry);
  const currentNRCLocation = nrcLocations.find((l) => l.country === selectedCountry);
  const currentCrisisPins = hasCrisisData ? getCrisisPins(selectedCountry) : [];
  const crisisPins = currentCrisisPins.filter((p) => p.severity !== "response");
  const teamPins = currentCrisisPins.filter((p) => p.severity === "response");

  const regionColor = currentNRCLocation
    ? (regionColors[currentNRCLocation.region as NRCRegion] ?? "#718096")
    : "#718096";

  return (
    <Box
      component="aside"
      className="bg-white sm:border-l border-t sm:border-t-0 border-[#E5E5E5] overflow-y-auto flex flex-col flex-shrink-0 sm:w-[380px] sm:min-h-0 sm:h-full"
    >
      {/* Panel Header */}
      <Box px={24} py={24} className="border-b border-[#E5E5E5] bg-[#F9FAFB]">
        <Group justify="space-between" align="flex-start" mb={4}>
          <Text fw={700} style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
            {selectedCountry}
          </Text>
          {hasCrisisData ? (
            <Badge
              size="sm"
              tt="uppercase"
              style={{ fontSize: 10, fontWeight: 700, background: "#DC2626", color: "white" }}
            >
              {crisisPins.length} Active
            </Badge>
          ) : currentNRCLocation ? (
            <Badge
              size="sm"
              tt="uppercase"
              style={{ fontSize: 10, fontWeight: 700, background: regionColor, color: "white" }}
            >
              NRC Ops
            </Badge>
          ) : null}
        </Group>
        {/* TODO(demo): "Feb 2026" date is hardcoded — should reflect the active timeline month */}
        <Text size="sm" c="#E85D3D" style={{ fontSize: 13 }}>
          {hasCrisisData ? (
            <>
              Humanitarian{" "}
              <Text component="span" c="#737373">
                | Feb 2026
              </Text>
            </>
          ) : currentNRCLocation ? (
            <>
              {currentNRCLocation.region.split(" ")[0]}{" "}
              <Text component="span" c="#737373">
                | NRC Office
              </Text>
            </>
          ) : (
            <>
              Overview <Text component="span" c="#737373">| Feb 2026</Text>
            </>
          )}
        </Text>
      </Box>

      {/* Quick Stats */}
      <SimpleGrid cols={3} spacing={8} px={24} py={16} className="bg-[#F9FAFB] border-b border-[#E5E5E5]">
        {hasCrisisData ? (
          <>
            {/* TODO(demo): trend arrows (+1, +3, +2) and "At Risk" figures are hardcoded — wire to real KPI API */}
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#DC2626" lh={1}>{crisisPins.length}</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Active Crises</Text>
              <Text size="xs" c="#DC2626" style={{ fontSize: 10 }}>&uarr; +1</Text>
            </Stack>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#059669" lh={1}>{teamPins.length}</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Teams</Text>
              <Text size="xs" c="#059669" style={{ fontSize: 10 }}>&uarr; {selectedCountry === "Sudan" ? "+3" : "+2"}</Text>
            </Stack>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#171717" lh={1}>{selectedCountry === "Sudan" ? "4.5M" : "45K"}</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>At Risk</Text>
              <Text size="xs" c="#DC2626" style={{ fontSize: 10 }}>&uarr; {selectedCountry === "Sudan" ? "+28%" : "+12%"}</Text>
            </Stack>
          </>
        ) : currentNRCLocation ? (
          <>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#E85D3D" lh={1}>{currentNRCLocation.operationTypes.length}</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Core Activities</Text>
            </Stack>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#E85D3D" lh={1}>{currentNRCLocation.yearEstablished ?? "—"}</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Est. Year</Text>
            </Stack>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#059669" lh={1} style={{ fontSize: 14 }}>Active</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Status</Text>
            </Stack>
          </>
        ) : (
          <>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#737373" lh={1}>—</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10 }}>Active Crises</Text>
            </Stack>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#737373" lh={1}>—</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10 }}>Teams</Text>
            </Stack>
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700} c="#737373" lh={1}>—</Text>
              <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10 }}>At Risk</Text>
            </Stack>
          </>
        )}
      </SimpleGrid>

      {/* EWAS Pipeline Status (Sudan only) */}
      {selectedCountry === "Sudan" && (
        <Box
          px={24}
          py={16}
          className="border-b border-[#E5E5E5]"
          style={{ background: "linear-gradient(to right, #FEF2F0, white)" }}
        >
          <Group justify="space-between" mb={8}>
            <Group gap={8}>
              <IconDatabase size={16} color="#E85D3D" />
              <Text fw={700} tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 11, color: "#525252" }}>
                EWAS Sudan Pipeline
              </Text>
            </Group>
            <Group gap={6}>
              <Box w={8} h={8} style={{ background: "#059669" }} className="animate-pulse" />
              <Text fw={600} style={{ fontSize: 10, color: "#059669" }}>CONNECTED</Text>
            </Group>
          </Group>
          <SimpleGrid cols={3} spacing={8} mb={8}>
            <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
              <Text fw={700} c="#E85D3D" style={{ fontSize: 14 }}>
                {pipelineStats?.overall.total_sources ?? mockEWASSourcesOnline}
              </Text>
              <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Sources</Text>
            </Box>
            <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
              <Text fw={700} c="#E85D3D" style={{ fontSize: 14 }}>
                {pipelineStats
                  ? `${(pipelineStats.overall.total_data_records / 1000).toFixed(1)}k`
                  : "55.4k"}
              </Text>
              <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Records</Text>
            </Box>
            <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
              <Text fw={700} c="#DC2626" style={{ fontSize: 14 }}>{mockEWASCriticalAlerts}</Text>
              <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Critical</Text>
            </Box>
          </SimpleGrid>
          <Group justify="space-between">
            <Group gap={4}>
              <IconRefresh size={12} color="#737373" />
              <Text c="#737373" style={{ fontSize: 10 }}>Last sync: 5 min ago</Text>
            </Group>
            <Text component={Link} href="/detection" c="#E85D3D" fw={500} style={{ fontSize: 10 }} className="no-underline">
              View sources &rarr;
            </Text>
          </Group>
        </Box>
      )}

      {/* Active Crises OR NRC Core Activities */}
      {hasCrisisData ? (
        <CollapsibleSection
          title={`Active Crises (${crisisPins.length})`}
          defaultOpen
        >
          <Stack gap={8}>
            {crisisPins.slice(0, 4).map((pin) => (
              <Box
                key={pin.id}
                p={12}
                className="bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors flex items-start gap-3"
              >
                <Box
                  w={10}
                  h={10}
                  mt={4}
                  style={{
                    backgroundColor:
                      pin.severity === "critical"
                        ? "#DC2626"
                        : pin.severity === "high"
                          ? "#F59E0B"
                          : "#D97706",
                    flexShrink: 0,
                  }}
                  className={pin.severity === "critical" ? "animate-pulse" : ""}
                />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={600} c="#171717" style={{ fontSize: 13 }} lineClamp={1}>
                    {pin.name}
                  </Text>
                  <Text c="#737373" style={{ fontSize: 11 }}>
                    {pin.region ?? "Field"} &bull;{" "}
                    {pin.cases
                      ? `${pin.cases} cases`
                      : pin.affectedPopulation
                        ? `${(pin.affectedPopulation / 1000).toFixed(0)}k affected`
                        : pin.trend}
                  </Text>
                </Box>
                <Badge
                  size="xs"
                  tt="uppercase"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    backgroundColor:
                      pin.severity === "critical"
                        ? "#FEE2E2"
                        : pin.severity === "high"
                          ? "#FEF3C7"
                          : "#FEF3C7",
                    color:
                      pin.severity === "critical" ? "#DC2626" : "#D97706",
                    flexShrink: 0,
                  }}
                >
                  {pin.severity}
                </Badge>
              </Box>
            ))}
          </Stack>
        </CollapsibleSection>
      ) : currentNRCLocation && currentNRCLocation.operationTypes.length > 0 ? (
        <CollapsibleSection
          title={`NRC Core Activities (${currentNRCLocation.operationTypes.length})`}
          defaultOpen
        >
          <Stack gap={8}>
            {currentNRCLocation.operationTypes.map((activity) => (
              <Box
                key={activity}
                p={12}
                className="bg-[#F5F5F5]"
              >
                <Group gap={12}>
                  <Box
                    w={10}
                    h={10}
                    style={{ backgroundColor: regionColor, borderRadius: "50%", flexShrink: 0 }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} c="#171717" style={{ fontSize: 13 }}>{activity}</Text>
                    <Text c="#737373" style={{ fontSize: 11 }}>
                      {nrcOperationDescriptions[activity as keyof typeof nrcOperationDescriptions] ?? ""}
                    </Text>
                  </Box>
                  <Badge size="xs" style={{ fontSize: 9, fontWeight: 700, background: "#D1FAE5", color: "#059669", flexShrink: 0 }}>
                    Active
                  </Badge>
                </Group>
              </Box>
            ))}
          </Stack>
        </CollapsibleSection>
      ) : null}

      {/* AI Situation Analysis OR Location Overview */}
      <CollapsibleSection
        title={hasCrisisData ? "AI Situation Analysis" : "Location Overview"}
        defaultOpen={hasCrisisData}
      >
        {/* TODO(demo): AI analysis text is hardcoded per-country — replace with live LLM-generated summaries from the analysis API */}
        {hasCrisisData ? (
          <Box>
            <Box
              display="inline-flex"
              style={{
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: "#F3E8FF",
                color: "#7C3AED",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              ✦ AI Analysis
            </Box>
            {selectedCountry === "Sudan" ? (
              <>
                <Text style={{ fontSize: 13, color: "#525252", lineHeight: 1.6 }}>
                  <Text component="span" style={{ background: "#FEE2E2", padding: "0 4px", fontWeight: 500 }}>
                    Armed conflict in Khartoum has displaced 2.5M people
                  </Text>{" "}
                  with urgent humanitarian needs across multiple sectors. Fighting has spread to Darfur
                  regions with{" "}
                  <Text component="span" style={{ background: "#FEF3C7", padding: "0 4px", fontWeight: 500 }}>
                    famine conditions (IPC Phase 5)
                  </Text>{" "}
                  in West Darfur affecting 890,000 people.
                </Text>
                <Text mt={16} style={{ fontSize: 13, color: "#525252", lineHeight: 1.6 }}>
                  Cholera outbreak in Port Sudan requires immediate WASH intervention. 1,847 confirmed
                  cases with limited medical supplies reaching affected areas.
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 13, color: "#525252", lineHeight: 1.6 }}>
                  <Text component="span" style={{ background: "#FEF3C7", padding: "0 4px", fontWeight: 500 }}>
                    Cholera outbreak requires immediate action
                  </Text>{" "}
                  with 46-hour intervention window remaining. Current spread pattern indicates waterborne
                  transmission from contaminated wells in Jijiga. Response teams deployed but{" "}
                  <Text component="span" style={{ background: "#FEF3C7", padding: "0 4px", fontWeight: 500 }}>
                    IV fluid supplies critically low
                  </Text>{" "}
                  at 32% capacity.
                </Text>
                <Text mt={16} style={{ fontSize: 13, color: "#525252", lineHeight: 1.6 }}>
                  Flood risk in Oromia elevated due to seasonal rainfall patterns. Pre-positioning
                  recommended for Bale and West Arsi zones.
                </Text>
              </>
            )}
            <Text
              component={Link}
              href="/analysis"
              c="#E85D3D"
              fw={500}
              style={{ fontSize: 12, display: "inline-block", marginTop: 16 }}
              className="no-underline hover:underline"
            >
              View full analysis &rarr;
            </Text>
          </Box>
        ) : currentNRCLocation ? (
          <Box>
            <Box
              display="inline-flex"
              style={{
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: regionColor,
                color: "white",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {currentNRCLocation.region}
            </Box>
            <Text style={{ fontSize: 13, color: "#525252", lineHeight: 1.6 }}>
              {currentNRCLocation.description ??
                `NRC operates in ${currentNRCLocation.country} providing humanitarian assistance to displaced and vulnerable populations.`}
            </Text>
            {currentNRCLocation.yearEstablished && (
              <Text mt={16} style={{ fontSize: 13, color: "#525252", lineHeight: 1.6 }}>
                <Text component="span" style={{ background: "#FEF2F0", padding: "0 4px", fontWeight: 500 }}>
                  NRC established operations in {currentNRCLocation.yearEstablished}
                </Text>{" "}
                and continues to provide multi-sector humanitarian response including{" "}
                {currentNRCLocation.operationTypes
                  .slice(0, 3)
                  .join(", ")
                  .toLowerCase()}
                .
              </Text>
            )}
            <Box mt={16} pt={16} style={{ borderTop: "1px solid #F0F0F0" }}>
              <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
                Location Details
              </Text>
              <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <Group justify="space-between">
                  <Text c="#737373" style={{ fontSize: 12 }}>Capital</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{currentNRCLocation.capital}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="#737373" style={{ fontSize: 12 }}>Region</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{currentNRCLocation.region.split(" ")[0]}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="#737373" style={{ fontSize: 12 }}>Latitude</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{currentNRCLocation.latitude.toFixed(2)}°</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="#737373" style={{ fontSize: 12 }}>Longitude</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{currentNRCLocation.longitude.toFixed(2)}°</Text>
                </Group>
              </Box>
            </Box>
          </Box>
        ) : (
          <Text style={{ fontSize: 13, color: "#737373" }}>No detailed information available for this location.</Text>
        )}
      </CollapsibleSection>

      {/* Response Status OR NRC Presence */}
      <CollapsibleSection title={hasCrisisData ? "Response Status" : "NRC Presence"}>
        {hasCrisisData ? (
          <Box>
            {/* Team Deployments */}
            <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              Active Deployments
            </Text>
            <Stack gap={8} mb={16}>
              {teamPins.map((team) => (
                <Box
                  key={team.id}
                  py={8}
                  px={12}
                  style={{ background: "#F0FDF4", borderLeft: "2px solid #059669" }}
                >
                  <Group justify="space-between">
                    <Group gap={8}>
                      <Box w={8} h={8} style={{ background: "#059669" }} className="animate-pulse" />
                      <Box>
                        <Text fw={500} style={{ fontSize: 13 }}>{team.name}</Text>
                        <Text c="#737373" style={{ fontSize: 11 }}>
                          {team.region ?? "Field"} &bull; {team.members} members
                        </Text>
                      </Box>
                    </Group>
                    <Badge size="xs" style={{ fontSize: 9, fontWeight: 700, background: "#D1FAE5", color: "#059669" }}>
                      {team.status ?? "Active"}
                    </Badge>
                  </Group>
                </Box>
              ))}
              {/* TODO(demo): hardcoded additional team entry — remove when real deployment data is available */}
              <Box py={8} px={12} style={{ background: "#FFFBEB", borderLeft: "2px solid #F59E0B" }}>
                <Group justify="space-between">
                  <Group gap={8}>
                    <Box w={8} h={8} style={{ background: "#F59E0B" }} />
                    <Box>
                      <Text fw={500} style={{ fontSize: 13 }}>Assessment Team</Text>
                      <Text c="#737373" style={{ fontSize: 11 }}>
                        En route to Gode &bull; 4 members
                      </Text>
                    </Box>
                  </Group>
                  <Badge size="xs" style={{ fontSize: 9, fontWeight: 700, background: "#FEF3C7", color: "#D97706" }}>
                    Transit
                  </Badge>
                </Group>
              </Box>
            </Stack>

            {/* Critical Resources */}
            {/* TODO(demo): resource stock percentages are hardcoded — replace with real logistics/stock data from operations API */}
            <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              Critical Resources
            </Text>
            <Stack gap={4} mb={16}>
              {[
                { label: "IV Fluids", pct: 32, color: "#DC2626" },
                { label: "ORS Packets", pct: 58, color: "#F59E0B" },
                { label: "Water Purification", pct: 74, color: "#059669" },
              ].map((r) => (
                <Group key={r.label} justify="space-between" py={4}>
                  <Text style={{ fontSize: 13 }}>{r.label}</Text>
                  <Group gap={8}>
                    <Box w={96} h={8} style={{ background: "#E5E5E5" }}>
                      <Box h={8} style={{ width: `${r.pct}%`, background: r.color }} />
                    </Box>
                    <Text fw={600} style={{ fontSize: 11, color: r.color }}>{r.pct}%</Text>
                  </Group>
                </Group>
              ))}
            </Stack>

            <Text
              component={Link}
              href="/operations"
              c="#E85D3D"
              fw={500}
              style={{ fontSize: 12 }}
              className="no-underline hover:underline"
            >
              View Operations Center &rarr;
            </Text>
          </Box>
        ) : currentNRCLocation ? (
          <Box>
            {/* Country Office */}
            <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              Country Office
            </Text>
            <Stack gap={8} mb={16}>
              <Box py={8} px={12} style={{ background: "#FFF7F5", borderLeft: "2px solid #E85D3D" }}>
                <Group justify="space-between">
                  <Group gap={8}>
                    <Box w={8} h={8} style={{ background: "#E85D3D" }} />
                    <Box>
                      <Text fw={500} style={{ fontSize: 13 }}>NRC {currentNRCLocation.country}</Text>
                      <Text c="#737373" style={{ fontSize: 11 }}>
                        {currentNRCLocation.capital} &bull; Country Office
                      </Text>
                    </Box>
                  </Group>
                  <Badge size="xs" style={{ fontSize: 9, fontWeight: 700, background: "#D1FAE5", color: "#059669" }}>
                    Active
                  </Badge>
                </Group>
              </Box>
            </Stack>

            {/* Regional Context */}
            <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              Regional Context
            </Text>
            <Stack gap={0} mb={16}>
              {[
                { label: "NRC Region", value: currentNRCLocation.region },
                {
                  label: "Countries in Region",
                  value: String(getOperationalLocations().filter((l) => l.region === currentNRCLocation.region).length),
                },
                { label: "Active Programs", value: String(currentNRCLocation.operationTypes.length) },
              ].map((row) => (
                <Group key={row.label} justify="space-between" py={8} style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <Text style={{ fontSize: 13, color: "#525252" }}>{row.label}</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{row.value}</Text>
                </Group>
              ))}
            </Stack>

            {/* Neighboring NRC Countries */}
            <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              Other {currentNRCLocation.region.split(" ")[0]} Countries
            </Text>
            <Group gap={4}>
              {getOperationalLocations()
                .filter((l) => l.region === currentNRCLocation.region && l.country !== currentNRCLocation.country)
                .slice(0, 5)
                .map((loc) => (
                  <Box
                    key={loc.id}
                    component="button"
                    onClick={() => onCountryChange(loc.country)}
                    px={8}
                    py={4}
                    style={{
                      fontSize: 10,
                      background: "#F5F5F5",
                      color: "#525252",
                      border: "none",
                      cursor: "pointer",
                    }}
                    className="hover:bg-[#E5E5E5] transition-colors"
                  >
                    {loc.country}
                  </Box>
                ))}
            </Group>
          </Box>
        ) : (
          <Text style={{ fontSize: 13, color: "#737373" }}>No response data available.</Text>
        )}
      </CollapsibleSection>

      {/* NRC Global Operations */}
      <CollapsibleSection title={`NRC Global Operations (${nrcStatistics.totalCountries})`}>
        {/* Quick Stats */}
        <SimpleGrid cols={3} spacing={8} mb={16}>
          {[
            { value: String(nrcStatistics.totalCountries), label: "Countries" },
            { value: String(nrcStatistics.regionCount), label: "Regions" },
            { value: "~16.5k", label: "Staff" }, // TODO(demo): hardcoded — pull from NRC org data
          ].map((s) => (
            <Box key={s.label} p={8} style={{ textAlign: "center", background: "#F9FAFB" }}>
              <Text fw={700} c="#E85D3D" style={{ fontSize: 18, lineHeight: 1 }}>{s.value}</Text>
              <Text c="#737373" tt="uppercase" style={{ fontSize: 9, marginTop: 4 }}>{s.label}</Text>
            </Box>
          ))}
        </SimpleGrid>

        {/* View on Map button */}
        <Box
          component="button"
          onClick={() => onViewChange("nrc-global")}
          mb={16}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            border: "1px solid",
            cursor: "pointer",
            transition: "all 0.15s",
            background: activeView === "nrc-global" ? "#E85D3D" : "white",
            color: activeView === "nrc-global" ? "white" : "#171717",
            borderColor: activeView === "nrc-global" ? "#E85D3D" : "#E5E5E5",
          }}
        >
          <IconGlobe size={16} />
          {activeView === "nrc-global" ? "Viewing Global Map" : "View All on Map"}
        </Box>

        {/* Region accordions */}
        <Stack gap={8}>
          {Object.entries(countriesByRegion).map(([region, regionCountries]) => {
            const isExpanded = expandedNRCRegion === region;
            const locations = getOperationalLocations().filter((loc) => loc.region === region);
            const rColor = regionColors[region as NRCRegion] ?? "#718096";

            return (
              <Box key={region} style={{ border: "1px solid #E5E5E5" }}>
                <Box
                  component="button"
                  onClick={() => setExpandedNRCRegion(isExpanded ? null : region)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                  className="hover:bg-[#F9FAFB] transition-colors"
                >
                  <Group gap={8}>
                    <Box w={10} h={10} style={{ backgroundColor: rColor, borderRadius: "50%" }} />
                    <Text fw={600} style={{ fontSize: 12, color: "#171717" }}>{region}</Text>
                    <Badge size="xs" variant="light" color="gray" style={{ fontSize: 9 }}>
                      {regionCountries.length}
                    </Badge>
                  </Group>
                  <IconChevronDown
                    size={16}
                    color="#737373"
                    style={{
                      transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                </Box>

                {isExpanded && (
                  <Box style={{ borderTop: "1px solid #F0F0F0", background: "#F9FAFB" }}>
                    {locations.map((location, idx) => (
                      <Box
                        key={location.id}
                        component="button"
                        onClick={() => onCountryChange(location.country)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          background: "transparent",
                          border: "none",
                          borderBottom: idx < locations.length - 1 ? "1px solid #F0F0F0" : "none",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                        className="hover:bg-[#F0F0F0] transition-colors"
                      >
                        <IconMapPin size={14} color="#E85D3D" style={{ marginTop: 2, flexShrink: 0 }} />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap={4} wrap="nowrap">
                            <Text fw={500} style={{ fontSize: 12, color: "#171717" }}>{location.country}</Text>
                            {selectedCountry === location.country && (
                              <Badge size="xs" style={{ fontSize: 8, background: "#E85D3D", color: "white" }}>
                                Selected
                              </Badge>
                            )}
                          </Group>
                          {location.description && (
                            <Text
                              style={{ fontSize: 10, color: "#737373", marginTop: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                            >
                              {location.description}
                            </Text>
                          )}
                          {location.operationTypes.length > 0 && (
                            <Group gap={4} mt={6}>
                              {location.operationTypes.slice(0, 3).map((type) => (
                                <Box
                                  key={type}
                                  style={{
                                    fontSize: 9,
                                    padding: "2px 6px",
                                    background: "white",
                                    border: "1px solid #E5E5E5",
                                    color: "#525252",
                                  }}
                                >
                                  {type.replace("Legal Assistance (ICLA)", "ICLA")}
                                </Box>
                              ))}
                              {location.operationTypes.length > 3 && (
                                <Text style={{ fontSize: 9, color: "#A3A3A3" }}>
                                  +{location.operationTypes.length - 3}
                                </Text>
                              )}
                            </Group>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>

        {/* Core Competencies */}
        <Box mt={16} pt={16} style={{ borderTop: "1px solid #F0F0F0" }}>
          <Text fw={700} tt="uppercase" c="#737373" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
            Core Competencies
          </Text>
          <Group gap={4}>
            {["Education", "Food Security", "ICLA", "Shelter", "WASH", "Camp Mgmt"].map((comp) => (
              <Box
                key={comp}
                style={{
                  fontSize: 9,
                  padding: "2px 8px",
                  background: "#FFF7F5",
                  color: "#E85D3D",
                  border: "1px solid #FECFC7",
                }}
              >
                {comp}
              </Box>
            ))}
          </Group>
        </Box>
      </CollapsibleSection>

      {/* Recent Activity */}
      <CollapsibleSection title="Recent Activity">
        <Stack gap={12}>
          {recentActivity.map((item) => (
            <Group key={item.title + item.time} gap={12} align="flex-start">
              <Box
                w={8}
                h={8}
                mt={4}
                style={{
                  backgroundColor: activityDotColors[item.type] ?? "#737373",
                  flexShrink: 0,
                }}
              />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Group gap={8} mb={2}>
                  <Text fw={600} style={{ fontSize: 12 }}>{item.title}</Text>
                  <Text c="#A3A3A3" style={{ fontSize: 10 }}>{item.time}</Text>
                </Group>
                <Text c="#737373" style={{ fontSize: 11 }}>{item.description}</Text>
              </Box>
            </Group>
          ))}
        </Stack>
        <Text
          component={Link}
          href="/detection"
          c="#E85D3D"
          fw={500}
          style={{ fontSize: 12, display: "inline-block", marginTop: 16 }}
          className="no-underline hover:underline"
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
            background: "#F5F5F5",
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
            background: "#E85D3D",
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
          Create Alert
        </Button>
      </Group>

      {/* Data source footer — TODO(demo): sources and "Updated" timestamp are hardcoded; derive from active pipeline metadata */}
      <Box px={24} py={16} className="border-t border-[#E5E5E5] bg-[#F5F5F5]">
        <Text size="xs" c="#737373" style={{ fontSize: 11 }}>
          Data:{" "}
          <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>MOH PHEM</Text>
          {", "}
          <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>WHO</Text>
          {", "}
          <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>FEWS</Text>
          {" | AI Analysis"}
        </Text>
        <Text size="xs" c="#A3A3A3" mt={8} style={{ fontSize: 9 }}>
          Updated: 30m ago
        </Text>
      </Box>
    </Box>
  );
}
