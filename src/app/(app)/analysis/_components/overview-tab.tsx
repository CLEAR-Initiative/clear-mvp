"use client";

import { Badge, Box, Card, Group, Loader, SimpleGrid, Stack, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowNarrowDown,
  IconArrowNarrowUp,
  IconSparkles,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import type { CountryData } from "./saf-data";
import { fmtNumber } from "./saf-data";

/* ── KPI config ───────────────────────────────────────────────────── */

type KpiKey = "displaced" | "affected" | "killed" | "in need" | string;

const KPI_META: Record<
  KpiKey,
  { label: string; icon: React.ElementType; iconColor: string; iconBg: string }
> = {
  displaced: {
    label: "Displaced",
    icon: IconUsers,
    iconColor: "#E85D3D",
    iconBg: "#FEF2F0",
  },
  affected: {
    label: "Affected",
    icon: IconWorld,
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
  },
  killed: {
    label: "Killed",
    icon: IconAlertTriangle,
    iconColor: "#DC2626",
    iconBg: "#FEF2F2",
  },
  "in need": {
    label: "In Need",
    icon: IconUsers,
    iconColor: "#D97706",
    iconBg: "#FEF3C7",
  },
};

const KPI_FALLBACK = {
  label: (key: string) => key.charAt(0).toUpperCase() + key.slice(1),
  icon: IconWorld,
  iconColor: "#525252",
  iconBg: "#F5F5F5",
};

/* ── Section card ─────────────────────────────────────────────────── */

function SectionCard({
  title,
  children,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
      <Box px={16} py={12} className="border-b border-[#E5E5E5]">
        <Group justify="space-between">
          <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
            {title}
          </Text>
          {badge}
        </Group>
      </Box>
      <Box p={16}>{children}</Box>
    </Card>
  );
}

/* ── Bullet list ──────────────────────────────────────────────────── */

function BulletList({ items, accentColor }: { items: string[]; accentColor?: string }) {
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

/* ── Push/intention block ─────────────────────────────────────────── */

function DisplacementCard({
  heading,
  items,
  icon: Icon,
  accentColor,
  iconBg,
}: {
  heading: string;
  items: string[];
  icon: React.ElementType;
  accentColor: string;
  iconBg: string;
}) {
  return (
    <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
      <Box px={16} py={12} className="border-b border-[#E5E5E5]">
        <Group gap={8}>
          <Box
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={13} color={accentColor} />
          </Box>
          <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
            {heading}
          </Text>
        </Group>
      </Box>
      <Box p={16}>
        <BulletList items={items} accentColor={accentColor} />
      </Box>
    </Card>
  );
}

/* ── Component ────────────────────────────────────────────────────── */

interface OverviewTabProps {
  countryData: CountryData;
  generatedSummary: string | null;
  llmIsPending: boolean;
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
    <Stack gap={16} pb={32}>

      {/* ── KPI row ──────────────────────────────────────────────── */}
      <Group gap={12} wrap="nowrap" style={{ overflowX: "auto" }}>
        {FINAL_NUMBERS_DATA.map((d) => {
          const meta = KPI_META[d.what_happened];
          const Icon = meta?.icon ?? KPI_FALLBACK.icon;
          const iconColor = meta?.iconColor ?? KPI_FALLBACK.iconColor;
          const iconBg = meta?.iconBg ?? KPI_FALLBACK.iconBg;
          const label = meta?.label ?? KPI_FALLBACK.label(d.what_happened);
          return (
            <Box
              key={d.what_happened}
              p={16}
              style={{
                flex: 1,
                minWidth: 160,
                background: "#FFF",
                border: "1px solid #E5E5E5",
                borderRadius: 8,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color={iconColor} />
              </Box>
              <Box>
                <Text
                  fw={700}
                  c="#171717"
                  style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.02em" }}
                >
                  {fmtNumber(d.number)}
                </Text>
                <Text size="xs" c="#737373" mt={2}>
                  {label} · {d.unit}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Group>

      {/* ── AI Situation Summary ─────────────────────────────────── */}
      <SectionCard
        title="Summary"
        badge={
          <Badge
            size="xs"
            style={{
              background: "#F3E8FF",
              color: "#7C3AED",
              border: "1px solid #7C3AED25",
              fontWeight: 600,
            }}
          >
            <Group gap={4} wrap="nowrap">
              <IconSparkles size={10} />
              AI generated
            </Group>
          </Badge>
        }
      >
        {llmIsPending ? (
          <Stack gap={8}>
            {[94, 100, 87, 98, 72].map((w, i) => (
              <Box
                key={i}
                style={{
                  height: 12,
                  width: `${w}%`,
                  background: "#F5F5F5",
                  borderRadius: 2,
                  animation: "pulse-dot 1.3s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </Stack>
        ) : generatedSummary ? (
          <Text size="sm" c="#374151" style={{ lineHeight: 1.75 }}>
            {generatedSummary}
          </Text>
        ) : (
          <Group gap={6}>
            {llmIsPending && <Loader size={10} />}
            <Text size="sm" c="#A3A3A3" style={{ fontStyle: "italic" }}>
              AI situation summary will appear here once generated.
            </Text>
          </Group>
        )}
      </SectionCard>

      {/* ── Context Risks ────────────────────────────────────────── */}
      <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
        <Box px={16} py={12} className="border-b border-[#E5E5E5]">
          <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
            Context Risks
          </Text>
        </Box>
        {Object.entries(OUTPUT_CONTEXT_RISKS_DATA)
          .filter(([, v]) => v?.length)
          .map(([cat, items], idx, arr) => (
            <Box
              key={cat}
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                borderBottom: idx < arr.length - 1 ? "1px solid #E5E5E5" : "none",
              }}
            >
              <Box
                px={16}
                pt={12}
                pb={10}
                style={{
                  background: "#FAFAFA",
                  borderRight: "1px solid #E5E5E5",
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#525252",
                  }}
                >
                  {cat}
                </Text>
              </Box>
              <Box px={16} py={10}>
                <Stack gap={4}>
                  {items.map((item) => (
                    <Text
                      key={item}
                      size="sm"
                      c="#374151"
                      style={{ lineHeight: 1.6, paddingLeft: 12, position: "relative" }}
                    >
                      <span style={{ position: "absolute", left: 1, color: "#A3A3A3" }}>–</span>
                      {item}
                    </Text>
                  ))}
                </Stack>
              </Box>
            </Box>
          ))}
      </Card>

      {/* ── Hazards & Pre-Crisis Vulnerabilities ─────────────────── */}
      <SimpleGrid cols={2} spacing={12}>
        <SectionCard title="Current Hazards & Threats">
          <BulletList items={CURRENT_HAZARDS_AND_THREATS_DATA} accentColor="#E85D3D" />
        </SectionCard>
        <SectionCard title="Pre-Crisis Vulnerabilities">
          <BulletList items={PRECRISIS_VULNERABILITIES_DATA} accentColor="#D97706" />
        </SectionCard>
      </SimpleGrid>

      {/* ── Displacement ─────────────────────────────────────────── */}
      <SimpleGrid cols={2} spacing={12}>
        <DisplacementCard
          heading="Push Factors"
          items={DISPLACEMENT_RISKS_DATA["Push Factors"]}
          icon={IconArrowNarrowUp}
          accentColor="#2563EB"
          iconBg="#EFF6FF"
        />
        <DisplacementCard
          heading="Return Intentions"
          items={DISPLACEMENT_RISKS_DATA.Intentions}
          icon={IconArrowNarrowDown}
          accentColor="#059669"
          iconBg="#ECFDF5"
        />
      </SimpleGrid>

    </Stack>
  );
}
