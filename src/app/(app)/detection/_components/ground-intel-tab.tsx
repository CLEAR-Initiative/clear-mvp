"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, Box, Card, Group, Text } from "@mantine/core";
import { IconLock, IconPaperclip } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { DataTable, Table } from "~/components/ui";
import { GROUND_CLASSIFICATIONS, type GqlGroundMessage } from "~/lib/types/graphql";

/**
 * Ground intel review tab — the staging tier in front of the signals graph.
 *
 * PRIVATE TIER RULES (PRD "WhatsApp Signal Pipeline", V1 constraints):
 *  - `senderName` may render inside this tab ONLY. It must never appear in
 *    any other surface, and clear-api scrubs it from promoted signals.
 *  - Phone numbers are redacted at persistence — this tab must never add a
 *    path that surfaces raw payloads.
 *  - The whole tab is admin/analyst only (mirrored from clear-api's
 *    requireRole gate); the parent page hides it for other roles.
 */

/** "unclassified" chip = messages the pipeline hasn't labeled yet (null). */
const CLASSIFICATION_FILTERS = [...GROUND_CLASSIFICATIONS, "unclassified"] as const;
type ClassificationFilter = (typeof CLASSIFICATION_FILTERS)[number];

export function messageClassification(m: GqlGroundMessage): ClassificationFilter {
  const c = m.classification;
  return (GROUND_CLASSIFICATIONS as readonly string[]).includes(c ?? "")
    ? (c as ClassificationFilter)
    : "unclassified";
}

const CLASSIFICATION_STYLES: Record<ClassificationFilter, { bg: string; color: string }> = {
  field_report: { bg: "var(--color-critical-light)", color: "var(--color-critical)" },
  news_digest:  { bg: "var(--color-info-light)",     color: "var(--color-info)" },
  operational:  { bg: "var(--color-success-light)",  color: "var(--color-success)" },
  chatter:      { bg: "var(--color-bg-muted)",       color: "var(--color-text-muted)" },
  unclassified: { bg: "var(--color-warning-light)",  color: "var(--color-warning)" },
};

// i18n keys under detection.groundIntel.columns.* — resolved via t() at render time.
const COLUMN_KEYS = ["sent", "sender", "source", "classification", "message", "media"] as const;

export function ClassificationPill({ value }: { value: ClassificationFilter }) {
  const t = useTranslations("detection");
  const style = CLASSIFICATION_STYLES[value];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        background: style.bg,
        color: style.color,
      }}
    >
      {t(`groundIntel.classifications.${value}`)}
    </span>
  );
}

