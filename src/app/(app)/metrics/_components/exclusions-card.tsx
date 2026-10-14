"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Box, Group, Stack, Text } from "@mantine/core";
import { CardSection } from "~/components/ui";
import { EXCLUSION_REASONS, type DetectionMetrics, type ExclusionReason } from "~/lib/detection-metrics";

const isKnownReason = (reason: string): reason is ExclusionReason =>
  (EXCLUSION_REASONS as readonly string[]).includes(reason);

/** Events in range left out of the measurement, by clear-api's reason. */
export function ExclusionsCard({ metrics }: { metrics: DetectionMetrics }) {
  const t = useTranslations("metrics.exclusions");
  const format = useFormatter();
  const total = metrics.exclusions.reduce((sum, row) => sum + row.count, 0);

  return (
    <CardSection title={t("title")} subtitle={t("subtitle", { total, inRange: metrics.eventsInRange })}>
      <Stack gap={0}>
        {metrics.exclusions.map((row, i) => (
          <Group
            key={row.reason}
            justify="space-between"
            align="flex-start"
            wrap="nowrap"
            gap={16}
            py={10}
            style={i > 0 ? { borderTop: "1px solid var(--color-border)" } : undefined}
          >
            <Box style={{ minWidth: 0 }}>
              <Text size="sm" fw={500} c="var(--color-text-primary)">
                {isKnownReason(row.reason) ? t(`reasons.${row.reason}.label`) : row.reason}
              </Text>
              {isKnownReason(row.reason) && (
                <Text size="xs" c="var(--color-text-muted)">
                  {t(`reasons.${row.reason}.description`)}
                </Text>
              )}
            </Box>
            <Text size="sm" fw={600} c="var(--color-text-primary)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {format.number(row.count)}
            </Text>
          </Group>
        ))}
      </Stack>
    </CardSection>
  );
}
