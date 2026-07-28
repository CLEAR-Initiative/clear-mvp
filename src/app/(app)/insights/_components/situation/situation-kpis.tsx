"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Box, Card, Group, SimpleGrid, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { SaStatKey, SituationAnalysis } from "~/server/api/mappers/situation-analysis";

/**
 * Key figures strip - capped at four tiles.
 *
 * INFORM Severity is always the first tile when available (it comes from the
 * ACAPS INFORM Severity Index via our INFORM integration, independent of the
 * pipeline). The remaining slots are filled from the resolved pipeline
 * datapoints in a fixed priority order, so a thin corpus simply shows fewer
 * tiles rather than empty ones. Each tile carries an info button explaining
 * where its number comes from.
 */

/** Order datapoints compete for the remaining KPI slots. */
const DATAPOINT_PRIORITY: SaStatKey[] = [
  "displaced",
  "inNeed",
  "affected",
  "fundingRequired",
  "returnees",
  "fundingReceived",
];

const MAX_TILES = 4;

export function SituationKpis({ data }: { data: SituationAnalysis }) {
  const t = useTranslations("insights.situation");
  const format = useFormatter();

  const { data: inform } = api.inform.getSeverity.useQuery(
    { country: data.crisis.country },
    { staleTime: 12 * 60 * 60 * 1000, retry: false },
  );
  const hasInform = inform != null && typeof inform.score === "number";

  // Datapoint tiles, priority-ordered, filling the slots INFORM does not take.
  const byKey = new Map(data.stats.map((s) => [s.key, s]));
  const datapointTiles = DATAPOINT_PRIORITY.map((k) => byKey.get(k)).filter(
    (s): s is NonNullable<typeof s> => s != null,
  );
  const slotsForData = MAX_TILES - (hasInform ? 1 : 0);
  const shown = datapointTiles.slice(0, slotsForData);

  if (!hasInform && shown.length === 0) return null;

  return (
    <Box mb={24}>
      <SimpleGrid cols={{ base: 1, xs: 2, md: MAX_TILES }} spacing={14}>
        {hasInform && (
          <Kpi
            label={t("kpi.informSeverity")}
            value={inform!.score!.toFixed(1)}
            unit="/10"
            valueColor={informColor(inform!.category)}
            sub={inform!.category ?? undefined}
            info={t("kpi.info.informSeverity")}
          />
        )}
        {shown.map((s) => (
          <Kpi
            key={s.key}
            label={t(`stats.${s.key}`)}
            value={s.value}
            info={t(`kpi.info.${s.key}`)}
          />
        ))}
      </SimpleGrid>

      <Text mt={10} c="var(--color-text-muted)" style={{ fontSize: 11 }}>
        {t("kpi.evidenceBase", { reports: data.crisis.reportCount ?? 0 })}
        {data.crisis.freshestSourceAt
          ? " · " +
            t("kpi.freshest", {
              date: format.dateTime(new Date(data.crisis.freshestSourceAt), {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            })
          : ""}
      </Text>
    </Box>
  );
}

function Kpi({
  label,
  value,
  unit,
  sub,
  valueColor,
  info,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  valueColor?: string;
  info: string;
}) {
  return (
    <Card p="lg" style={{ border: "1px solid var(--color-border)", position: "relative" }}>
      <Group justify="space-between" wrap="nowrap" mb={8} align="flex-start">
        <Text
          c="var(--color-text-secondary)"
          fw={700}
          tt="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.4px" }}
        >
          {label}
        </Text>
        <Tooltip label={info} withArrow multiline w={250} openDelay={150} events={{ hover: true, focus: true, touch: true }}>
          <IconInfoCircle
            size={15}
            color="var(--color-text-muted)"
            style={{ flexShrink: 0, cursor: "help", outline: "none" }}
            tabIndex={0}
            aria-label={info}
          />
        </Tooltip>
      </Group>
      <Group gap={4} align="baseline" wrap="nowrap">
        <Text
          fw={700}
          c={valueColor ?? "var(--color-text-primary)"}
          style={{ fontSize: 28, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </Text>
        {unit && (
          <Text c="var(--color-text-secondary)" fw={500} style={{ fontSize: 14 }}>
            {unit}
          </Text>
        )}
      </Group>
      {sub && (
        <Text mt={8} c="var(--color-text-secondary)" style={{ fontSize: 11 }}>
          {sub}
        </Text>
      )}
    </Card>
  );
}

/** Colour by the INFORM category string, which is independent of the numeric
 *  scale (the index moved from 0-5 to 0-10; the categories did not). */
function informColor(category: string | null | undefined): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("very high")) return "var(--color-critical)";
  if (c.includes("high") || c.includes("medium")) return "var(--color-warning)";
  return "var(--color-text-primary)";
}
