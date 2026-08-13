"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Box, Card, Group, Progress, SimpleGrid, Text, UnstyledButton } from "@mantine/core";
import { CardSection, SeverityBadge } from "~/components/ui";
import type { SaSector, SaSource } from "~/server/api/mappers/situation-analysis";
import { toAppSeverity } from "./severity";
import { Citations } from "./citations";
import { SectionChange } from "./section-change";

/**
 * Situation Analysis -> Sectors: a selectable list beside the full analysis of
 * the selected sector.
 *
 * The API carries ONE severity per sector, so the three SAF pillars (impact,
 * humanitarian conditions, at risk) render as content lists under that single
 * grade rather than as three independently-graded columns. Showing three
 * badges sourced from one value would imply a precision the data does not
 * have.
 */
export function SituationSectors({
  sectors,
  sources,
  onOpenSources,
  changeNotes = {},
}: {
  sectors: SaSector[];
  sources: SaSource[];
  onOpenSources?: () => void;
  changeNotes?: Record<string, string>;
}) {
  const t = useTranslations("insights.situation");
  const [selected, setSelected] = useState<string | undefined>(() => sectors[0]?.id);

  const sector = sectors.find((s) => s.id === selected) ?? sectors[0];
  if (!sector) {
    return (
      <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
        {t("sectors.empty")}
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={16} style={{ alignItems: "start" }}>
      <CardSection
        title={t("sectors.listTitle")}
        subtitle={t("sectors.listSubtitle", { count: sectors.length })}
        noPadding
      >
        {sectors.map((s, i) => (
          <UnstyledButton
            key={s.id}
            onClick={() => setSelected(s.id)}
            w="100%"
            px={16}
            py={12}
            style={{
              display: "block",
              borderTop: i === 0 ? undefined : "1px solid var(--color-border)",
              background:
                s.id === sector.id ? "var(--color-bg-muted)" : "transparent",
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap={10} wrap="nowrap">
                <Text
                  fw={700}
                  c="var(--color-text-secondary)"
                  style={{ fontSize: 10, letterSpacing: "0.5px", width: 20 }}
                >
                  {s.code}
                </Text>
                <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
                  {s.name}
                </Text>
              </Group>
              {s.severity ? (
                <SeverityBadge severity={toAppSeverity(s.severity)} />
              ) : (
                <Text c="var(--color-text-muted)" style={{ fontSize: 10 }}>
                  {t("sectors.notAssessed")}
                </Text>
              )}
            </Group>
          </UnstyledButton>
        ))}
      </CardSection>

      <SectorDetail
        sector={sector}
        sources={sources}
        onOpenSources={onOpenSources}
        changeNote={changeNotes[`sectors.${sector.id}`]}
      />
    </SimpleGrid>
  );
}

function PillarList({
  label,
  items,
  lineRefs,
  sources,
}: {
  label: string;
  items: string[];
  /** Per-line citations keyed by exact bullet text. Empty on older analyses. */
  lineRefs?: Record<string, number[]>;
  sources?: SaSource[];
}) {
  if (items.length === 0) return null;
  return (
    <Box mb={16}>
      <Text
        fw={700}
        tt="uppercase"
        c="var(--color-text-secondary)"
        mb={8}
        style={{ fontSize: 10, letterSpacing: "0.5px" }}
      >
        {label}
      </Text>
      {items.map((item, i) => {
        // Keyed on the exact generated line, matching how the pipeline emits
        // it. Trimmed because the mapper trims when building the index.
        const refs = lineRefs?.[item.trim()] ?? [];
        return (
          <Group key={i} gap={8} align="flex-start" wrap="nowrap" mb={6}>
            <Text c="var(--color-text-muted)" style={{ fontSize: 13, lineHeight: 1.5 }}>
              &bull;
            </Text>
            <Text c="var(--color-text-primary)" style={{ fontSize: 13, lineHeight: 1.5 }}>
              {item}
              {refs.length > 0 && sources && (
                <>
                  {" "}
                  <Citations refs={refs} sources={sources} variant="inline" />
                </>
              )}
            </Text>
          </Group>
        );
      })}
    </Box>
  );
}

function SectorDetail({
  sector,
  sources,
  onOpenSources,
  changeNote,
}: {
  sector: SaSector;
  sources: SaSource[];
  onOpenSources?: () => void;
  changeNote?: string;
}) {
  const t = useTranslations("insights.situation");

  const isEmpty =
    sector.impact.length === 0 &&
    sector.humanitarian.length === 0 &&
    sector.atRisk.length === 0 &&
    sector.needs.length === 0 &&
    sector.interventions.length === 0;

  const topNeed = sector.needs[0];
  const mostVulnerable = sector.atRisk[0];
  const hasSnapshot = !isEmpty && (topNeed != null || mostVulnerable != null);

  return (
    <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group justify="space-between" wrap="nowrap">
          <Box>
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
              {sector.name}
            </Text>
            <Text c="var(--color-text-secondary)" style={{ fontSize: 11 }}>
              {t("sectors.detailMeta", {
                needs: sector.needs.length,
                interventions: sector.interventions.length,
              })}
              <Citations
                refs={sector.refs}
                sources={sources}
                onOpen={onOpenSources}
                variant="inline"
              />
            </Text>
          </Box>
          <Group gap={8} align="center" wrap="nowrap">
            {sector.severity ? (
              <SeverityBadge severity={toAppSeverity(sector.severity)} size="sm" />
            ) : (
              <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                {t("sectors.notAssessed")}
              </Text>
            )}
            {sector.evidenceScope === "fallback" && (
              <Text
                fw={700}
                tt="uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.03em",
                  color: "var(--color-warning)",
                  background: "var(--color-warning-light)",
                  border: "1px dashed var(--color-warning)",
                  borderRadius: 6,
                  padding: "2px 7px",
                }}
              >
                {t("sectors.inferred")}
              </Text>
            )}
          </Group>
        </Group>
      </Box>

      <Box p={16}>
        {isEmpty && (
          <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
            {t("sectors.noAnalysis")}
          </Text>
        )}

        {sector.evidenceScope === "fallback" && !isEmpty && (
          <Text
            mb={14}
            style={{
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--color-warning)",
              background: "var(--color-warning-light)",
              borderRadius: 8,
              padding: "9px 11px",
            }}
          >
            &#9888; {t("sectors.inferredWarning")}
          </Text>
        )}

        {hasSnapshot && (
          <Box
            mb={16}
            p={13}
            style={{
              background: "var(--color-bg-muted)",
              borderRadius: 8,
              borderLeft: "3px solid var(--color-accent)",
            }}
          >
            <Text
              fw={700}
              tt="uppercase"
              c="var(--color-accent)"
              mb={8}
              style={{ fontSize: 10, letterSpacing: "0.06em" }}
            >
              {t("sectors.snapshot")}
            </Text>
            {topNeed && <SnapshotRow label={t("sectors.topNeed")} value={topNeed} />}
            {mostVulnerable && (
              <SnapshotRow label={t("sectors.mostVulnerable")} value={mostVulnerable} />
            )}
            <SnapshotRow
              label={t("sectors.evidence")}
              value={t("sectors.evidenceCount", { reports: sector.reportCount })}
            />
          </Box>
        )}

        <PillarList label={t("sectors.impact")} items={sector.impact} lineRefs={sector.lineRefs} sources={sources} />
        <PillarList label={t("sectors.humanitarian")} items={sector.humanitarian} lineRefs={sector.lineRefs} sources={sources} />
        <PillarList label={t("sectors.atRisk")} items={sector.atRisk} lineRefs={sector.lineRefs} sources={sources} />
        <PillarList label={t("sectors.needs")} items={sector.needs} lineRefs={sector.lineRefs} sources={sources} />
        <PillarList label={t("sectors.interventions")} items={sector.interventions} lineRefs={sector.lineRefs} sources={sources} />

        {sector.coverage.length > 0 && (
          <Box>
            <Text
              fw={700}
              tt="uppercase"
              c="var(--color-text-secondary)"
              mb={8}
              style={{ fontSize: 10, letterSpacing: "0.5px" }}
            >
              {t("sectors.coverage")}
            </Text>
            {sector.coverage.map((c, i) => (
              <Box key={i} mb={10}>
                <Group justify="space-between" mb={4} wrap="nowrap">
                  <Text c="var(--color-text-primary)" style={{ fontSize: 12 }}>
                    {c.area}
                  </Text>
                  <Text c="var(--color-text-secondary)" style={{ fontSize: 11 }}>
                    {t("sectors.coverageScore", {
                      score: c.score,
                      reports: c.reportCount,
                    })}
                  </Text>
                </Group>
                <Progress
                  value={c.score * 10}
                  size="xs"
                  color={c.score >= 7 ? "green" : c.score >= 4 ? "yellow" : "red"}
                />
              </Box>
            ))}
          </Box>
        )}

        <SectionChange note={changeNote} />
      </Box>
    </Card>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <Group gap={8} align="flex-start" wrap="nowrap" mb={5}>
      <Text
        c="var(--color-text-secondary)"
        fw={600}
        style={{ fontSize: 12, width: 104, flexShrink: 0 }}
      >
        {label}
      </Text>
      <Text c="var(--color-text-primary)" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
        {value}
      </Text>
    </Group>
  );
}
