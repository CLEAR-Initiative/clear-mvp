"use client";

import { useState } from "react";
import { Box, Group, Stack, Text } from "@mantine/core";
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

const PILLARS = ["Impact", "Humanitarian Conditions", "At Risk"] as const;

/* ── Component ────────────────────────────────────────────────────── */
interface SectorsTabProps {
  countryData: CountryData;
}

export function SectorsTab({ countryData }: SectorsTabProps) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const {
    SHOWN_RISKS_DATA,
    TOP_SECTORAL_NEEDS_DATA,
    TOP_PRIORITY_INTERVENTIONS_DATA,
    INFORMATION_COVERAGE_DATA,
  } = countryData;

  // Collect all sectors across pillars + needs
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
        gridTemplateColumns: "300px 1fr",
        height: "calc(100vh - 190px)",
        overflow: "hidden",
        border: "1px solid var(--color-border)",
        marginTop: 16,
      }}
    >
      {/* ── Left: Sector List ────────────────────────────────────── */}
      <Box
        style={{
          borderRight: "1px solid var(--color-border)",
          overflowY: "auto",
          background: "var(--color-bg-white)",
        }}
      >
        {/* List header */}
        <Box
          px={16}
          py={12}
          style={{
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-muted)",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-text-muted)",
            }}
          >
            Sectors
          </Text>
          <Text
            style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}
          >
            {allSectors.length} sectors &middot; select to view full analysis
          </Text>
        </Box>

        {/* Column headings */}
        <Box
          px={16}
          py={7}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 58px 58px 58px",
            borderBottom: "2px solid var(--color-border)",
            background: "var(--color-bg-muted)",
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
                color: "var(--color-text-muted)",
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
                gridTemplateColumns: "1fr 58px 58px 58px",
                alignItems: "center",
                cursor: "pointer",
                borderBottom: "1px solid var(--color-border)",
                borderLeft: isSelected ? "3px solid var(--color-accent)" : "3px solid transparent",
                background: isSelected ? "var(--color-accent-light)" : undefined,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--color-bg-muted)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
                <Box
                  style={{
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--color-bg-muted)",
                    border: "1px solid var(--color-border)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={13} color="var(--color-text-secondary)" />
                </Box>
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
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
                if (!e)
                  return (
                    <Box
                      key={cat}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <SevPill scale="UNKNOWN" />
                    </Box>
                  );
                return (
                  <Box
                    key={cat}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <SevPill scale={e.severity_scale} />
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>

      {/* ── Right: Detail Panel ──────────────────────────────────── */}
      <Box
        style={{
          overflowY: "auto",
          background: "var(--color-bg-primary)",
        }}
      >
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
              color: "var(--color-text-muted)",
            }}
          >
            <IconLayoutGrid size={28} style={{ opacity: 0.3 }} />
            <Text style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              Select a sector from the list
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ── Severity pill ────────────────────────────────────────────────── */
function SevPill({ scale }: { scale: SeverityScale }) {
  const s = severityColors(scale);
  return (
    <Box
      style={{
        display: "inline-block",
        fontSize: 9.5,
        fontWeight: 600,
        padding: "2px 5px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {SEV_SHORT[scale]}
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
    <Box p={24} style={{ animation: "slideIn 0.2s ease" }}>
      {/* Header */}
      <Group gap={14} mb={20} pb={18} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Box
          style={{
            width: 42,
            height: 42,
            background: "var(--color-bg-muted)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} color="var(--color-text-secondary)" />
        </Box>
        <Box style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
            {sector}
          </Text>
          <Text style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 }}>
            {needs.length} needs &middot; {interventions.length} interventions &middot; {icEntries.length} coverage entries
          </Text>
        </Box>
      </Group>

      {/* Severity Assessment */}
      <DetailSection heading="Severity Assessment">
        <Box style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {PILLARS.map((cat) => {
            const e = risks[cat]?.[sector];
            const scale = e?.severity_scale ?? "UNKNOWN";
            const s = severityColors(scale);
            return (
              <Box
                key={cat}
                p="10px 12px"
                style={{
                  background: "var(--color-bg-white)",
                  border: "1px solid var(--color-border)",
                  borderTop: `3px solid ${s.border}`,
                }}
              >
                <Text
                  mb={6}
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {cat}
                </Text>
                {e ? (
                  <>
                    <Box mb={6}>
                      <SevPill scale={e.severity_scale} />
                    </Box>
                    <Stack gap={2} component="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {e.top3_risks.map((r) => (
                        <Box
                          key={r}
                          component="li"
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-secondary)",
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
                              color: "var(--color-text-muted)",
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
                  <Text style={{ fontSize: 11, color: "var(--color-text-muted)" }}>No data</Text>
                )}
              </Box>
            );
          })}
        </Box>
      </DetailSection>

      {/* Top Needs */}
      <DetailSection heading="Top Needs">
        {needs.length > 0 ? (
          <Stack gap={5} component="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {needs.map((n) => (
              <Box
                key={n}
                component="li"
                px={10}
                py={7}
                style={{
                  paddingLeft: 26,
                  background: "var(--color-bg-white)",
                  border: "1px solid var(--color-border)",
                  position: "relative",
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.45,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 9,
                    color: "var(--color-text-muted)",
                    fontSize: 10,
                    top: 8,
                    fontFamily: "monospace",
                  }}
                >
                  →
                </span>
                {n}
              </Box>
            ))}
          </Stack>
        ) : (
          <Text style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No needs data available.</Text>
        )}
      </DetailSection>

      {/* Priority Interventions */}
      <DetailSection heading="Priority Interventions">
        {interventions.length > 0 ? (
          <Stack gap={5} component="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {interventions.map((n) => (
              <Box
                key={n}
                component="li"
                py={7}
                style={{
                  paddingLeft: 26,
                  paddingRight: 10,
                  background: "var(--color-bg-white)",
                  border: "1px solid var(--color-border)",
                  position: "relative",
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.45,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 9,
                    color: "var(--color-accent)",
                    fontSize: 8,
                    top: 9,
                  }}
                >
                  ✦
                </span>
                {n}
              </Box>
            ))}
          </Stack>
        ) : (
          <Text style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No intervention data available.</Text>
        )}
      </DetailSection>

      {/* Information Coverage & Gaps */}
      <DetailSection heading="Information Coverage &amp; Gaps">
        {icEntries.length > 0 ? (
          <Stack gap={6}>
            {icEntries.map((e) => {
              const c = coverageColors(e.coverage);
              const pct = Math.round((e.coverage / 10) * 100);
              return (
                <Box
                  key={e.pillar}
                  p="9px 12px"
                  style={{
                    background: "var(--color-bg-white)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Group mb={4} justify="space-between" gap={8}>
                    <Text
                      style={{
                        fontSize: 9.5,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--color-text-muted)",
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
                          height: 3,
                          background: "var(--color-bg-muted)",
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
                  <Stack gap={1}>
                    {e.gaps.map((g) => (
                      <Text
                        key={g}
                        style={{
                          fontSize: 10.5,
                          color: "var(--color-text-muted)",
                          paddingLeft: 9,
                          position: "relative",
                          lineHeight: 1.4,
                        }}
                      >
                        <span style={{ position: "absolute", left: 1, color: "var(--color-border-dark)" }}>·</span>
                        {g}
                      </Text>
                    ))}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Text style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No coverage data available.</Text>
        )}
      </DetailSection>
    </Box>
  );
}

function DetailSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Box mb={20}>
      <Group
        gap={6}
        mb={10}
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--color-text-muted)",
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--color-text-muted)",
            whiteSpace: "nowrap",
          }}
          dangerouslySetInnerHTML={{ __html: heading }}
        />
        <Box
          style={{ flex: 1, height: 1, background: "var(--color-border)" }}
        />
      </Group>
      {children}
    </Box>
  );
}
