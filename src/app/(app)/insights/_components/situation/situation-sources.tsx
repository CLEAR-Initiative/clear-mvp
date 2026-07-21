"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Anchor, Box, Card, Group, SimpleGrid, Text } from "@mantine/core";
import { IconArrowUpRight, IconFileText } from "@tabler/icons-react";
import type { SaSource } from "~/server/api/mappers/situation-analysis";

/**
 * Situation Analysis -> Sources: the reports that fed this snapshot.
 *
 * These are the denormalised `sourceReportIds` resolved to titles and links, so
 * a reader can trace any component of the analysis back to a document.
 */
export function SituationSources({ sources }: { sources: SaSource[] }) {
  const t = useTranslations("insights.situation");
  const format = useFormatter();

  if (sources.length === 0) {
    return (
      <Text c="var(--color-text-muted)" style={{ fontSize: 13 }}>
        {t("sources.empty")}
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={16}>
      {sources.map((s) => (
        <Card key={s.id} p={16} style={{ border: "1px solid var(--color-border)" }}>
          <Group gap={8} align="flex-start" wrap="nowrap" mb={8}>
            <IconFileText size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13, lineHeight: 1.4 }}>
              {s.title}
            </Text>
          </Group>

          {s.publishedAt && (
            <Text c="var(--color-text-muted)" mb={8} style={{ fontSize: 11 }}>
              {t("sources.published", {
                date: format.dateTime(new Date(s.publishedAt), {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }),
              })}
            </Text>
          )}

          {s.url && (
            <Anchor
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              c="var(--color-accent)"
              style={{ fontSize: 12 }}
            >
              <Group gap={4} align="center" wrap="nowrap">
                <IconArrowUpRight size={13} />
                <Box component="span">{t("sources.visit")}</Box>
              </Group>
            </Anchor>
          )}
        </Card>
      ))}
    </SimpleGrid>
  );
}
