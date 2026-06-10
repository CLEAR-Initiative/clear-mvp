"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Text,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Modal,
  List,
  Anchor,
} from "@mantine/core";
import {
  IconBolt,
  IconGlobe,
  IconMapPin,
  IconChevronDown,
  IconSword,
  IconDroplets,
  IconSun,
  IconVirus,
  IconUsers,
  IconMountain,
  IconWind,
  IconGrain,
  IconBuilding,
  IconNetwork,
  IconShield,
  IconTrendingDown,
  IconAlertCircle,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useDisclosure } from "@mantine/hooks";
import { CollapsibleSection } from "~/components/ui/collapsible-section";
import { CreateSignalModal } from "~/components/create-signal-modal";
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

/* ========== INFORM Risk icon map ========== */

// Maps INFORM indicator ID prefixes to representative Tabler icons
const INDICATOR_ICONS: Record<string, ComponentType<{ size: number; color: string }>> = {
  "HA.HUM":     IconSword,
  "HA.NAT.FL":  IconDroplets,
  "HA.NAT.DR":  IconSun,
  "HA.NAT.EQ":  IconMountain,
  "HA.NAT.TC":  IconWind,
  "HA.VECT":    IconVirus,
  "HA.ZOON":    IconVirus,
  "HA.FWB":     IconGrain,
  "VU.VGR.UP":  IconUsers,
  "VU.SEV.PD":  IconTrendingDown,
  "VU.SEV.INQ": IconTrendingDown,
  "VU.SEV.AD":  IconGrain,
  "CC.INS.GOV": IconBuilding,
  "CC.INS.DRR": IconShield,
  "CC.INF.PHY": IconNetwork,
  "CC.INF.COM": IconNetwork,
  "CC.INF.AHC": IconAlertCircle,
};

function getIndicatorIcon(id: string): ComponentType<{ size: number; color: string }> {
  // Exact match first, then prefix match (e.g. "HA.NAT" matches "HA.NAT.FL")
  return (
    INDICATOR_ICONS[id] ??
    Object.entries(INDICATOR_ICONS).find(([k]) => id.startsWith(k))?.[1] ??
    IconAlertCircle
  );
}

function riskScoreColor(score: number): string {
  if (score >= 7) return "#DC2626";
  if (score >= 5) return "#F59E0B";
  return "#059669";
}

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

// TODO(demo): hardcoded - replace with real activity feed from API
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
}

/* ========== Component ========== */

