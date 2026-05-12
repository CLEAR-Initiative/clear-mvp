"use client";

import { useState } from "react";
import { Box, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconSchool,
  IconLeaf,
  IconHeart,
  IconBriefcase,
  IconTruck,
  IconSalad,
  IconShield,
  IconHome,
  IconDroplet,
  IconLayoutGrid,
} from "@tabler/icons-react";
import type { CountryData, SeverityScale } from "./saf-data";
import { severityColors, coverageColors } from "./saf-data";

/* ── Sector icon registry ─────────────────────────────────────────── */
type IconComp = React.ComponentType<{ size?: number; color?: string }>;

const SECTOR_ICONS: Record<string, IconComp> = {
  Education: IconSchool,
  "Food Security": IconLeaf,
  Health: IconHeart,
  Livelihoods: IconBriefcase,
  Logistics: IconTruck,
  Nutrition: IconSalad,
  Protection: IconShield,
  Shelter: IconHome,
  WASH: IconDroplet,
};

const SEV_SHORT: Record<SeverityScale, string> = {
  CRITICAL: "CRIT",
  SEVERE: "SEV",
  SERIOUS: "SER",
  MODERATE: "MOD",
  UNKNOWN: "—",
};

const SEV_FULL: Record<SeverityScale, string> = {
  CRITICAL: "Critical",
  SEVERE: "Severe",
  SERIOUS: "Serious",
  MODERATE: "Moderate",
  UNKNOWN: "—",
};

const PILLARS = ["Impact", "Humanitarian Conditions", "At Risk"] as const;

/* ── Shared sub-components ────────────────────────────────────────── */

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
      <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
        <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
          {title}
        </Text>
      </Box>
      <Box p={16}>{children}</Box>
    </Card>
  );
}

function BulletList({
  items,
  accentColor,
}: {
  items: string[];
  accentColor?: string;
}) {
  return (
    <Stack gap={6} component="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((item) => (
        <Box
          key={item}
          component="li"
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            paddingLeft: 14,
            position: "relative",
            color: "#374151",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 1,
              fontSize: 15,
              lineHeight: 1,
              color: accentColor ?? "#A3A3A3",
            }}
          >
            ·
          </span>
          {item}
        </Box>
      ))}
    </Stack>
  );
}

