"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Box, Text } from "@mantine/core";
import { IconCircle } from "@tabler/icons-react";
import {
  NEEDS_SECTORS,
  NeedsAssessmentView,
  NeedsSummaryCard,
  SafSeverityLegend,
  type NeedsSectorKey,
  type NeedsSectorRow,
  type NeedsSeverity,
} from "~/components/crisis-detail/needs-assessment-panel";
import { SAF_LABEL_KEYS, SAF_ORDER } from "~/lib/scope-needs";
import type { AnalysisFigures } from "~/server/api/mappers/analysis";
import type { SaSector, SaSeverity, SaSource } from "~/server/api/mappers/situation-analysis";
import { api } from "~/trpc/react";
import { PillarList } from "../situation/situation-sectors";
import { analysisNeedsRows } from "./analysis-needs-rows";
import styles from "./dark/analysis-dark.module.css";

const SEVERITY_STYLE: Record<NonNullable<SaSeverity> | "none", { color: string; bg: string; rank: number }> = {
  critical: { color: "var(--color-critical)", bg: "var(--color-critical-light)", rank: 0 },
  high: { color: "var(--color-warning)", bg: "var(--color-warning-light)", rank: 1 },
  medium: { color: "var(--color-info)", bg: "var(--color-info-light)", rank: 2 },
  low: { color: "var(--color-success)", bg: "var(--color-success-light)", rank: 3 },
  none: { color: "var(--color-text-muted)", bg: "var(--color-bg-muted)", rank: 4 },
};

const SAF_COLORS: Record<string, { color: string; bg: string }> = {
  Catastrophic: { color: "var(--color-critical)", bg: "var(--color-critical-light)" },
  Extreme: { color: "var(--color-critical)", bg: "var(--color-critical-light)" },
  Severe: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  Stressed: { color: "var(--color-info)", bg: "var(--color-info-light)" },
  Minimal: { color: "var(--color-success)", bg: "var(--color-success-light)" },
};

const SCOPE_KEYS = new Set<string>(NEEDS_SECTORS.map((sector) => sector.key));

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

function reviewed(sector: SaSector | null): boolean {
  if (!sector) return false;
  return (
    sector.severity != null ||
    sector.impact.length > 0 ||
    sector.humanitarian.length > 0 ||
    sector.needs.length > 0 ||
    sector.interventions.length > 0 ||
    sector.atRisk.length > 0
  );
}

function isScopeKey(key: string): key is NeedsSectorKey {
  return SCOPE_KEYS.has(key);
}

/**
 * Analysis adapter. The severity pill is the SAF scale from the scope's
 * districts. The analysis grade stays underneath it. People in need prefers
 * the MSNA estimate and falls back to the overview stock figure. Partner
 * coverage comes from `analysis.needs`, never from a crisis.
 */
export function AnalysisNeeds({
  sectors,
  sources,
  scopeName,
  figures,
  locationIds,
}: {
  sectors: SaSector[];
  sources: SaSource[];
  scopeName: string;
  figures: AnalysisFigures | undefined;
  locationIds: string[];
}) {
  const t = useTranslations("crisisDetail");
  const tSev = useTranslations("common.severities");
  const tA = useTranslations("analysis.needs");
  const needs = api.analysis.needs.useQuery(
    { locationIds },
    { enabled: locationIds.length > 0, staleTime: 5 * 60_000 },
  );
  const byKey = useMemo(() => new Map((needs.data?.sectors ?? []).map((sector) => [sector.key, sector])), [needs.data]);

  const rows = useMemo<NeedsSectorRow[]>(
    () =>
      analysisNeedsRows(sectors, figures).map((model) => {
        const def = NEEDS_SECTORS.find((item) => item.key === model.key);
        const sector = sectors.find((item) => item.id === model.sectorId) ?? null;
        const scope = isScopeKey(model.key) ? byKey.get(model.key) : undefined;
        const saf = scope?.saf ?? null;
        const safKey = saf ? SAF_LABEL_KEYS[saf] : undefined;
        const style = SEVERITY_STYLE[model.severity ?? "none"];
        const colors = (saf && SAF_COLORS[saf]) || (saf ? { color: "var(--color-text-muted)", bg: "var(--color-bg-muted)" } : null);
        const severity: NeedsSeverity = colors
          ? { color: colors.color, bg: colors.bg, label: safKey ? t(`needs.saf.${safKey}`) : tA("notAssessed") }
          : { color: style.color, bg: style.bg, label: model.severity ? tSev(model.severity) : tA("notAssessed") };
        const pin = scope?.pin ?? model.pin;
        const covered = saf != null || scope?.pin != null || scope?.ocha != null;
        return {
          key: model.key,
          label: model.label,
          icon: def?.icon ?? IconCircle,
          severity,
          severityRank: saf != null ? (SAF_ORDER[saf] ?? 5) : 6 + style.rank,
          description: null,
          detail: sector ? <SectorDetail sector={sector} sources={sources} /> : undefined,
          responseGap: null,
          nrcRelevant: null,
          ochaMatch: scope?.ocha ?? null,
          pin,
          pinMissing: pin == null ? tA("notAssessed") : undefined,
          pinIsApprox: scope?.pin != null && scope.pinIsApprox,
          assessmentLevel: reviewed(sector) ? 2 : scope?.hasMsna ? 1 : null,
          assessmentMissing: tA("notAssessed"),
          precision: covered ? "District" : null,
          severityNote: saf && model.severity ? tA("reportingGrade", { grade: tSev(model.severity) }) : null,
        };
      }),
    [byKey, figures, sectors, sources, t, tA, tSev],
  );

  const scopeNeeds = needs.data;
  const summary =
    scopeNeeds && (scopeNeeds.hasMsna || scopeNeeds.ochaAsOf) ? (
      <NeedsSummaryCard
        summary={null}
        hasMsna={scopeNeeds.hasMsna}
        ochaAsOf={scopeNeeds.ochaAsOf}
        emptySummary="hide"
        analysis
      />
    ) : undefined;

  return (
    <Box data-testid="analysis-needs">
      <NeedsAssessmentView
        rows={rows}
        summary={summary}
        scopeBadge={scopeName}
        severityLegend={<SafSeverityLegend />}
        panelClassName={styles.sectorsCard}
      />
    </Box>
  );
}
