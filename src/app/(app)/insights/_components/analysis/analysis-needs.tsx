"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Box, Stack, Text } from "@mantine/core";
import {
  NEEDS_SECTORS,
  NeedsAssessmentView,
  type NeedsSectorKey,
  type NeedsSectorRow,
  type NeedsSeverity,
} from "~/components/crisis-detail/needs-assessment-panel";
import type { SaSector, SaSeverity, SaSource } from "~/server/api/mappers/situation-analysis";
import { PillarList } from "../situation/situation-sectors";

/** Analysis sector ids (pipeline SAF taxonomy) per needs-table row. */
const SECTOR_ID: Record<NeedsSectorKey, string> = {
  shelter: "shelter",
  wash: "wash",
  protection: "protection",
  health: "health",
  food: "food_security",
  education: "education",
};

const SEVERITY_STYLE: Record<NonNullable<SaSeverity> | "none", { color: string; bg: string; rank: number }> = {
  critical: { color: "var(--color-critical)", bg: "var(--color-critical-light)", rank: 0 },
  high: { color: "var(--color-warning)", bg: "var(--color-warning-light)", rank: 1 },
  medium: { color: "var(--color-info)", bg: "var(--color-info-light)", rank: 2 },
  low: { color: "var(--color-success)", bg: "var(--color-success-light)", rank: 3 },
  none: { color: "var(--color-text-muted)", bg: "var(--color-bg-muted)", rank: 4 },
};

function SectorDetail({ sector, sources }: { sector: SaSector; sources: SaSource[] }) {
  const t = useTranslations("insights.situation");
  const tA = useTranslations("analysis.needs");
  return (
    <Box>
      {sector.evidenceScope === "fallback" && (
        <Text c="var(--color-warning)" mb={12} style={{ fontSize: 12 }}>
          {tA("inferred")}
        </Text>
      )}
      <PillarList label={t("sectors.impact")} items={sector.impact} lineRefs={sector.lineRefs} sources={sources} />
      <PillarList label={t("sectors.humanitarian")} items={sector.humanitarian} lineRefs={sector.lineRefs} sources={sources} />
      <PillarList label={t("sectors.needs")} items={sector.needs} lineRefs={sector.lineRefs} sources={sources} />
      <PillarList label={t("sectors.interventions")} items={sector.interventions} lineRefs={sector.lineRefs} sources={sources} />
      <PillarList label={t("sectors.atRisk")} items={sector.atRisk} lineRefs={sector.lineRefs} sources={sources} />
    </Box>
  );
}

function AnalysisSeverityLegend() {
  const tA = useTranslations("analysis.needs");
  const tSev = useTranslations("common.severities");
  return (
    <Stack gap={12}>
      <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
        {tA("severityIntro")}
      </Text>
      {(["critical", "high", "medium", "low"] as const).map((k) => (
        <span
          key={k}
          style={{
            alignSelf: "flex-start",
            padding: "2px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            background: SEVERITY_STYLE[k].bg,
            color: SEVERITY_STYLE[k].color,
          }}
        >
          {tSev(k)}
        </span>
      ))}
      <Text size="xs" c="var(--color-text-muted)">
        {tA("severityNull")}
      </Text>
    </Stack>
  );
}

/** Analysis adapter for the shared needs table: severity and findings come from the analysis sectors. */
export function AnalysisNeeds({ sectors, sources, scopeName }: { sectors: SaSector[]; sources: SaSource[]; scopeName: string }) {
  const tSev = useTranslations("common.severities");
  const tA = useTranslations("analysis.needs");

  const rows = useMemo<NeedsSectorRow[]>(
    () =>
      NEEDS_SECTORS.map((def) => {
        const sector = sectors.find((s) => s.id === SECTOR_ID[def.key]) ?? null;
        const style = SEVERITY_STYLE[sector?.severity ?? "none"];
        const severity: NeedsSeverity = {
          color: style.color,
          bg: style.bg,
          label: sector?.severity ? tSev(sector.severity) : tA("notAssessed"),
        };
        return {
          key: def.key,
          label: def.label,
          icon: def.icon,
          severity,
          severityRank: style.rank,
          description: null,
          detail: sector ? <SectorDetail sector={sector} sources={sources} /> : undefined,
          responseGap: null,
          nrcRelevant: null,
          ochaMatch: null,
          pin: null,
          pinIsApprox: false,
          // Graded by the analysis from reporting: the "AI review" level.
          assessmentLevel: 2,
          precision: null,
        };
      }),
    [sectors, sources, tSev, tA],
  );

  return <NeedsAssessmentView rows={rows} scopeBadge={scopeName} severityLegend={<AnalysisSeverityLegend />} />;
}