/* ── Severity pill ────────────────────────────────────────────────── */
function SevPill({ scale, wide }: { scale: SeverityScale; wide?: boolean }) {
  const s = severityColors(scale);
  return (
    <Box
      style={{
        display: "inline-block",
        fontSize: 9.5,
        fontWeight: 600,
        padding: "2px 5px",
        borderRadius: 3,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {wide ? SEV_FULL[scale] : SEV_SHORT[scale]}
    </Box>
  );
}

/* ── Component ────────────────────────────────────────────────────── */
interface SectorsTabProps {
  countryData: CountryData;
}

export function SectorsTab({ countryData }: SectorsTabProps) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const wide = useMediaQuery("(min-width: 1400px)") ?? false;
  const pillColW = wide ? 88 : 58;
  const leftPanelW = wide ? 420 : 300;

  const {
    SHOWN_RISKS_DATA,
    TOP_SECTORAL_NEEDS_DATA,
    TOP_PRIORITY_INTERVENTIONS_DATA,
    INFORMATION_COVERAGE_DATA,
  } = countryData;

  const sectorSet = new Set<string>();
  PILLARS.forEach((cat) => {
    const catData = SHOWN_RISKS_DATA[cat];
    if (catData) Object.keys(catData).forEach((s) => sectorSet.add(s));
  });
  Object.keys(TOP_SECTORAL_NEEDS_DATA).forEach((s) => sectorSet.add(s));
  const allSectors = [...sectorSet].sort();

  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: `${leftPanelW}px 1fr`,
        height: "calc(100vh - 190px)",
        overflow: "hidden",
        border: "1px solid #E5E5E5",
        borderRadius: 8,
        marginTop: 16,
      }}
    >
      {/* ── Left: Sector List ────────────────────────────────────── */}
      <Box
        style={{
          borderRight: "1px solid #E5E5E5",
          overflowY: "auto",
          background: "#FFF",
        }}
      >
        {/* List header */}
        <Box
          px={16}
          py={12}
          style={{
            borderBottom: "1px solid #E5E5E5",
            background: "#FAFAFA",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: 600, color: "#171717" }}>
            Sectors
          </Text>
          <Text style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>
            {allSectors.length} sectors &middot; select to view full analysis
          </Text>
        </Box>

        {/* Column headings */}
        <Box
          px={16}
          py={7}
          style={{
            display: "grid",
            gridTemplateColumns: `1fr ${pillColW}px ${pillColW}px ${pillColW}px`,
            borderBottom: "2px solid #E5E5E5",
            background: "#FAFAFA",
          }}
        >
          {["Sector", "Impact", "Hum. Cond.", "At Risk"].map((h, i) => (
            <Text
              key={h}
              style={{
                fontSize: 9,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#737373",
                textAlign: i === 0 ? "left" : "center",
              }}
            >
              {h}
            </Text>
          ))}
        </Box>

        {/* Sector rows */}
        {allSectors.map((sector) => {
          const Icon = SECTOR_ICONS[sector] ?? IconLayoutGrid;
          const isSelected = sector === selectedSector;
          return (
            <Box
              key={sector}
              px={isSelected ? 13 : 16}
              py={11}
              onClick={() => setSelectedSector(sector)}
              style={{
                display: "grid",
                gridTemplateColumns: `1fr ${pillColW}px ${pillColW}px ${pillColW}px`,
                alignItems: "center",
                cursor: "pointer",
                borderBottom: "1px solid #E5E5E5",
                borderLeft: isSelected ? "3px solid #2563EB" : "3px solid transparent",
                background: isSelected ? "#EFF6FF" : undefined,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background = "#FAFAFA";
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                <Box
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isSelected ? "#DBEAFE" : "#F5F5F5",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={13} color={isSelected ? "#2563EB" : "#525252"} />
                </Box>
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#171717",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {sector}
                </Text>
              </Group>

              {PILLARS.map((cat) => {
                const e = SHOWN_RISKS_DATA[cat]?.[sector];
                return (
                  <Box
                    key={cat}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <SevPill scale={e?.severity_scale ?? "UNKNOWN"} wide={wide} />
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      {/* ── Right: Detail Panel ──────────────────────────────────── */}
      <Box style={{ overflowY: "auto", background: "#F9FAFB" }}>
        {selectedSector ? (
          <SectorDetail
            sector={selectedSector}
            countryData={countryData}
            icData={INFORMATION_COVERAGE_DATA}
            needs={TOP_SECTORAL_NEEDS_DATA[selectedSector] ?? []}
            interventions={TOP_PRIORITY_INTERVENTIONS_DATA[selectedSector] ?? []}
          />
        ) : (
          <Box
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <IconLayoutGrid size={28} color="#D4D4D4" />
            <Text style={{ fontSize: 12, color: "#A3A3A3" }}>
              Select a sector from the list
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ── Sector Detail Panel ──────────────────────────────────────────── */
function SectorDetail({
  sector,
  countryData,
  icData,
  needs,
  interventions,
}: {
  sector: string;
  countryData: CountryData;
  icData: CountryData["INFORMATION_COVERAGE_DATA"];
  needs: string[];
  interventions: string[];
}) {
  const Icon = SECTOR_ICONS[sector] ?? IconLayoutGrid;
  const risks = countryData.SHOWN_RISKS_DATA;

  const icEntries = icData.analysis.flatMap((pillar) =>
    pillar.entries
      .filter((e) => e.sector === sector)
      .map((e) => ({ ...e, pillar: pillar.pillar })),
  );

  return (
    <Box p={20} style={{ animation: "slideIn 0.2s ease" }}>
      {/* Header */}
      <Group gap={14} mb={20} pb={18} style={{ borderBottom: "1px solid #E5E5E5" }}>
        <Box
          style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            background: "#EFF6FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} color="#2563EB" />
        </Box>
        <Box style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: "#171717", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            {sector}
          </Text>
          <Text style={{ fontSize: 11, color: "#737373", marginTop: 3 }}>
            {needs.length} needs &middot; {interventions.length} interventions &middot; {icEntries.length} coverage entries
          </Text>
        </Box>
      </Group>

      <Stack gap={12}>
        {/* Severity Assessment */}
        <SimpleGrid cols={3} spacing={8}>
          {PILLARS.map((cat) => {
              const e = risks[cat]?.[sector];
              const scale = e?.severity_scale ?? "UNKNOWN";
              const s = severityColors(scale);
              return (
                <Box
                  key={cat}
                  p="10px 12px"
                  style={{
                    background: "#FFF",
                    border: "1px solid #E5E5E5",
                    borderTop: `3px solid ${s.border}`,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    mb={6}
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "#737373",
                    }}
                  >
                    {cat}
                  </Text>
                  {e ? (
                    <>
                      <Box mb={6}>
                        <SevPill scale={e.severity_scale} wide />
                      </Box>
                      <Stack gap={2} component="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {e.top3_risks.map((r) => (
                          <Box
                            key={r}
                            component="li"
                            style={{
                              fontSize: 11,
                              color: "#374151",
                              paddingLeft: 9,
                              position: "relative",
                              lineHeight: 1.4,
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                left: 1,
                                fontSize: 13,
                                lineHeight: 1,
                                color: "#A3A3A3",
                              }}
                            >
                              ·
                            </span>
                            {r}
                          </Box>
                        ))}
                      </Stack>
                    </>
                  ) : (
                    <Text style={{ fontSize: 11, color: "#A3A3A3" }}>No data</Text>
                  )}
                </Box>
              );
            })}
        </SimpleGrid>

        {/* Top Needs */}
        <SectionCard title="Top Needs">
          {needs.length > 0 ? (
            <BulletList items={needs} accentColor="#E85D3D" />
          ) : (
            <Text style={{ fontSize: 13, color: "#A3A3A3" }}>No needs data available.</Text>
          )}
        </SectionCard>

        {/* Priority Interventions */}
        <SectionCard title="Priority Interventions">
          {interventions.length > 0 ? (
            <Stack gap={6} component="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {interventions.map((n) => (
                <Box
                  key={n}
                  component="li"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    paddingLeft: 14,
                    position: "relative",
                    color: "#374151",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      fontSize: 10,
                      lineHeight: 1.6,
                      color: "#7C3AED",
                    }}
                  >
                    ✦
                  </span>
                  {n}
                </Box>
              ))}
            </Stack>
          ) : (
            <Text style={{ fontSize: 13, color: "#A3A3A3" }}>No intervention data available.</Text>
          )}
        </SectionCard>

        {/* Information Coverage & Gaps */}
        <SectionCard title="Information Coverage & Gaps">
          {icEntries.length > 0 ? (
            <Stack gap={8}>
              {icEntries.map((e) => {
                const c = coverageColors(e.coverage);
                const pct = Math.round((e.coverage / 10) * 100);
                return (
                  <Box
                    key={e.pillar}
                    p="10px 12px"
                    style={{
                      background: "#FFF",
                      border: "1px solid #E5E5E5",
                      borderRadius: 4,
                    }}
                  >
                    <Group mb={6} justify="space-between" gap={8}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#525252",
                          flex: 1,
                        }}
                      >
                        {e.pillar}
                      </Text>
                      <Group gap={6} align="center">
                        <Box
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: c.bg,
                            color: c.color,
                            border: `1px solid ${c.bar}40`,
                          }}
                        >
                          {e.coverage}/10
                        </Box>
                        <Box
                          style={{
                            width: 48,
                            height: 4,
                            borderRadius: 2,
                            background: "#F5F5F5",
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: c.bar,
                            }}
                          />
                        </Box>
                      </Group>
                    </Group>
                    <Stack gap={2}>
                      {e.gaps.map((g) => (
                        <Text
                          key={g}
                          style={{
                            fontSize: 11,
                            color: "#737373",
                            paddingLeft: 10,
                            position: "relative",
                            lineHeight: 1.4,
                          }}
                        >
                          <span style={{ position: "absolute", left: 1, color: "#A3A3A3" }}>·</span>
                          {g}
                        </Text>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Text style={{ fontSize: 13, color: "#A3A3A3" }}>No coverage data available.</Text>
          )}
        </SectionCard>
      </Stack>
    </Box>
  );
}
