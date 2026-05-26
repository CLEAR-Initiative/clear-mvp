"use client";

import { useState, useMemo } from "react";
import { Box, Text, Group, Badge, Stack } from "@mantine/core";
import {
  IconHome2,
  IconDroplet,
  IconShield,
  IconHeart,
  IconToolsKitchen2,
  IconBook,
  IconChevronRight,
  IconChevronDown,
  IconBuilding,
} from "@tabler/icons-react";
import type { GqlCrisis } from "~/server/api/routers/crises";

// ── SAF scale ─────────────────────────────────────────────────────────────────

const SAF_SCALE = [
  { min: 80, level: "Catastrophic", color: "var(--color-critical)",  bg: "var(--color-critical-light)" },
  { min: 65, level: "Extreme",      color: "var(--color-critical)",  bg: "var(--color-critical-light)" },
  { min: 45, level: "Severe",       color: "var(--color-warning)",   bg: "var(--color-warning-light)"  },
  { min: 25, level: "Stressed",     color: "var(--color-info)",      bg: "var(--color-info-light)"     },
  { min: 0,  level: "Minimal",      color: "var(--color-success)",   bg: "var(--color-success-light)"  },
] as const;

const UNKNOWN_SAF = { level: "Unknown", color: "var(--color-text-muted)", bg: "var(--color-bg-muted)" };

function getSafLevel(score: number | null) {
  if (score === null) return UNKNOWN_SAF;
  return SAF_SCALE.find((s) => score >= s.min) ?? UNKNOWN_SAF;
}

const SAF_ORDER: Record<string, number> = {
  Catastrophic: 0,
  Extreme: 1,
  Severe: 2,
  Stressed: 3,
  Minimal: 4,
  Unknown: 5,
};

// ── OCHA 3W types ─────────────────────────────────────────────────────────────

interface Ocha3wSector {
  code: string;
  name: string;
  org_count: number;
  by_type: Record<string, number>;
  organizations?: { acronym: string; name: string; type: string }[];
}

interface Ocha3wData {
  as_of?: string;
  sectors: Ocha3wSector[];
}

// ── Sector definitions ────────────────────────────────────────────────────────

type SectorIcon = React.ComponentType<{ size?: number; color?: string }>;

