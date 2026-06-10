"use client";

import { useState, useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Text, Group, Badge, Stack, Modal, List } from "@mantine/core";
import {
  IconHome2,
  IconDroplet,
  IconShield,
  IconHeart,
  IconToolsKitchen2,
  IconBook,
  IconChevronRight,
  IconChevronDown,
  IconInfoCircle,
} from "@tabler/icons-react";
import type { GqlCrisis } from "~/server/api/routers/crises";

// ── SAF scale ─────────────────────────────────────────────────────────────────

const SAF_COLORS: Record<string, { color: string; bg: string }> = {
  Catastrophic: { color: "var(--color-critical)", bg: "var(--color-critical-light)" },
  Extreme:      { color: "var(--color-critical)", bg: "var(--color-critical-light)" },
  Severe:       { color: "var(--color-warning)",  bg: "var(--color-warning-light)"  },
  Stressed:     { color: "var(--color-info)",     bg: "var(--color-info-light)"     },
  Minimal:      { color: "var(--color-success)",  bg: "var(--color-success-light)"  },
};
const UNKNOWN_SAF_COLORS = { color: "var(--color-text-muted)", bg: "var(--color-bg-muted)" };

function getSafColors(severity: string | null) {
  if (!severity) return UNKNOWN_SAF_COLORS;
  return SAF_COLORS[severity] ?? UNKNOWN_SAF_COLORS;
}

const SAF_ORDER: Record<string, number> = {
  Catastrophic: 0,
  Extreme: 1,
  Severe: 2,
  Stressed: 3,
  Minimal: 4,
  Unknown: 5,
};

// Known SAF level values -> i18n keys under crisisDetail.needs.saf.*
// Unrecognised values coming from the API fall back to the raw string.
const SAF_LABEL_KEYS: Record<string, "catastrophic" | "extreme" | "severe" | "stressed" | "minimal" | "unknown"> = {
  Catastrophic: "catastrophic",
  Extreme: "extreme",
  Severe: "severe",
  Stressed: "stressed",
  Minimal: "minimal",
  Unknown: "unknown",
};

// ── MSNA types ────────────────────────────────────────────────────────────────

interface MsnaSectorEntry {
  label: string;
  score: number;
  inputs: Record<string, number>;
}
type MsnaData = Record<string, MsnaSectorEntry>;

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

// key doubles as the i18n key under crisisDetail.needs.sectors.*;
// label stays English because it is also the lookup key into the pipeline `needs.sector` payload.
type SectorKey = "shelter" | "wash" | "protection" | "health" | "food" | "education";

