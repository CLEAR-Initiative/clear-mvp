"use client";

import { useTranslations } from "next-intl";
import { Box, Card, Group, SimpleGrid, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { CardSection } from "~/components/ui";
import type { SituationAnalysis } from "~/server/api/mappers/situation-analysis";
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

      {summary && (
        <Card
          p={16}
          style={{
            border: "1px solid var(--color-ai-border)",
            background: "var(--color-ai-light)",
          }}
        >
          <Group gap={8} mb={8} align="center">
            <IconSparkles size={14} color="var(--color-ai)" />
            <Text
              fw={700}
              tt="uppercase"
              c="var(--color-ai)"
              style={{ fontSize: 11, letterSpacing: "0.5px" }}
            >
              {t("summary.title")}
            </Text>
          </Group>
          {summary.split(/\n{2,}/).map((para, i, arr) => (
            <Text
              key={i}
              c="var(--color-text-primary)"
              mb={i === arr.length - 1 ? 0 : 12}
              style={{ fontSize: 13, lineHeight: 1.65 }}
            >
              {para.trim()}
              {i === arr.length - 1 && (
                <Citations
                  refs={data.summaryRefs}
                  sources={sources}
                  onOpen={onOpenSources}
                  variant="inline"
                />
              )}
            </Text>
          ))}
        </Card>
      )}

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
                  {risk.items.map((item, j) => (
                    <Text
                      key={j}
                      c="var(--color-text-primary)"
                      style={{ fontSize: 13, lineHeight: 1.5 }}
                    >
                      {item}
                      {j === risk.items.length - 1 && (
                        <Citations
                          refs={risk.refs}
                          sources={sources}
                          onOpen={onOpenSources}
                          variant="inline"
                        />
                      )}
                    </Text>
                  ))}
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