const SECTORS: {
  key: string;
  label: string;
  icon: SectorIcon;
  ochaCodes: string[];
  demoScore: number;
}[] = [
  { key: "shelter",   label: "Shelter",       icon: IconHome2,          ochaCodes: ["SHL", "SNFI", "NFI"],              demoScore: 65 },
  { key: "wash",      label: "WASH",          icon: IconDroplet,        ochaCodes: ["WSH", "WASH", "WS"],               demoScore: 55 },
  { key: "protection",label: "Protection",    icon: IconShield,         ochaCodes: ["PRO", "CP", "GBV"],                demoScore: 70 },
  { key: "health",    label: "Health",        icon: IconHeart,          ochaCodes: ["HLT", "HEA", "HEALTH"],            demoScore: 60 },
  { key: "food",      label: "Food Security", icon: IconToolsKitchen2,  ochaCodes: ["FSL", "FSC", "FOOD", "FSLA"],      demoScore: 80 },
  { key: "education", label: "Education",     icon: IconBook,           ochaCodes: ["EDU"],                             demoScore: 38 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

type A2Location = { id: string; name: string; level: number; metadata?: { type: string; data: unknown }[] | null } | null;

function findA2InLocation(loc: { level: number; ancestors?: { id: string; name: string; level: number; metadata?: { type: string; data: unknown }[] | null }[] } | null): A2Location {
  if (!loc) return null;
  if (loc.level === 2) return loc as A2Location;
  return loc.ancestors?.find((a) => a.level === 2) ?? null;
}

function resolveA2(crisis: GqlCrisis): A2Location {
  const direct = findA2InLocation(crisis.generalLocation);
  if (direct) return direct;
  for (const event of crisis.events ?? []) {
    const e = event as { generalLocation?: typeof crisis.generalLocation; originLocation?: typeof crisis.generalLocation };
    const fromGeneral = findA2InLocation(e.generalLocation ?? null);
    if (fromGeneral) return fromGeneral;
    const fromOrigin = findA2InLocation(e.originLocation ?? null);
    if (fromOrigin) return fromOrigin;
  }
  return null;
}

function parseOcha3w(crisis: GqlCrisis): Ocha3wData | null {
  const a2 = resolveA2(crisis);
  if (!a2) return null;
  const meta = (a2 as { metadata?: { type: string; data: unknown }[] }).metadata;
  if (!meta) return null;
  const entry = meta.find((m) => m.type === "ocha_3w");
  if (!entry) return null;
  const d = entry.data as Record<string, unknown>;
  if (!Array.isArray(d.sectors)) return null;
  return d as unknown as Ocha3wData;
}

function matchOchasector(ochaSectors: Ocha3wSector[], codes: string[]): Ocha3wSector | null {
  const upper = codes.map((c) => c.toUpperCase());
  return (
    ochaSectors.find((s) => upper.includes(s.code.toUpperCase())) ?? null
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectorRow({
  label,
  Icon,
  score,
  ochaData,
  isLast,
}: {
  label: string;
  Icon: SectorIcon;
  score: number | null;
  ochaData: Ocha3wSector | null;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const saf = getSafLevel(score);
  const Chevron = open ? IconChevronDown : IconChevronRight;

  return (
    <Box>
      {/* Row */}
      <Box
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-[var(--color-bg-muted)]"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px 180px 24px",
          alignItems: "center",
          columnGap: 16,
          padding: "12px 16px",
          borderBottom: open || !isLast ? "1px solid var(--color-border)" : undefined,
          cursor: "pointer",
          transition: "background 100ms",
        }}
      >
        {/* Sector */}
        <Group gap={10} wrap="nowrap">
          <Box
            style={{
              width: 32, height: 32, borderRadius: 6,
              background: "var(--color-bg-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={16} color="var(--color-text-secondary)" />
          </Box>
          <Text fw={600} size="sm" c="var(--color-text-primary)">{label}</Text>
        </Group>

        {/* Severity */}
        <Box>
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: saf.bg,
              color: saf.color,
            }}
          >
            {saf.level}
          </span>
          {score !== null && (
            <Text size="xs" c="var(--color-text-muted)" mt={2}>{score}/100</Text>
          )}
        </Box>

        {/* Operational presence */}
        <Box>
          {ochaData ? (
            <Group gap={6} wrap="wrap">
              <Group gap={4} wrap="nowrap">
                <IconBuilding size={12} color="var(--color-text-muted)" />
                <Text size="xs" fw={600} c="var(--color-text-primary)">{ochaData.org_count} org{ochaData.org_count !== 1 ? "s" : ""}</Text>
              </Group>
              {Object.entries(ochaData.by_type).slice(0, 3).map(([type, count]) => (
                <Badge
                  key={type}
                  size="xs"
                  style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", fontWeight: 500 }}
                >
                  {count} {type.replace("Government", "Govt").replace("International", "Intl")}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text size="xs" c="var(--color-text-muted)">No presence data</Text>
          )}
        </Box>

        {/* Chevron */}
        <Chevron size={14} color="var(--color-text-muted)" />
      </Box>

      {/* Expanded detail */}
      {open && (
        <Box
          px={16}
          py={14}
          style={{
            background: "var(--color-bg-muted)",
            borderBottom: isLast ? undefined : "1px solid var(--color-border)",
          }}
        >
          {ochaData?.organizations && ochaData.organizations.length > 0 ? (
            <Stack gap={4}>
              <Text size="xs" fw={700} c="var(--color-text-secondary)" tt="uppercase" style={{ letterSpacing: "0.04em", fontSize: 10 }} mb={4}>
                Organisations active in this area
              </Text>
              {ochaData.organizations.slice(0, 10).map((org) => (
                <Group key={org.acronym} gap={8} wrap="nowrap">
                  <Text size="xs" fw={600} c="var(--color-text-primary)" style={{ minWidth: 60 }}>{org.acronym}</Text>
                  <Text size="xs" c="var(--color-text-secondary)" truncate>{org.name}</Text>
                  <Badge size="xs" style={{ background: "var(--color-bg-white)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)", flexShrink: 0 }}>
                    {org.type}
                  </Badge>
                </Group>
              ))}
              {ochaData.organizations.length > 10 && (
                <Text size="xs" c="var(--color-text-muted)" mt={4}>+{ochaData.organizations.length - 10} more</Text>
              )}
            </Stack>
          ) : (
            <Text size="xs" c="var(--color-text-muted)">
              Detailed sector breakdown coming soon.
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Column header ─────────────────────────────────────────────────────────────

function ColHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <Text
      size="xs"
      fw={700}
      c="var(--color-text-muted)"
      tt="uppercase"
      style={{ letterSpacing: "0.05em", fontSize: 10, ...style }}
    >
      {children}
    </Text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NeedsAssessmentPanelProps {
  crisis: GqlCrisis;
}

export function NeedsAssessmentPanel({ crisis }: NeedsAssessmentPanelProps) {
  const ocha3w = useMemo(() => parseOcha3w(crisis), [crisis]);
  const a2 = useMemo(() => resolveA2(crisis), [crisis]);

  const rows = useMemo(() => {
    return SECTORS.map((sector) => {
      const ochaMatch = ocha3w ? matchOchasector(ocha3w.sectors, sector.ochaCodes) : null;
      // SAF score: use demo scores until backend has this data
      const score = sector.demoScore;
      const saf = getSafLevel(score);
      return { ...sector, score, saf, ochaMatch };
    }).sort((a, b) => SAF_ORDER[a.saf.level]! - SAF_ORDER[b.saf.level]!);
  }, [ocha3w]);

  return (
    <Box p={24}>
      {/* Panel card */}
      <Box style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}>
        {/* Header */}
        <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap={8} align="center">
              <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                Sector Needs Assessment
              </Text>
              {a2 && (
                <Badge size="xs" style={{ background: "var(--color-info-light)", color: "var(--color-info)" }}>
                  {a2.name}
                </Badge>
              )}
            </Group>
            <Group gap={16} align="center">
              <Text size="xs" c="var(--color-text-muted)">
                {ocha3w?.as_of ? `3W as of ${new Date(ocha3w.as_of).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : "3W data unavailable"}
              </Text>
              <Badge size="xs" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-muted)" }}>
                SAF demo scores
              </Badge>
            </Group>
          </Group>
        </Box>

        {/* Column headers */}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 180px 24px",
            columnGap: 16,
            padding: "8px 16px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-muted)",
          }}
        >
          <ColHeader>Sector</ColHeader>
          <ColHeader>Severity</ColHeader>
          <ColHeader>Operational Presence</ColHeader>
          <Box />
        </Box>

        {/* Sector rows */}
        {rows.map((row, idx) => (
          <SectorRow
            key={row.key}
            label={row.label}
            Icon={row.icon}
            score={row.score}
            ochaData={row.ochaMatch}
            isLast={idx === rows.length - 1}
          />
        ))}
      </Box>
    </Box>
  );
}
