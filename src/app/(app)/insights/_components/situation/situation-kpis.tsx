"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Box, Card, Group, SimpleGrid, Text } from "@mantine/core";
import { api } from "~/trpc/react";
import type { SituationAnalysis } from "~/server/api/mappers/situation-analysis";

/**
 * Key figures strip for the situation analysis.
 *
 * Deliberately adaptive rather than a fixed set of tiles: the pipeline resolves
 * only a subset of datapoints (most are null on a thin corpus), so we render a
 * tile only where there is a real value. INFORM Severity is the one always-on
 * tile - it comes from our INFORM integration (ACAPS INFORM Severity Index),
 * not the pipeline, so it is present even when the situation-analysis datapoints
 * are sparse. No placeholder tiles: an empty figure communicates nothing.
 */
export function SituationKpis({ data }: { data: SituationAnalysis }) {
  const t = useTranslations("insights.situation");
  const format = useFormatter();

  const { data: inform } = api.inform.getSeverity.useQuery(
    { country: data.crisis.country },
    { staleTime: 12 * 60 * 60 * 1000, retry: false },
  );

  const stats = data.stats;
  const hasInform = inform != null && typeof inform.score === "number";
  const tileCount = stats.length + (hasInform ? 1 : 0);
  if (tileCount === 0) return null;

  return (
    <Box mb={24}>
      <SimpleGrid cols={{ base: 1, xs: 2, md: Math.min(tileCount, 4) }} spacing={14}>
        {hasInform && (
          <Kpi
            label={t("kpi.informSeverity")}
            value={inform!.score!.toFixed(1)}
            unit="/5"
            valueColor={informColor(inform!.categoryNumeric)}
            sub={inform!.category ?? undefined}
          />
        )}
        {stats.map((s) => (
          <Kpi key={s.key} label={t(`stats.${s.key}`)} value={s.value} />
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
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <Card p="lg" style={{ border: "1px solid var(--color-border)" }}>
      <Text
        c="var(--color-text-secondary)"
        fw={700}
        tt="uppercase"
        mb={8}
        style={{ fontSize: 11, letterSpacing: "0.4px" }}
      >
        {label}
      </Text>
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

/** INFORM Severity category (numeric 1-5) to the app's semantic colour. */
function informColor(categoryNumeric: number | null | undefined): string {
  if (typeof categoryNumeric !== "number") return "var(--color-text-primary)";
  if (categoryNumeric >= 4) return "var(--color-critical)";
  if (categoryNumeric >= 3) return "var(--color-warning)";
  return "var(--color-text-primary)";
}
