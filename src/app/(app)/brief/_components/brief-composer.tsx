"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Card, Stack, Text } from "@mantine/core";
import { BRIEF_ITEM_KINDS, type Brief } from "~/lib/brief/types";
import type { BriefItemsApi } from "../_hooks/use-brief-items";

/**
 * The left half of the composer: the Brief itself, in fixed sections.
 */
export function BriefComposer({ brief }: { brief: Brief; items: BriefItemsApi }) {
  const t = useTranslations("brief");
  const format = useFormatter();
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  return (
    <Card p={16} style={{ border: "1px solid var(--color-border)" }} data-testid="brief-composer">
      <Stack gap={12}>
        <Text fw={700} style={{ fontSize: 18 }} c="var(--color-text-primary)">
          {brief.title}
        </Text>
        <Text size="sm" c="var(--color-text-secondary)">
          {t("composer.window", { start: when(brief.windowStart), end: when(brief.windowEnd) })}
        </Text>
        {BRIEF_ITEM_KINDS.map((kind) => {
          const group = brief.items.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position);
          return (
            <Stack key={kind} gap={4} data-testid={`brief-group-${kind}`}>
              <Text size="xs" fw={700} tt="uppercase" c="var(--color-text-muted)">
                {t(`groups.${kind}`)} ({group.length})
              </Text>
              {group.length === 0 ? (
                <Text size="sm" c="var(--color-text-muted)">
                  {t("items.emptyGroup")}
                </Text>
              ) : (
                group.map((item) => (
                  <Text key={item.id} size="sm" c="var(--color-text-primary)" data-testid="brief-item-title">
                    {item.snapshot.title}
                  </Text>
                ))
              )}
            </Stack>
          );
        })}
      </Stack>
    </Card>
  );
}