export function GroundIntelTab() {
  const t = useTranslations("detection");
  const format = useFormatter();

  const messagesQuery = api.ground.messages.useQuery({}, { staleTime: 60_000 });
  const sourcesQuery = api.ground.sources.useQuery(undefined, { staleTime: 60_000 });

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);
  const sourceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sourcesQuery.data ?? []) map.set(s.id, s.name);
    return map;
  }, [sourcesQuery.data]);

  // Classification filter — null means "all"; an explicit Set narrows.
  // Toggling back to the full set collapses to null so every chip reads
  // active again (same semantics as the history tab's class chips).
  const [activeClassifications, setActiveClassifications] =
    useState<Set<ClassificationFilter> | null>(null);

  const countsByClassification = useMemo(() => {
    const counts = new Map<ClassificationFilter, number>();
    for (const m of messages) {
      const c = messageClassification(m);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return counts;
  }, [messages]);

  const filtered = useMemo(() => {
    if (activeClassifications === null) return messages;
    return messages.filter((m) => activeClassifications.has(messageClassification(m)));
  }, [messages, activeClassifications]);

  const toggleClassification = (c: ClassificationFilter) => {
    setActiveClassifications((prev) => {
      const base = prev ?? new Set<ClassificationFilter>(CLASSIFICATION_FILTERS);
      const next = new Set(base);
      if (next.has(c)) {
        // Don't allow zero classifications — that would render an empty
        // view with no obvious way back.
        if (next.size === 1) return next;
        next.delete(c);
      } else {
        next.add(c);
      }
      return next.size === CLASSIFICATION_FILTERS.length ? null : next;
    });
  };

  return (
    <Box data-testid="ground-intel-tab">
      <Group justify="space-between" mb={12} align="center" style={{ minHeight: 32 }}>
        <Group gap={8}>
          <Text fw={600} style={{ fontSize: 14 }}>
            {t("groundIntel.title")}
          </Text>
          <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
            {t("groundIntel.count", { count: filtered.length })}
          </Text>
        </Group>
        {/* Private-tier reminder: sender names are visible on this surface only. */}
        <Group gap={6}>
          <IconLock size={13} color="var(--color-text-muted)" />
          <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
            {t("groundIntel.privateTier")}
          </Text>
        </Group>
      </Group>

      <Group gap={6} mb={12} wrap="wrap" data-testid="ground-classification-chips">
        {CLASSIFICATION_FILTERS.map((c) => {
          const active = activeClassifications === null || activeClassifications.has(c);
          const count = countsByClassification.get(c) ?? 0;
          return (
            <Badge
              key={c}
              size="sm"
              variant={active ? "filled" : "light"}
              color={active ? "dark" : "gray"}
              style={{ cursor: "pointer", textTransform: "none" }}
              onClick={() => toggleClassification(c)}
            >
              {t(`groundIntel.classifications.${c}`)} ({count})
            </Badge>
          );
        })}
      </Group>

      <Card p={0} style={{ border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <Box style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <Box style={{ minWidth: 760 }}>
            <DataTable
              columns={COLUMN_KEYS.map((k) => ({ label: t(`groundIntel.columns.${k}`) }))}
              data={filtered}
              loading={messagesQuery.isLoading}
              emptyMessage={
                messages.length === 0 ? t("groundIntel.empty") : t("groundIntel.noMatch")
              }
              renderRow={(m) => (
                <Table.Tr key={m.id} data-testid="ground-message-row">
                  <Table.Td style={{ whiteSpace: "nowrap" }}>
                    <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                      {format.dateTime(new Date(m.sentAt), "short")}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ minWidth: 120 }}>
                    {/* Private tier: raw sender display name renders here ONLY. */}
                    <Text fw={600} style={{ fontSize: 13 }}>
                      {m.senderName ?? m.senderRef}
                    </Text>
                    <Text c="var(--color-text-muted)" style={{ fontSize: 11, fontFamily: "monospace" }}>
                      {m.senderRef}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ minWidth: 100 }}>
                    <Text c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
                      {sourceNameById.get(m.groundSourceId) ?? "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: "nowrap" }}>
                    <ClassificationPill value={messageClassification(m)} />
                  </Table.Td>
                  <Table.Td style={{ minWidth: 240, maxWidth: 420 }}>
                    <Text lineClamp={2} style={{ fontSize: 13, lineHeight: 1.4 }}>
                      {m.text.length > 0 ? m.text : <em>{t("groundIntel.noText")}</em>}
                    </Text>
                    <Group gap={6} mt={2}>
                      {m.uncertainty && (
                        <Badge size="xs" variant="light" color="yellow" style={{ textTransform: "none" }}>
                          {m.uncertainty}
                        </Badge>
                      )}
                      {m.isEdited && (
                        <Text c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                          {t("groundIntel.edited")}
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ whiteSpace: "nowrap" }}>
                    {m.mediaRefs.length + m.omittedMediaCount > 0 ? (
                      <Group gap={4}>
                        <IconPaperclip size={13} color="var(--color-text-muted)" />
                        <Text c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
                          {m.mediaRefs.length + m.omittedMediaCount}
                        </Text>
                      </Group>
                    ) : (
                      <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>
                        -
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              )}
            />
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
