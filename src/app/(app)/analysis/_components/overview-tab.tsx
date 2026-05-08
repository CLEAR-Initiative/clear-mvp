"use client";

import { Box, Group, Loader, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import type { CountryData } from "./saf-data";
import { fmtNumber } from "./saf-data";

/* ── helpers ─────────────────────────────────────────────────────────── */
const KPI_COLOR: Record<string, string> = {
  displaced: "var(--color-info)",
  affected: "var(--color-warning)",
  killed: "var(--color-critical)",
  "in need": "var(--color-info)",
};

const KPI_LABEL: Record<string, string> = {
  displaced: "Displaced",
  affected: "Affected",
  killed: "Killed",
  "in need": "In Need",
};

/* ── component ───────────────────────────────────────────────────────── */
interface OverviewTabProps {
  countryData: CountryData;
  generatedSummary: string | null;
  llmIsPending: boolean;
  onGenerateSummary: () => void;
}

export function OverviewTab({
  countryData,
  generatedSummary,
  llmIsPending,
}: OverviewTabProps) {
  const {
    FINAL_NUMBERS_DATA,
    OUTPUT_CONTEXT_RISKS_DATA,
    CURRENT_HAZARDS_AND_THREATS_DATA,
    PRECRISIS_VULNERABILITIES_DATA,
    DISPLACEMENT_RISKS_DATA,
  } = countryData;

  return (
    <Stack gap={20} pb={32}>
      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <Group gap={10} wrap="wrap">
        {FINAL_NUMBERS_DATA.map((d) => (
          <Box
            key={d.what_happened}
            px={18}
            py={14}
            style={{
              background: "var(--color-bg-white)",
              border: "1px solid var(--color-border)",
              flex: 1,
              minWidth: 140,
            }}
          >
            <Text
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: "var(--color-text-muted)",
                marginBottom: 5,
              }}
            >
              {KPI_LABEL[d.what_happened] ?? d.what_happened}
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: 3,
                color: KPI_COLOR[d.what_happened] ?? "var(--color-info)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtNumber(d.number)}
            </Text>
            <Text style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
              {d.unit}
            </Text>
          </Box>
        ))}
      </Group>

      {/* ── AI Situation Summary ──────────────────────────────────── */}
      <Box
        p={20}
        style={{
          background: "var(--color-bg-white)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Group gap={6} mb={10}>
          {llmIsPending ? (
            <Loader size={10} color="var(--color-accent)" />
          ) : (
            <Box
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--color-accent)",
                animation: "pulse-dot 2.5s ease-in-out infinite",
                flexShrink: 0,
              }}
            />
          )}
          <Text
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-text-muted)",
            }}
          >
            AI Situation Summary
          </Text>
          <IconSparkles
            size={11}
            style={{ color: "var(--color-ai)", marginLeft: 2 }}
          />
        </Group>

        {llmIsPending ? (
          <Stack gap={8}>
            {[94, 100, 87, 98, 72].map((w, i) => (
              <Box
                key={i}
                style={{
                  height: 12,
                  width: `${w}%`,
                  background: "var(--color-bg-muted)",
                  borderRadius: 2,
                  animation: "pulse-dot 1.3s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </Stack>
        ) : generatedSummary ? (
          <Text
            style={{
              fontSize: 13,
              color: "var(--color-text-primary)",
              lineHeight: 1.68,
            }}
          >
            {generatedSummary}
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic" }}>
            Click &ldquo;Generate Summary&rdquo; in the header to produce an AI situation summary.
          </Text>
        )}
      </Box>

      {/* ── Context Risks ─────────────────────────────────────────── */}
      <SectionHeading>Context Risks</SectionHeading>
      <Box
        style={{
          background: "var(--color-bg-white)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        {Object.entries(OUTPUT_CONTEXT_RISKS_DATA)
          .filter(([, v]) => v?.length)
          .map(([cat, items], idx, arr) => (
            <Box
              key={cat}
              style={{
                display: "grid",
                gridTemplateColumns: "130px 1fr",
                borderBottom:
                  idx < arr.length - 1 ? "1px solid var(--color-border)" : "none",
              }}
            >
              <Box
                px={14}
                pt={12}
                pb={10}
                style={{
                  background: "var(--color-bg-muted)",
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                <Text
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {cat}
                </Text>
              </Box>
              <Box px={14} py={10}>
                <Stack gap={3}>
                  {items.map((item) => (
                    <Text
                      key={item}
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.45,
                        paddingLeft: 12,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        –
                      </span>
                      {item}
                    </Text>
                  ))}
                </Stack>
              </Box>
            </Box>
          ))}
      </Box>

      {/* ── Hazards & Pre-Crisis Vulnerabilities ──────────────────── */}
      <SectionHeading>Hazards &amp; Pre-Crisis Vulnerabilities</SectionHeading>
      <SimpleGrid cols={2} spacing={12}>
        <RiskBlock
          variant="critical"
          heading="Current Hazards"
          items={CURRENT_HAZARDS_AND_THREATS_DATA}
        />
        <RiskBlock
          variant="warning"
          heading="Pre-Crisis Vulnerabilities"
          items={PRECRISIS_VULNERABILITIES_DATA}
        />
      </SimpleGrid>

      {/* ── Displacement ──────────────────────────────────────────── */}
      <SectionHeading>Displacement</SectionHeading>
      <SimpleGrid cols={2} spacing={12}>
        <RiskBlock
          variant="info"
          heading="Push Factors"
          items={DISPLACEMENT_RISKS_DATA["Push Factors"]}
        />
        <RiskBlock
          variant="success"
          heading="Return Intentions"
          items={DISPLACEMENT_RISKS_DATA.Intentions}
        />
      </SimpleGrid>
    </Stack>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Box
      pb={7}
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          color: "var(--color-text-muted)",
        }}
      >
        {children}
      </Text>
    </Box>
  );
}

const RISK_BLOCK_STYLES = {
  critical: {
    border: "var(--color-critical)",
    bg: "var(--color-critical-light)",
    textColor: "var(--color-critical)",
  },
  warning: {
    border: "var(--color-warning)",
    bg: "var(--color-warning-light)",
    textColor: "var(--color-warning)",
  },
  info: {
    border: "var(--color-info)",
    bg: "var(--color-info-light)",
    textColor: "var(--color-info)",
  },
  success: {
    border: "var(--color-success)",
    bg: "var(--color-success-light)",
    textColor: "var(--color-success)",
  },
} as const;

function RiskBlock({
  variant,
  heading,
  items,
}: {
  variant: keyof typeof RISK_BLOCK_STYLES;
  heading: string;
  items: string[];
}) {
  const s = RISK_BLOCK_STYLES[variant];
  return (
    <Box
      p={13}
      style={{
        borderLeft: `3px solid ${s.border}`,
        background: s.bg,
      }}
    >
      <Text
        mb={7}
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: s.textColor,
          opacity: 0.7,
        }}
      >
        {heading}
      </Text>
      <Stack gap={4} component="ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => (
          <Box
            key={item}
            component="li"
            style={{
              fontSize: 12,
              lineHeight: 1.45,
              paddingLeft: 10,
              position: "relative",
              color: "var(--color-text-secondary)",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 1,
                fontSize: 14,
                lineHeight: 1,
                color: s.border,
              }}
            >
              ·
            </span>
            {item}
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
