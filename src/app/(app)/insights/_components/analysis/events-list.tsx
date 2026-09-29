"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Group, Text } from "@mantine/core";
import { severityColor } from "~/lib/types/graphql";
import type { AnalysisEvents } from "~/server/api/routers/analysis";

export function EventsList({ events }: { events: AnalysisEvents | undefined }) {
  const t = useTranslations("analysis.events");
  const format = useFormatter();
  const items = events?.items ?? [];

  return (
    <Box style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}>
      <Group justify="space-between" px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
          {t("title")}
        </Text>
        {events && events.totalCount > 0 && (
          <Text c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
            {t("count", { shown: items.length, total: events.totalCount })}
          </Text>
        )}
      </Group>
      {items.length === 0 ? (
        <Text c="var(--color-text-muted)" p={16} style={{ fontSize: 13 }}>
          {t("empty")}
        </Text>
      ) : (
        items.map((e, i) => (
          <Box
            key={e.id}
            component={Link}
            href={`/event/${e.id}`}
            px={16}
            py={10}
            className="hover:bg-[var(--color-bg-muted)]"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "baseline",
              textDecoration: "none",
              borderTop: i === 0 ? undefined : "1px solid var(--color-border)",
            }}
            data-testid="analysis-event-row"
          >
            <Box
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flexShrink: 0,
                background: severityColor(e.severity),
              }}
              aria-label={e.severity != null ? t("severity", { value: e.severity }) : undefined}
            />
            <Text c="var(--color-text-muted)" style={{ fontSize: 12, width: 80, flexShrink: 0 }}>
              {format.dateTime(new Date(e.startedAt), { day: "numeric", month: "short" })}
            </Text>
            <Text c="var(--color-text-primary)" style={{ fontSize: 13, flex: 1, minWidth: 0 }} truncate>
              {e.title ?? t("untitled")}
            </Text>
            {e.locationName && (
              <Text c="var(--color-text-secondary)" style={{ fontSize: 12, flexShrink: 0 }}>
                {e.locationName}
              </Text>
            )}
          </Box>
        ))
      )}
    </Box>
  );
}
