"use client";

import { useTranslations } from "next-intl";
import { Box, SimpleGrid, Text, UnstyledButton } from "@mantine/core";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { api } from "~/trpc/react";
import { totalsByBucket, type MetricDefinition, type MetricKey, type TotalBucket } from "~/lib/metric-series";
import { useShareFormat } from "./use-share-format";

const NO_RETRY = new Set(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED"]);

/** The latest bucket that measured anything: its share, label and whether the range only partly covers it. */
export function latestReading(totals: readonly TotalBucket[]): { share: number; label: string; isPartial: boolean } | null {
  for (let i = totals.length - 1; i >= 0; i--) {
    const bucket = totals[i]!;
    if (bucket.denominator > 0) return { share: bucket.numerator / bucket.denominator, label: bucket.label, isPartial: bucket.isPartial };
  }
  return null;
}

/**
 * Every registry metric at a glance (Exponential #1279): the last 12 ISO
 * weeks as a sparkline and the latest week's value, each tile a button that
 * selects the metric in the explorer below. Same clear-api series, weekly,
 * ungrouped, under the page's country filter only.
 */
export function MetricTiles({
  definitions,
  selected,
  onSelect,
  locationId,
  nameOf,
}: {
  definitions: MetricDefinition[];
  selected: MetricKey;
  onSelect: (key: MetricKey) => void;
  locationId?: string;
  nameOf: (definition: MetricDefinition) => string;
}) {
  const t = useTranslations("metrics.progress.overview");
  return (
    <Box component="section" aria-labelledby="metrics-overview-title">
      <Text id="metrics-overview-title" size="sm" fw={600} c="var(--color-text-primary)">
        {t("title")}
      </Text>
      <Text size="xs" c="var(--color-text-secondary)" mb={8}>
        {t("subtitle")}
      </Text>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing={12}>
        {definitions.map((definition) => (
          <MetricTile
            key={definition.key}
            definition={definition}
            name={nameOf(definition)}
            selected={definition.key === selected}
            onSelect={() => onSelect(definition.key)}
            locationId={locationId}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}

function MetricTile({
  definition,
  name,
  selected,
  onSelect,
  locationId,
}: {
  definition: MetricDefinition;
  name: string;
  selected: boolean;
  onSelect: () => void;
  locationId?: string;
}) {
  const t = useTranslations("metrics.progress.overview");
  const pct = useShareFormat();
  const query = api.metrics.series.useQuery(
    { metric: definition.key, granularity: "WEEK", ...(locationId ? { locationId } : {}) },
    {
      refetchOnWindowFocus: false,
      retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
    },
  );
  const result = query.data;
  const series = result?.status === "ok" ? result.series : null;
  const totals = series ? totalsByBucket(series) : [];
  const latest = latestReading(totals);
  const points = totals.map((bucket) => ({
    label: bucket.label,
    value: bucket.denominator > 0 ? Math.round((bucket.numerator / bucket.denominator) * 1000) / 10 : null,
  }));
  const color = selected ? "var(--color-accent)" : "var(--color-text-muted)";
  // Without a reading, say why: a failed read, an API without the registry,
  // a series with nothing measured, or a read still pending.
  const caption = latest
    ? latest.isPartial
      ? t("currentPartial", { week: latest.label })
      : t("current", { week: latest.label })
    : query.error
      ? t("error")
      : result?.status === "unavailable"
        ? t("unavailable")
        : result
          ? t("noData")
          : t("loading");

  return (
    <UnstyledButton
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={t("select", { metric: name })}
      p={12}
      style={{
        display: "block",
        width: "100%",
        textAlign: "start",
        background: "var(--color-bg-white)",
        border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
        borderRadius: 8,
      }}
    >
      <Text size="xs" c="var(--color-text-secondary)" truncate>
        {name}
      </Text>
      <Text size="xl" fw={700} c="var(--color-text-primary)" style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }} data-testid={`tile-value-${definition.key}`}>
        {latest ? pct(latest.share) : "—"}
      </Text>
      <Text size="xs" c="var(--color-text-muted)" title={!latest && query.error ? query.error.message : undefined}>
        {caption}
      </Text>
      <Box h={40} mt={4} dir="ltr" aria-hidden>
        {points.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
              <YAxis domain={[0, 100]} hide />
              <Line type="linear" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Box>
    </UnstyledButton>
  );
}