const SECTORS: {
  key: SectorKey;
  label: string;
  icon: SectorIcon;
  ochaCodes: string[];
  msnaKey: string;
}[] = [
  { key: "shelter",    label: "Shelter",       icon: IconHome2,         ochaCodes: ["SHL", "SNFI", "NFI"],         msnaKey: "Shelter"    },
  { key: "wash",       label: "WASH",          icon: IconDroplet,       ochaCodes: ["WSH", "WASH", "WS"],          msnaKey: "WASH"       },
  { key: "protection", label: "Protection",    icon: IconShield,        ochaCodes: ["PRO", "CP", "GBV"],           msnaKey: "Protection" },
  { key: "health",     label: "Health",        icon: IconHeart,         ochaCodes: ["HLT", "HEA", "HEALTH"],       msnaKey: "Health"     },
  { key: "food",       label: "Food Security", icon: IconToolsKitchen2, ochaCodes: ["FSL", "FSC", "FOOD", "FSLA"], msnaKey: "FSL"        },
  { key: "education",  label: "Education",     icon: IconBook,          ochaCodes: ["EDU"],                        msnaKey: "Education"  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

type A2Location = { id: string; name: string; level: number; population?: string | null; metadata?: { type: string; data: unknown }[] | null } | null;

function findA2InLocation(loc: { level: number; population?: string | null; ancestors?: { id: string; name: string; level: number; population?: string | null; metadata?: { type: string; data: unknown }[] | null }[] } | null): A2Location {
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

function parseMsna(crisis: GqlCrisis): MsnaData | null {
  const a2 = resolveA2(crisis);
  if (!a2) return null;
  const meta = (a2 as { metadata?: { type: string; data: unknown }[] }).metadata;
  if (!meta) return null;
  const entry = meta.find((m) => m.type === "msna_severity_082025");
  if (!entry) return null;
  const d = entry.data as Record<string, unknown>;
  const sectors = d.sectors;
  if (!sectors || typeof sectors !== "object" || Array.isArray(sectors)) return null;
  return sectors as MsnaData;
}

// ── PIN calculation ───────────────────────────────────────────────────────────

// Education score represents % of school-age children not attending, so multiply
// by the child share of total population until WorldPop age-sex data lands.
const CHILD_SHARE_APPROX = 0.18;

function formatPin(n: number): string {
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `~${Math.round(n / 1_000)}k`;
  return `~${n}`;
}

// ── Org type abbreviations ────────────────────────────────────────────────────

const ORG_TYPE_ABBREV: Record<string, string> = {
  "United Nations":           "UN",
  "International NGO":        "INGO",
  "National NGO":             "NNGO",
  "Government":               "Gov",
  "Red Cross / Red Crescent": "RCRC",
  "Other":                    "Other",
};

function abbreviateOrgType(type: string): string {
  return ORG_TYPE_ABBREV[type] ?? type.slice(0, 6);
}

// Fixed at 3 slots per column so every row renders at the same height.
const ORG_SLOTS = 3;
const ROW_H = 14; // px per label row (10px font + leading)
const ROW_GAP = 2; // px between rows
const PRESENCE_H = ORG_SLOTS * ROW_H + (ORG_SLOTS - 1) * ROW_GAP; // 46px

function OrgColumn({ entries }: { entries: [string, number][] }) {
  return (
    <Box style={{ display: "flex", flexDirection: "column", gap: ROW_GAP, height: PRESENCE_H, justifyContent: "center" }}>
      {Array.from({ length: ORG_SLOTS }).map((_, i) => {
        const entry = entries[i];
        return entry ? (
          <Box key={entry[0]} style={{ display: "flex", alignItems: "baseline", gap: 5, height: ROW_H }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", minWidth: 34, lineHeight: 1 }}>
              {abbreviateOrgType(entry[0])}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", lineHeight: 1 }}>
              {entry[1]}
            </Text>
          </Box>
        ) : (
          <Box key={i} style={{ height: ROW_H }} />
        );
      })}
    </Box>
  );
}

function OrgPresence({ byType, total }: { byType: Record<string, number>; total: number }) {
  const entries = Object.entries(byType)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a);

  const col1 = entries.slice(0, ORG_SLOTS);
  const col2 = entries.slice(ORG_SLOTS, ORG_SLOTS * 2);

  return (
    <Box style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1, flexShrink: 0 }}>
        {total}
      </Text>
      <OrgColumn entries={col1} />
      {col2.length > 0 && <OrgColumn entries={col2} />}
    </Box>
  );
}

function matchOchasector(ochaSectors: Ocha3wSector[], codes: string[]): Ocha3wSector | null {
  const upper = codes.map((c) => c.toUpperCase());
  return (
    ochaSectors.find((s) => upper.includes(s.code.toUpperCase())) ?? null
  );
}

// ── Assessment types ──────────────────────────────────────────────────────────

type AssessmentLevel = 1 | 2 | 3;
type Precision = "District" | "Locality";

// labelKey: i18n keys under crisisDetail.needs.levels.* - resolved via t() at render time.
const LEVEL_STYLE: Record<AssessmentLevel, { labelKey: "baseline" | "aiReview" | "rna"; color: string; bg: string }> = {
  1: { labelKey: "baseline", color: "var(--color-text-muted)", bg: "var(--color-bg-muted)"   },
  2: { labelKey: "aiReview", color: "var(--color-ai)",         bg: "var(--color-ai-light)"   },
  3: { labelKey: "rna",      color: "var(--color-info)",       bg: "var(--color-info-light)" },
};

// ── Assessment bar ────────────────────────────────────────────────────────────

function AssessmentBar({ level }: { level: AssessmentLevel }) {
  const t = useTranslations("crisisDetail");
  const s = LEVEL_STYLE[level];
  return (
    <Box style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Box style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {[3, 2, 1].map((l) => (
          <Box
            key={l}
            style={{
              width: 14,
              height: 4,
              borderRadius: 2,
              background: l <= level ? s.color : "var(--color-border)",
            }}
          />
        ))}
      </Box>
      <Text style={{ fontSize: 11, fontWeight: 600, color: s.color, lineHeight: 1 }}>
        {t(`needs.levels.${s.labelKey}`)}
      </Text>
    </Box>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectorRow({
  label,
  Icon,
  severity,
  description,
  responseGap,
  nrcRelevant,
  ochaData,
  pin,
  pinIsApprox,
  assessmentLevel,
  precision,
  isLast,
}: {
  label: string;
  Icon: SectorIcon;
  severity: string | null;
  description: string | null;
  responseGap: boolean | null;
  nrcRelevant: boolean | null;
  ochaData: Ocha3wSector | null;
  pin: number | null;
  pinIsApprox: boolean;
  assessmentLevel: AssessmentLevel;
  precision: Precision | null;
  isLast: boolean;
}) {
  const t = useTranslations("crisisDetail");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const saf = getSafColors(severity);
  const rawLevel = severity ?? "Unknown";
  const safKey = SAF_LABEL_KEYS[rawLevel];
  const displayLevel = safKey ? t(`needs.saf.${safKey}`) : rawLevel;
  const Chevron = open ? IconChevronDown : IconChevronRight;

  return (
    <Box>
      {/* Row */}
      <Box
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-[var(--color-bg-muted)]"
        style={{
          display: "grid",
          gridTemplateColumns: "180px 110px 100px 150px 120px 70px 24px",
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
            {displayLevel}
          </span>
        </Box>

        {/* People in need */}
        <Box>
          {pin != null ? (
            <Box>
              <Text style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
                {formatPin(pin)}
              </Text>
              {pinIsApprox && (
                <Text style={{ fontSize: 9, color: "var(--color-text-muted)", lineHeight: 1, marginTop: 2 }}>
                  {t("needs.estChildShare")}
                </Text>
              )}
            </Box>
          ) : (
            <Text size="xs" c="var(--color-text-muted)">-</Text>
          )}
        </Box>

        {/* Operational presence */}
        <Box>
          {ochaData ? (
            <OrgPresence byType={ochaData.by_type} total={ochaData.org_count} />
          ) : (
            <Text size="xs" c="var(--color-text-muted)">-</Text>
          )}
        </Box>

        {/* Assessment level */}
        <Box>
          <AssessmentBar level={assessmentLevel} />
        </Box>

        {/* Precision */}
        <Box>
          {precision ? (
            <Text style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)" }}>
              {t(`needs.precision.${precision === "District" ? "district" : "locality"}`)}
            </Text>
          ) : (
            <Text size="xs" c="var(--color-text-muted)">-</Text>
          )}
        </Box>

        {/* Chevron */}
        <Chevron size={14} color="var(--color-text-muted)" />
      </Box>

      {/* Expanded detail */}
      {open && (
        <Box
          style={{
            background: "var(--color-bg-muted)",
            borderBottom: isLast ? undefined : "1px solid var(--color-border)",
            paddingTop: 14,
            paddingBottom: 14,
            paddingRight: 16,
            paddingLeft: 58, // 16px outer + 32px icon + 10px gap = aligns with sector name
          }}
        >
          <Stack gap={14}>
            {/* Summary */}
            <Box>
              <Group gap={6} mb={6} align="center">
                <Text size="xs" fw={700} c="var(--color-text-secondary)" tt="uppercase" style={{ letterSpacing: "0.04em", fontSize: 10 }}>
                  {t("needs.summaryTitle")}
                </Text>
                <Badge size="xs" style={{ background: "var(--color-ai-light)", color: "var(--color-ai)", border: "1px solid var(--color-ai-border)", fontWeight: 600 }}>
                  {tCommon("badges.aiGenerated")}
                </Badge>
              </Group>
              {description ? (
                <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.6 }}>
                  {description}
                </Text>
              ) : (
                <Text size="xs" c="var(--color-text-muted)" style={{ fontStyle: "italic" }}>
                  {t("needs.aiSummaryComingSoon")}
                </Text>
              )}
            </Box>

            {/* Indicators */}
            {(responseGap === true || nrcRelevant === true) && (
              <Group gap={6}>
                {responseGap === true && (
                  <Badge size="xs" style={{ background: "var(--color-critical-light)", color: "var(--color-critical)" }}>
                    {t("needs.responseGap")}
                  </Badge>
                )}
                {nrcRelevant === true && (
                  <Badge size="xs" style={{ background: "var(--color-info-light)", color: "var(--color-info)" }}>
                    {t("needs.nrcMandate")}
                  </Badge>
                )}
              </Group>
            )}

            {/* 3W organisations */}
            {ochaData?.organizations && ochaData.organizations.length > 0 && (
              <Stack gap={4}>
                <Text size="xs" fw={700} c="var(--color-text-secondary)" tt="uppercase" style={{ letterSpacing: "0.04em", fontSize: 10 }} mb={4}>
                  {t("needs.orgsActive")}
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
                  <Text size="xs" c="var(--color-text-muted)" mt={4}>{t("needs.moreOrgs", { count: ochaData.organizations.length - 10 })}</Text>
                )}
              </Stack>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

// ── Info button ───────────────────────────────────────────────────────────────

function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "none", border: "none", padding: 0, cursor: "pointer",
        color: "var(--color-text-muted)", lineHeight: 1,
      }}
    >
      <IconInfoCircle size={12} />
    </button>
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

// ── Needs summary card ────────────────────────────────────────────────────────

interface SectorRowData {
  key: SectorKey;
  label: string;
  icon: SectorIcon;
  severity: string | null;
  description: string | null;
  responseGap: boolean | null;
  nrcRelevant: boolean | null;
  ochaMatch: Ocha3wSector | null;
  pin: number | null;
  pinIsApprox: boolean;
  assessmentLevel: AssessmentLevel;
  precision: Precision | null;
}

// Renders a text field that may contain plain prose or markdown-style bullet
// lines (- item / • item). Splits into paragraphs and <List> blocks.
// Single-block prose (no newlines) is split on sentence boundaries so long
// AI-generated paragraphs don't render as one dense wall of text.
function SummaryText({ text }: { text: string }) {
  type Block = { type: "para"; text: string } | { type: "list"; items: string[] };

  const blocks = useMemo<Block[]>(() => {
    const result: Block[] = [];
    let currentList: string[] | null = null;

    const lines = text.split("\n");

    // If the whole value is a single line (no newlines), split on sentence
    // boundaries (". " followed by a capital letter) so it reads as paragraphs.
    const expanded = lines.length === 1
      ? text.split(/(?<=\.)\s+(?=[A-Z])/)
      : lines;

    for (const raw of expanded) {
      const line = raw.trim();
      if (!line) {
        if (currentList) { result.push({ type: "list", items: currentList }); currentList = null; }
        continue;
      }
      const bulletMatch = line.match(/^[-•*]\s+(.*)/);
      if (bulletMatch) {
        if (!currentList) currentList = [];
        currentList.push(bulletMatch[1]!);
      } else {
        if (currentList) { result.push({ type: "list", items: currentList }); currentList = null; }
        result.push({ type: "para", text: line });
      }
    }
    if (currentList) result.push({ type: "list", items: currentList });
    return result;
  }, [text]);

  return (
    <Stack gap={8}>
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <List key={i} size="sm" spacing={4} style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
            {block.items.map((item, j) => (
              <List.Item key={j}>{item}</List.Item>
            ))}
          </List>
        ) : (
          <Text key={i} size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
            {block.text}
          </Text>
        )
      )}
    </Stack>
  );
}

function NeedsSummaryCard({ crisis, ocha3w, hasMsna }: { crisis: GqlCrisis; ocha3w: Ocha3wData | null; hasMsna: boolean }) {
  const t = useTranslations("crisisDetail");
  const format = useFormatter();
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(true);

  const generalSummary = useMemo(() => {
    const needs = crisis.needs as Record<string, unknown> | null | undefined;
    const raw = needs?.generalSummary;
    if (Array.isArray(raw)) {
      const bullets = (raw as unknown[])
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return bullets.length > 0 ? bullets : null;
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  }, [crisis.needs]);

  const ocha3wDate = ocha3w?.as_of
    ? format.dateTime(new Date(ocha3w.as_of), { month: "short", year: "numeric" })
    : null;

  return (
    <Box style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)", marginBottom: 12 }}>
      {/* Header */}
      <Box
        px={16} py={12}
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-[var(--color-bg-muted)]"
        style={{
          borderBottom: open ? "1px solid var(--color-border)" : undefined,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "background 100ms",
        }}
      >
        <Group gap={8} align="center">
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>{t("needs.summaryTitle")}</Text>
          <Badge
            size="xs"
            style={{
              background: "var(--color-ai-light)",
              color: "var(--color-ai)",
              border: "1px solid var(--color-ai-border)",
              fontWeight: 600,
            }}
          >
            {tCommon("badges.aiGenerated")}
          </Badge>
        </Group>
        {open
          ? <IconChevronDown size={14} color="var(--color-text-muted)" />
          : <IconChevronRight size={14} color="var(--color-text-muted)" />
        }
      </Box>

      {open && (
        <Box px={16} pt={10} pb={14}>
          {(ocha3wDate ?? hasMsna) && (
            <Text size="xs" c="var(--color-text-muted)" mb={10} style={{ lineHeight: 1.4 }}>
              {hasMsna && (
                <>{t.rich("needs.severityFromMsna", { b: (chunks) => <span style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>{chunks}</span> })}</>
              )}
              {ocha3wDate && (
                <>{hasMsna ? " " : ""}{t.rich("needs.presenceFromOcha", { date: ocha3wDate, b: (chunks) => <span style={{ fontWeight: 600, color: "var(--color-text-secondary)" }}>{chunks}</span> })}</>
              )}
            </Text>
          )}
          {Array.isArray(generalSummary) ? (
            <List size="sm" spacing={6} style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
              {generalSummary.map((bullet, i) => (
                <List.Item key={i}>{bullet}</List.Item>
              ))}
            </List>
          ) : generalSummary ? (
            <SummaryText text={generalSummary} />
          ) : (
            <Text size="xs" c="var(--color-text-muted)">
              {t("needs.generating")}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NeedsAssessmentPanelProps {
  crisis: GqlCrisis;
}

export function NeedsAssessmentPanel({ crisis }: NeedsAssessmentPanelProps) {
  const t = useTranslations("crisisDetail");
  const ocha3w = useMemo(() => parseOcha3w(crisis), [crisis]);
  const msna = useMemo(() => parseMsna(crisis), [crisis]);
  const a2 = useMemo(() => resolveA2(crisis), [crisis]);
  const [severityInfoOpen, setSeverityInfoOpen] = useState(false);
  const [presenceInfoOpen, setPresenceInfoOpen] = useState(false);
  const [pinInfoOpen, setPinInfoOpen] = useState(false);
  const [assessmentInfoOpen, setAssessmentInfoOpen] = useState(false);
  const [precisionInfoOpen, setPrecisionInfoOpen] = useState(false);

  const a2Pop = useMemo(() => {
    const raw = a2?.population;
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }, [a2]);

  const rows = useMemo<SectorRowData[]>(() => {
    const needsSector = (crisis.needs as Record<string, unknown> | null | undefined)?.sector as Record<string, Record<string, unknown>> | null | undefined;
    return SECTORS.map((sector) => {
      const ochaMatch = ocha3w ? matchOchasector(ocha3w.sectors, sector.ochaCodes) : null;
      const pipelineData = needsSector?.[sector.label];
      const msnaEntry = msna?.[sector.msnaKey];
      const msnaSeverity = msnaEntry?.label ?? null;
      const score = msnaEntry?.score ?? null;
      const pinIsApprox = sector.msnaKey === "Education";
      const effPop = pinIsApprox ? (a2Pop != null ? Math.round(a2Pop * CHILD_SHARE_APPROX) : null) : a2Pop;
      const pin = (score != null && effPop != null)
        ? Math.round((score / 100) * effPop)
        : null;
      // Hardcoded to Level 1 until the pipeline can assess severity from
      // contextual signals and reports rather than MSNA baseline data only.
      const assessmentLevel: AssessmentLevel = 1;
      const precision: Precision | null = a2 ? "District" : null;

      return {
        key: sector.key,
        label: sector.label,
        icon: sector.icon,
        severity: typeof pipelineData?.severity === "string" ? pipelineData.severity : msnaSeverity,
        description: typeof pipelineData?.description === "string" ? pipelineData.description : null,
        responseGap: typeof pipelineData?.responseGap === "boolean" ? pipelineData.responseGap : null,
        nrcRelevant: typeof pipelineData?.nrcRelevant === "boolean" ? pipelineData.nrcRelevant : null,
        ochaMatch,
        pin,
        pinIsApprox,
        assessmentLevel,
        precision,
      };
    }).sort((a, b) => (SAF_ORDER[a.severity ?? "Unknown"] ?? 5) - (SAF_ORDER[b.severity ?? "Unknown"] ?? 5));
  }, [crisis.needs, ocha3w, msna, a2Pop]);

  return (
    <Box p={24}>
      {/* Summary */}
      <NeedsSummaryCard crisis={crisis} ocha3w={ocha3w} hasMsna={msna !== null} />

      {/* Panel card */}
      <Box style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}>
        {/* Header */}
        <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap={8} align="center">
              <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                {t("needs.sectorsTitle")}
              </Text>
              {a2 && (
                <Badge size="xs" style={{ background: "var(--color-info-light)", color: "var(--color-info)" }}>
                  {a2.name}
                </Badge>
              )}
            </Group>
            <Box />
          </Group>
        </Box>

        {/* Column headers */}
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "180px 110px 100px 150px 120px 70px 24px",
            columnGap: 16,
            padding: "8px 16px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-bg-muted)",
          }}
        >
          <ColHeader>{t("needs.columns.sector")}</ColHeader>
          <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ColHeader>{t("needs.columns.severity")}</ColHeader>
            <InfoButton onClick={() => setSeverityInfoOpen(true)} />
          </Box>
          <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ColHeader>{t("needs.columns.pin")}</ColHeader>
            <InfoButton onClick={() => setPinInfoOpen(true)} />
          </Box>
          <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ColHeader>{t("needs.columns.presence")}</ColHeader>
            <InfoButton onClick={() => setPresenceInfoOpen(true)} />
          </Box>
          <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ColHeader>{t("needs.columns.assessment")}</ColHeader>
            <InfoButton onClick={() => setAssessmentInfoOpen(true)} />
          </Box>
          <Box style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ColHeader>{t("needs.columns.precision")}</ColHeader>
            <InfoButton onClick={() => setPrecisionInfoOpen(true)} />
          </Box>
          <Box />
        </Box>

        {/* Sector rows */}
        {rows.map((row, idx) => (
          <SectorRow
            key={row.key}
            label={t(`needs.sectors.${row.key}`)}
            Icon={row.icon}
            severity={row.severity}
            description={row.description}
            responseGap={row.responseGap}
            nrcRelevant={row.nrcRelevant}
            ochaData={row.ochaMatch}
            pin={row.pin}
            pinIsApprox={row.pinIsApprox}
            assessmentLevel={row.assessmentLevel}
            precision={row.precision}
            isLast={idx === rows.length - 1}
          />
        ))}
      </Box>

      {/* ── Severity info modal ─────────────────────────────────────────── */}
      <Modal
        opened={severityInfoOpen}
        onClose={() => setSeverityInfoOpen(false)}
        title={<Text fw={700} size="sm" c="var(--color-text-primary)">{t("needs.severityModal.title")}</Text>}
        size="sm"
      >
        <Stack gap={16}>
          <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
            {t("needs.severityModal.intro")}
          </Text>

          <Box style={{ border: "1px solid var(--color-border)", overflow: "hidden" }}>
            <Box style={{ display: "grid", gridTemplateColumns: "90px 1fr", background: "var(--color-bg-muted)", padding: "6px 12px", borderBottom: "1px solid var(--color-border)" }}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{t("needs.severityModal.score")}</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{t("needs.severityModal.level")}</Text>
            </Box>
            {([
              { range: "80-100", levelKey: "catastrophic", color: "var(--color-critical)",  bg: "var(--color-critical-light)" },
              { range: "65-79",  levelKey: "extreme",      color: "var(--color-critical)",  bg: "var(--color-critical-light)" },
              { range: "45-64",  levelKey: "severe",       color: "var(--color-warning)",   bg: "var(--color-warning-light)"  },
              { range: "25-44",  levelKey: "stressed",     color: "var(--color-info)",      bg: "var(--color-info-light)"     },
              { range: "0-24",   levelKey: "minimal",      color: "var(--color-success)",   bg: "var(--color-success-light)"  },
              { range: null,     levelKey: "unknown",      color: "var(--color-text-muted)",bg: "var(--color-bg-muted)"       },
            ] as const).map((row) => (
              <Box key={row.levelKey} style={{ display: "grid", gridTemplateColumns: "90px 1fr", padding: "8px 12px", borderTop: "1px solid var(--color-border)", alignItems: "center" }}>
                <Text size="xs" c="var(--color-text-secondary)">{row.range ?? t("needs.severityModal.noData")}</Text>
                <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", background: row.bg, color: row.color }}>
                  {t(`needs.saf.${row.levelKey}`)}
                </span>
              </Box>
            ))}
          </Box>

          <Text size="xs" c="var(--color-text-muted)" style={{ lineHeight: 1.55 }}>
            {t("needs.severityModal.footnote")}
          </Text>
        </Stack>
      </Modal>

      {/* ── People in Need info modal ───────────────────────────────────── */}
      <Modal
        opened={pinInfoOpen}
        onClose={() => setPinInfoOpen(false)}
        title={<Text fw={700} size="sm" c="var(--color-text-primary)">{t("needs.pinModal.title")}</Text>}
        size="sm"
      >
        <Stack gap={12}>
          <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
            {t("needs.pinModal.intro")}
          </Text>
          <Box style={{ border: "1px solid var(--color-border)", padding: "10px 14px", background: "var(--color-bg-muted)" }}>
            <Text size="xs" fw={600} c="var(--color-text-primary)" style={{ fontFamily: "monospace", letterSpacing: "0.02em" }}>
              {t("needs.pinModal.formula")}
            </Text>
          </Box>
          <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
            {t("needs.pinModal.population")}
          </Text>
          <Text size="xs" c="var(--color-text-muted)" style={{ lineHeight: 1.55 }}>
            {t("needs.pinModal.footnote")}
          </Text>
        </Stack>
      </Modal>

      {/* ── Assessment Level info modal ─────────────────────────────────── */}
      <Modal
        opened={assessmentInfoOpen}
        onClose={() => setAssessmentInfoOpen(false)}
        title={<Text fw={700} size="sm" c="var(--color-text-primary)">{t("needs.assessmentModal.title")}</Text>}
        size="sm"
      >
        <Stack gap={16}>
          <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
            {t("needs.assessmentModal.intro")}
          </Text>
          <Box style={{ border: "1px solid var(--color-border)", overflow: "hidden" }}>
            {([
              {
                level: t("needs.assessmentModal.level1Label"),
                color: "var(--color-text-muted)",
                desc: t("needs.assessmentModal.level1Description"),
              },
              {
                level: t("needs.assessmentModal.level2Label"),
                color: "var(--color-ai)",
                desc: t("needs.assessmentModal.level2Description"),
              },
              {
                level: t("needs.assessmentModal.level3Label"),
                color: "var(--color-info)",
                desc: t("needs.assessmentModal.level3Description"),
              },
            ]).map((row, i) => (
              <Box key={row.level} style={{ padding: "10px 14px", borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                <Text size="xs" fw={700} style={{ color: row.color, marginBottom: 4 }}>{row.level}</Text>
                <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.55 }}>{row.desc}</Text>
              </Box>
            ))}
          </Box>
        </Stack>
      </Modal>

      {/* ── Precision info modal ─────────────────────────────────────────── */}
      <Modal
        opened={precisionInfoOpen}
        onClose={() => setPrecisionInfoOpen(false)}
        title={<Text fw={700} size="sm" c="var(--color-text-primary)">{t("needs.precisionModal.title")}</Text>}
        size="sm"
      >
        <Stack gap={16}>
          <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
            {t("needs.precisionModal.intro")}
          </Text>
          <Box style={{ border: "1px solid var(--color-border)", overflow: "hidden" }}>
            {([
              { label: t("needs.precisionModal.districtLabel"), desc: t("needs.precisionModal.districtDescription") },
              { label: t("needs.precisionModal.localityLabel"), desc: t("needs.precisionModal.localityDescription") },
            ]).map((row, i) => (
              <Box key={row.label} style={{ padding: "10px 14px", borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                <Text size="xs" fw={700} c="var(--color-text-primary)" mb={4}>{row.label}</Text>
                <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.55 }}>{row.desc}</Text>
              </Box>
            ))}
          </Box>
          <Text size="xs" c="var(--color-text-muted)" style={{ lineHeight: 1.55 }}>
            {t("needs.precisionModal.footnote")}
          </Text>
        </Stack>
      </Modal>

      {/* ── Operational Presence info modal ─────────────────────────────── */}
      <Modal
        opened={presenceInfoOpen}
        onClose={() => setPresenceInfoOpen(false)}
        title={<Text fw={700} size="sm" c="var(--color-text-primary)">{t("needs.presenceModal.title")}</Text>}
        size="sm"
      >
        <Stack gap={16}>
          <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
            {t("needs.presenceModal.intro")}
          </Text>

          <Box style={{ border: "1px solid var(--color-border)", overflow: "hidden" }}>
            {([
              { abbrev: "UN",    labelKey: "un"    },
              { abbrev: "INGO",  labelKey: "ingo"  },
              { abbrev: "NNGO",  labelKey: "nngo"  },
              { abbrev: "Gov",   labelKey: "gov"   },
              { abbrev: "RCRC",  labelKey: "rcrc"  },
              { abbrev: "Other", labelKey: "other" },
            ] as const).map((row, i) => (
              <Box key={row.abbrev} style={{ display: "grid", gridTemplateColumns: "56px 1fr", padding: "8px 12px", borderTop: i > 0 ? "1px solid var(--color-border)" : undefined, alignItems: "center" }}>
                <Text size="xs" fw={700} c="var(--color-text-primary)">{row.abbrev}</Text>
                <Text size="xs" c="var(--color-text-secondary)">{t(`needs.presenceModal.types.${row.labelKey}`)}</Text>
              </Box>
            ))}
          </Box>
        </Stack>
      </Modal>
    </Box>
  );
}
