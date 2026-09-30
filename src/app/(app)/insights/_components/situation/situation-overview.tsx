"use client";

import { useTranslations } from "next-intl";
import { Box, Group, SimpleGrid, Text } from "@mantine/core";
import { CardSection } from "~/components/ui";
import type { SituationAnalysis } from "~/server/api/mappers/situation-analysis";
import { AiSummaryCard } from "./ai-summary-card";
import { BulletRow } from "./bullet-row";
import { BulletCard } from "./bullet-card";
import { SituationKpis } from "./situation-kpis";
import { Citations } from "./citations";
import { SituationChanged } from "./situation-changed";
import { SectionChange } from "./section-change";

/**
 * Situation Analysis -> Overview. Every block is conditional: the pipeline
 * routinely resolves only a subset of the payload, and an empty section is
 * hidden rather than rendered as a placeholder.
 */
export function SituationOverview({
  data,
  countryLocationId,
  onOpenSources,
}: {
  data: SituationAnalysis;
  countryLocationId: string;
  onOpenSources?: () => void;
}) {
  const t = useTranslations("insights.situation");

  const { hazards, displacement, contextRisks, summary, sources } = data;
  const hasHazards = hazards.hazards.length > 0 || hazards.vulnerabilities.length > 0;
  const hasDisplacement = displacement.push.length > 0 || displacement.return.length > 0;

  return (
    <Box>
      <SituationKpis data={data} />

      <AiSummaryCard data={data} onOpenSources={onOpenSources} />

      {summary && (
        <Box mb={24}>
          <SituationChanged data={data} countryLocationId={countryLocationId} />
        </Box>
      )}

      {contextRisks.length > 0 && (
        <Box mb={24}>
          <CardSection title={t("sections.contextRisks")} noPadding>
            {contextRisks.map((risk, i) => (
              <Group
                key={risk.key}
                align="flex-start"
                wrap="nowrap"
                gap={16}
                px={16}
                py={12}
                style={{
                  borderTop: i === 0 ? undefined : "1px solid var(--color-border)",
                }}
              >
                <Text
                  fw={600}
                  c="var(--color-text-primary)"
                  style={{ fontSize: 12, width: 140, flexShrink: 0 }}
                >
                  {risk.label}
                </Text>
                <Box>
                  {risk.items.map((item, j) => {
                    // Per-bullet where the pipeline attributed it; otherwise the
                    // domain's own refs, once, on the last bullet - so an older
                    // analysis still shows where the block came from.
                    const refs = risk.lineRefs[item.trim()] ?? [];
                    const showDomainRefs =
                      refs.length === 0 &&
                      Object.keys(risk.lineRefs).length === 0 &&
                      j === risk.items.length - 1;
                    return (
                      <BulletRow key={j} last={j === risk.items.length - 1}>
                        {item}
                        {refs.length > 0 && (
                          <Citations
                            refs={refs}
                            sources={sources}
                            onOpen={onOpenSources}
                            variant="inline"
                          />
                        )}
                        {showDomainRefs && (
                          <Citations
                            refs={risk.refs}
                            sources={sources}
                            onOpen={onOpenSources}
                            variant="inline"
                          />
                        )}
                      </BulletRow>
                    );
                  })}
                  <SectionChange note={data.changes.notes[`context_risks.${risk.key}`]} />
                </Box>
              </Group>
            ))}
          </CardSection>
        </Box>
      )}

      {hasHazards && (
        <Box mb={24}>
          <Text fw={600} c="var(--color-text-primary)" mb={12} style={{ fontSize: 14 }}>
            {t("sections.hazards")}
          </Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={16}>
            {hazards.hazards.length > 0 && (
              <BulletCard
                tone="critical"
                label={t("hazards.current")}
                items={hazards.hazards}
                sources={sources}
                onOpenSources={onOpenSources}
              />
            )}
            {hazards.vulnerabilities.length > 0 && (
              <BulletCard
                tone="warning"
                label={t("hazards.precrisis")}
                items={hazards.vulnerabilities}
                sources={sources}
                onOpenSources={onOpenSources}
              />
            )}
          </SimpleGrid>
          <SectionChange note={data.changes.notes.hazards} />
        </Box>
      )}

      {hasDisplacement && (
        <Box>
          <Text fw={600} c="var(--color-text-primary)" mb={12} style={{ fontSize: 14 }}>
            {t("sections.displacement")}
          </Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={16}>
            {displacement.push.length > 0 && (
              <BulletCard
                tone="info"
                label={t("displacement.push")}
                items={displacement.push}
                sources={sources}
                onOpenSources={onOpenSources}
              />
            )}
            {displacement.return.length > 0 && (
              <BulletCard
                tone="success"
                label={t("displacement.return")}
                items={displacement.return}
                sources={sources}
                onOpenSources={onOpenSources}
              />
            )}
          </SimpleGrid>
          <SectionChange note={data.changes.notes.displacement} />
        </Box>
      )}
    </Box>
  );
}
