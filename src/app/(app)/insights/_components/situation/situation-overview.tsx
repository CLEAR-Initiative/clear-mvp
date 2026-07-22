"use client";

import { useTranslations } from "next-intl";
import { Box, Card, Group, SimpleGrid, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { CardSection, StatsGrid } from "~/components/ui";
import type { SituationAnalysis } from "~/server/api/mappers/situation-analysis";
import { BulletCard } from "./bullet-card";

/**
 * Situation Analysis -> Overview. Every block is conditional: the pipeline
 * routinely resolves only a subset of the payload, and an empty section is
 * hidden rather than rendered as a placeholder.
 */
export function SituationOverview({ data }: { data: SituationAnalysis }) {
  const t = useTranslations("insights.situation");

  const { hazards, displacement, contextRisks, stats, summary } = data;
  const hasHazards = hazards.hazards.length > 0 || hazards.vulnerabilities.length > 0;
  const hasDisplacement = displacement.push.length > 0 || displacement.return.length > 0;

  return (
    <Box>
      {stats.length > 0 && (
        <StatsGrid
          cols={Math.min(stats.length, 4)}
          stats={stats.map((s) => ({
            label: t(`stats.${s.key}`),
            value: s.value,
          }))}
        />
      )}

      {summary && (
        <Card
          p={16}
          mb={24}
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
          <Text c="var(--color-text-primary)" style={{ fontSize: 13, lineHeight: 1.6 }}>
            {summary}
          </Text>
        </Card>
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
                    </Text>
                  ))}
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
              <BulletCard tone="critical" label={t("hazards.current")} items={hazards.hazards} />
            )}
            {hazards.vulnerabilities.length > 0 && (
              <BulletCard
                tone="warning"
                label={t("hazards.precrisis")}
                items={hazards.vulnerabilities}
              />
            )}
          </SimpleGrid>
        </Box>
      )}

      {hasDisplacement && (
        <Box>
          <Text fw={600} c="var(--color-text-primary)" mb={12} style={{ fontSize: 14 }}>
            {t("sections.displacement")}
          </Text>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={16}>
            {displacement.push.length > 0 && (
              <BulletCard tone="info" label={t("displacement.push")} items={displacement.push} />
            )}
            {displacement.return.length > 0 && (
              <BulletCard
                tone="success"
                label={t("displacement.return")}
                items={displacement.return}
              />
            )}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
}