export function RightPanel({
  selectedCountry,
  onCountryChange,
  onViewChange,
  activeView,
}: RightPanelProps) {
  const t = useTranslations("dashboard");
  const [expandedNRCRegion, setExpandedNRCRegion] = useState<string | null>(null);
  const [signalModalOpen, setSignalModalOpen] = useState(false);
  const [informInfoOpened, { open: openInformInfo, close: closeInformInfo }] = useDisclosure(false);

  const riskQuery = api.inform.getRisk.useQuery(
    { country: selectedCountry },
    { retry: false, staleTime: 86400_000 }, // annual data, no need to refetch often
  );

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
      className="bg-[var(--color-bg-white)] sm:border-l border-t sm:border-t-0 border-[var(--color-border)] overflow-y-auto flex flex-col flex-shrink-0 sm:w-[380px] sm:min-h-0 sm:h-full"
    >
      {/* Panel Header */}
      <Box px={24} py={24} className="border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]">
        <Group justify="space-between" align="flex-start" mb={4}>
          <Text fw={700} style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
            {selectedCountry}
          </Text>
          {!hasCrisisData && currentNRCLocation ? (
            <Badge
              size="sm"
              tt="uppercase"
              style={{ fontSize: 10, fontWeight: 700, background: regionColor, color: "white" }}
            >
              {t("rightPanel.nrcOpsBadge")}
            </Badge>
          ) : null}
        </Group>
        {!hasCrisisData && currentNRCLocation && (
          <Text size="sm" c="#E85D3D" style={{ fontSize: 13 }}>
            {currentNRCLocation.region.split(" ")[0]}{" "}
            <Text component="span" c="var(--color-text-muted)">
              | {t("rightPanel.nrcOffice")}
            </Text>
          </Text>
        )}
      </Box>

      {/* INFORM Risk Pillars */}
      <Box className="bg-[var(--color-bg-muted)] border-b border-[var(--color-border)]">
        <Box px={24} pt={16} pb={12} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          {([
            { labelKey: "hazard", score: riskQuery.data?.pillars.hazard ?? null },
            { labelKey: "vulnerability", score: riskQuery.data?.pillars.vulnerability ?? null },
            { labelKey: "coping", score: riskQuery.data?.pillars.coping ?? null },
          ] as const).map((pillar) => (
            <Stack key={pillar.labelKey} align="center" gap={2}>
              <Text
                fw={700}
                lh={1}
                style={{
                  fontSize: 22,
                  color: pillar.score !== null ? riskScoreColor(pillar.score) : "#D0D0D0",
                }}
              >
                {pillar.score !== null ? pillar.score.toFixed(1) : "-"}
              </Text>
              <Text tt="uppercase" c="var(--color-text-muted)" style={{ letterSpacing: "0.03em", fontSize: 10 }}>
                {t(`rightPanel.pillars.${pillar.labelKey}`)}
              </Text>
            </Stack>
          ))}
        </Box>
        <Box px={24} pb={12}>
          <Group justify="space-between" align="center">
            <Group gap={4} align="center">
              <Text tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 9, letterSpacing: "0.06em" }}>
                {t("rightPanel.informOverall", { edition: riskQuery.data?.edition ?? "INFORM Risk 2026" })}
              </Text>
              <Box
                onClick={openInformInfo}
                style={{ cursor: "pointer", color: "#A0A0A0", display: "flex", lineHeight: 1, transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#525252")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#A0A0A0")}
              >
                <IconInfoCircle size={12} />
              </Box>
            </Group>
            <Group gap={4} align="baseline">
              <Text
                fw={700}
                style={{
                  fontSize: 18,
                  color: riskQuery.data?.score !== null && riskQuery.data?.score !== undefined
                    ? riskScoreColor(riskQuery.data.score)
                    : "#D0D0D0",
                }}
              >
                {riskQuery.data?.score?.toFixed(1) ?? "-"}
              </Text>
              <Text c="var(--color-text-muted)" style={{ fontSize: 10 }}>/10</Text>
            </Group>
          </Group>
        </Box>
      </Box>


      <Modal
        opened={informInfoOpened}
        onClose={closeInformInfo}
        title={t("rightPanel.informModal.title")}
        size="md"
        styles={{ title: { fontSize: 14, fontWeight: 700, color: "#171717" }, body: { paddingTop: 4 } }}
      >
        <Text style={{ fontSize: 13, color: "#525252", marginBottom: 12, lineHeight: 1.6 }}>
          {t.rich("rightPanel.informModal.intro", { strong: (chunks) => <strong>{chunks}</strong> })}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: 600, color: "#171717", marginBottom: 6 }}>{t("rightPanel.informModal.pillarsHeading")}</Text>
        <List spacing={4} mb={14} styles={{ item: { fontSize: 12, color: "#525252", lineHeight: 1.6 } }}>
          <List.Item>{t.rich("rightPanel.informModal.pillarHazard", { strong: (chunks) => <strong>{chunks}</strong> })}</List.Item>
          <List.Item>{t.rich("rightPanel.informModal.pillarVulnerability", { strong: (chunks) => <strong>{chunks}</strong> })}</List.Item>
          <List.Item>{t.rich("rightPanel.informModal.pillarCoping", { strong: (chunks) => <strong>{chunks}</strong> })}</List.Item>
        </List>
        <Text style={{ fontSize: 11, color: "#A3A3A3", lineHeight: 1.5 }}>
          {t("rightPanel.informModal.sourceLabel")} <Anchor href="https://drmkc.jrc.ec.europa.eu/inform-index" target="_blank" size="xs">
            {t("rightPanel.informModal.sourceLink")}
          </Anchor>{" "}{t("rightPanel.informModal.updatedAnnually")}
        </Text>
      </Modal>

      {/* Active Crises - locked until real crisis data is wired */}
      {hasCrisisData ? (
        <CollapsibleSection
          title={t("rightPanel.activeCrises", { count: crisisPins.length })}
          locked
        >
          <Stack gap={8}>
            {crisisPins.slice(0, 4).map((pin) => (
              <Box
                key={pin.id}
                p={12}
                className="bg-[var(--color-bg-muted)] hover:bg-[var(--color-border)] transition-colors flex items-start gap-3"
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
                  <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                    {pin.region ?? t("rightPanel.fieldFallback")} &bull;{" "}
                    {pin.cases
                      ? t("rightPanel.casesCount", { count: pin.cases })
                      : pin.affectedPopulation
                        ? t("rightPanel.affectedShort", { count: (pin.affectedPopulation / 1000).toFixed(0) })
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
                  {t(`rightPanel.severities.${pin.severity}`)}
                </Badge>
              </Box>
            ))}
          </Stack>
        </CollapsibleSection>
      ) : currentNRCLocation && currentNRCLocation.operationTypes.length > 0 ? (
        <CollapsibleSection
          title={t("rightPanel.nrcCoreActivities", { count: currentNRCLocation.operationTypes.length })}
          defaultOpen
        >
          <Stack gap={8}>
            {currentNRCLocation.operationTypes.map((activity) => (
              <Box
                key={activity}
                p={12}
                className="bg-[var(--color-bg-muted)]"
              >
                <Group gap={12}>
                  <Box
                    w={10}
                    h={10}
                    style={{ backgroundColor: regionColor, borderRadius: "50%", flexShrink: 0 }}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} c="#171717" style={{ fontSize: 13 }}>{activity}</Text>
                    <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                      {nrcOperationDescriptions[activity as keyof typeof nrcOperationDescriptions] ?? ""}
                    </Text>
                  </Box>
                  <Badge size="xs" style={{ fontSize: 9, fontWeight: 700, background: "#D1FAE5", color: "#059669", flexShrink: 0 }}>
                    {t("rightPanel.activeBadge")}
                  </Badge>
                </Group>
              </Box>
            ))}
          </Stack>
        </CollapsibleSection>
      ) : null}

      {/* Country Risks (INFORM Risk top indicators) OR Location Overview */}
      <CollapsibleSection
        title={hasCrisisData ? t("rightPanel.countryRisks") : t("rightPanel.locationOverview")}
        defaultOpen={hasCrisisData}
      >
        {hasCrisisData ? (
          <Box>
            {riskQuery.isLoading ? (
              <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>{t("rightPanel.loadingRisk")}</Text>
            ) : riskQuery.data?.indicators.length ? (
              <Stack gap={10}>
                {riskQuery.data.indicators.slice(0, 5).map((indicator) => {
                  const IconComponent = getIndicatorIcon(indicator.id);
                  const color = riskScoreColor(indicator.score);
                  return (
                    <Box key={indicator.id}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={6} style={{ flex: 1, minWidth: 0 }}>
                          <IconComponent size={13} color={color} />
                          <Text fw={500} c="#171717" style={{ fontSize: 12 }} lineClamp={1}>
                            {indicator.name}
                          </Text>
                        </Group>
                        <Text fw={700} style={{ fontSize: 12, color, flexShrink: 0 }}>
                          {indicator.score.toFixed(1)}
                        </Text>
                      </Group>
                      <Box style={{ height: 4, background: "#F0F0F0", borderRadius: 2 }}>
                        <Box
                          style={{
                            height: 4,
                            width: `${(indicator.score / 10) * 100}%`,
                            background: color,
                            borderRadius: 2,
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
                <Text c="var(--color-text-muted)" style={{ fontSize: 10, marginTop: 2 }}>
                  {t("rightPanel.riskSource", { edition: riskQuery.data.edition })}
                </Text>
              </Stack>
            ) : (
              <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>{t("rightPanel.riskUnavailable")}</Text>
            )}
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
                t("rightPanel.defaultCountryDescription", { country: currentNRCLocation.country })}
            </Text>
            {currentNRCLocation.yearEstablished && (
              <Text mt={16} style={{ fontSize: 13, color: "#525252", lineHeight: 1.6 }}>
                <Text component="span" style={{ background: "#FEF2F0", padding: "0 4px", fontWeight: 500 }}>
                  {t("rightPanel.establishedIn", { year: currentNRCLocation.yearEstablished })}
                </Text>{" "}
                {t("rightPanel.multiSectorResponse", {
                  activities: currentNRCLocation.operationTypes
                    .slice(0, 3)
                    .join(", ")
                    .toLowerCase(),
                })}
              </Text>
            )}
            <Box mt={16} pt={16} style={{ borderTop: "1px solid #F0F0F0" }}>
              <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
                {t("rightPanel.locationDetails")}
              </Text>
              <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <Group justify="space-between">
                  <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>{t("rightPanel.capital")}</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{currentNRCLocation.capital}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>{t("rightPanel.region")}</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{currentNRCLocation.region.split(" ")[0]}</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>{t("rightPanel.latitude")}</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{currentNRCLocation.latitude.toFixed(2)}°</Text>
                </Group>
                <Group justify="space-between">
                  <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>{t("rightPanel.longitude")}</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{currentNRCLocation.longitude.toFixed(2)}°</Text>
                </Group>
              </Box>
            </Box>
          </Box>
        ) : (
          <Text style={{ fontSize: 13, color: "#737373" }}>{t("rightPanel.noLocationInfo")}</Text>
        )}
      </CollapsibleSection>

      {/* Response Status OR NRC Presence */}
      <CollapsibleSection title={hasCrisisData ? t("rightPanel.responseStatus") : t("rightPanel.nrcPresence")} locked>
        {hasCrisisData ? (
          <Box>
            {/* Team Deployments */}
            <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("rightPanel.activeDeployments")}
            </Text>
            <Stack gap={8} mb={16}>
              {teamPins.map((team) => (
                <Box
                  key={team.id}
                  py={8}
                  px={12}
                  style={{ background: "#F0FDF4", borderInlineStart: "2px solid #059669" }}
                >
                  <Group justify="space-between">
                    <Group gap={8}>
                      <Box w={8} h={8} style={{ background: "#059669" }} className="animate-pulse" />
                      <Box>
                        <Text fw={500} style={{ fontSize: 13 }}>{team.name}</Text>
                        <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                          {team.region ?? t("rightPanel.fieldFallback")} &bull; {t("rightPanel.membersCount", { count: team.members ?? 0 })}
                        </Text>
                      </Box>
                    </Group>
                    <Badge size="xs" style={{ fontSize: 9, fontWeight: 700, background: "#D1FAE5", color: "#059669" }}>
                      {team.status ?? t("rightPanel.activeBadge")}
                    </Badge>
                  </Group>
                </Box>
              ))}
              {/* TODO(demo): hardcoded additional team entry - remove when real deployment data is available */}
              <Box py={8} px={12} style={{ background: "#FFFBEB", borderInlineStart: "2px solid #F59E0B" }}>
                <Group justify="space-between">
                  <Group gap={8}>
                    <Box w={8} h={8} style={{ background: "#F59E0B" }} />
                    <Box>
                      <Text fw={500} style={{ fontSize: 13 }}>{t("rightPanel.assessmentTeam")}</Text>
                      <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                        {t("rightPanel.enRouteGode")} &bull; {t("rightPanel.membersCount", { count: 4 })}
                      </Text>
                    </Box>
                  </Group>
                  <Badge size="xs" style={{ fontSize: 9, fontWeight: 700, background: "#FEF3C7", color: "#D97706" }}>
                    {t("rightPanel.transitBadge")}
                  </Badge>
                </Group>
              </Box>
            </Stack>

            {/* Critical Resources */}
            {/* TODO(demo): resource stock percentages are hardcoded - replace with real logistics/stock data from operations API */}
            <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("rightPanel.criticalResources")}
            </Text>
            <Stack gap={4} mb={16}>
              {([
                { labelKey: "ivFluids", pct: 32, color: "#DC2626" },
                { labelKey: "orsPackets", pct: 58, color: "#F59E0B" },
                { labelKey: "waterPurification", pct: 74, color: "#059669" },
              ] as const).map((r) => (
                <Group key={r.labelKey} justify="space-between" py={4}>
                  <Text style={{ fontSize: 13 }}>{t(`rightPanel.resources.${r.labelKey}`)}</Text>
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
              {t("rightPanel.viewOperations")} &rarr;
            </Text>
          </Box>
        ) : currentNRCLocation ? (
          <Box>
            {/* Country Office */}
            <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("rightPanel.countryOffice")}
            </Text>
            <Stack gap={8} mb={16}>
              <Box py={8} px={12} style={{ background: "#FFF7F5", borderInlineStart: "2px solid #E85D3D" }}>
                <Group justify="space-between">
                  <Group gap={8}>
                    <Box w={8} h={8} style={{ background: "#E85D3D" }} />
                    <Box>
                      <Text fw={500} style={{ fontSize: 13 }}>NRC {currentNRCLocation.country}</Text>
                      <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                        {currentNRCLocation.capital} &bull; {t("rightPanel.countryOffice")}
                      </Text>
                    </Box>
                  </Group>
                  <Badge size="xs" style={{ fontSize: 9, fontWeight: 700, background: "#D1FAE5", color: "#059669" }}>
                    {t("rightPanel.activeBadge")}
                  </Badge>
                </Group>
              </Box>
            </Stack>

            {/* Regional Context */}
            <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("rightPanel.regionalContext")}
            </Text>
            <Stack gap={0} mb={16}>
              {[
                { label: t("rightPanel.nrcRegion"), value: currentNRCLocation.region },
                {
                  label: t("rightPanel.countriesInRegion"),
                  value: String(getOperationalLocations().filter((l) => l.region === currentNRCLocation.region).length),
                },
                { label: t("rightPanel.activePrograms"), value: String(currentNRCLocation.operationTypes.length) },
              ].map((row) => (
                <Group key={row.label} justify="space-between" py={8} style={{ borderBottom: "1px solid #F0F0F0" }}>
                  <Text style={{ fontSize: 13, color: "#525252" }}>{row.label}</Text>
                  <Text fw={500} style={{ fontSize: 12 }}>{row.value}</Text>
                </Group>
              ))}
            </Stack>

            {/* Neighboring NRC Countries */}
            <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("rightPanel.otherRegionCountries", { region: currentNRCLocation.region.split(" ")[0] })}
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
                    className="hover:bg-[var(--color-border)] transition-colors"
                  >
                    {loc.country}
                  </Box>
                ))}
            </Group>
          </Box>
        ) : (
          <Text style={{ fontSize: 13, color: "#737373" }}>{t("rightPanel.noResponseData")}</Text>
        )}
      </CollapsibleSection>

      {/* NRC Global Operations */}
      <CollapsibleSection title={t("rightPanel.nrcGlobalOperations", { count: nrcStatistics.totalCountries })} locked>
        {/* Quick Stats */}
        <SimpleGrid cols={3} spacing={8} mb={16}>
          {[
            { value: String(nrcStatistics.totalCountries), label: t("rightPanel.stats.countries") },
            { value: String(nrcStatistics.regionCount), label: t("rightPanel.stats.regions") },
            { value: "~16.5k", label: t("rightPanel.stats.staff") }, // TODO(demo): hardcoded - pull from NRC org data
          ].map((s) => (
            <Box key={s.label} p={8} style={{ textAlign: "center", background: "#F9FAFB" }}>
              <Text fw={700} c="#E85D3D" style={{ fontSize: 18, lineHeight: 1 }}>{s.value}</Text>
              <Text c="var(--color-text-muted)" tt="uppercase" style={{ fontSize: 9, marginTop: 4 }}>{s.label}</Text>
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
          {activeView === "nrc-global" ? t("rightPanel.viewingGlobalMap") : t("rightPanel.viewAllOnMap")}
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
                  className="hover:bg-[var(--color-bg-muted)] transition-colors"
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
                          textAlign: "start",
                        }}
                        className="hover:bg-[#F0F0F0] transition-colors"
                      >
                        <IconMapPin size={14} color="#E85D3D" style={{ marginTop: 2, flexShrink: 0 }} />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap={4} wrap="nowrap">
                            <Text fw={500} style={{ fontSize: 12, color: "#171717" }}>{location.country}</Text>
                            {selectedCountry === location.country && (
                              <Badge size="xs" style={{ fontSize: 8, background: "#E85D3D", color: "white" }}>
                                {t("rightPanel.selectedBadge")}
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
          <Text fw={700} tt="uppercase" c="var(--color-text-muted)" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 8 }}>
            {t("rightPanel.coreCompetencies")}
          </Text>
          <Group gap={4}>
            {(["education", "foodSecurity", "icla", "shelter", "wash", "campMgmt"] as const).map((comp) => (
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
                {t(`rightPanel.competencies.${comp}`)}
              </Box>
            ))}
          </Group>
        </Box>
      </CollapsibleSection>

      {/* Action buttons */}
      <Box px={24} py={16} className="border-t border-[var(--color-border)] mt-auto">
        <Button
          leftSection={<IconBolt size={14} />}
          variant="unstyled"
          fullWidth
          onClick={() => setSignalModalOpen(true)}
          style={{
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
          {t("rightPanel.createSignal")}
        </Button>
      </Box>
      <CreateSignalModal opened={signalModalOpen} onClose={() => setSignalModalOpen(false)} />

      {/* Data source footer - TODO(demo): sources and "Updated" timestamp are hardcoded; derive from active pipeline metadata */}
      <Box px={24} py={16} className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)]">
        <Text size="xs" c="var(--color-text-muted)" style={{ fontSize: 11 }}>
          {t("rightPanel.footer.data")}{" "}
          <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>MOH PHEM</Text>
          {", "}
          <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>WHO</Text>
          {", "}
          <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>FEWS</Text>
          {" | "}{t("rightPanel.footer.aiAnalysis")}
        </Text>
        <Text size="xs" c="#A3A3A3" mt={8} style={{ fontSize: 9 }}>
          {t("rightPanel.footer.updated")}
        </Text>
      </Box>
    </Box>
  );
}
