"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, Box, Group, SegmentedControl, Select, Stack, Switch, Table, Text, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { CardSection } from "~/components/ui";
import { MetricsBodySkeleton } from "~/components/ui/metrics-page-skeleton";
import { api } from "~/trpc/react";
import {
  DEFAULT_METRIC,
  GRANULARITIES,
  KNOWN_METRIC_KEYS,
  METRIC_UNITS,
  beforeAfter,
  bucketsOfGroup,
  comparisonFrom,
  defaultGranularity,
  definitionsByDimension,
  emphasisFor,
  latestMarkerInRange,
  markersByBucket,
  markersInRange,
  totalsByBucket,
  type Granularity,
  type KnownMetricKey,
  type MetricDefinition,
  type MetricKey,
  type MetricSeries,
  type MetricUnit,
  type TotalBucket,
} from "~/lib/metric-series";
import { metricsQueryInput, type MetricsFilterValues } from "./metrics-filters";
import { SeriesChart, type MarkerGroup, type SeriesLine, type SeriesPoint } from "./series-chart";
import { useShareFormat } from "./use-share-format";

/** How many sources get a line; the rest stay in the table. */
export const MAX_LINES = 6;
const ACCENT = "var(--color-accent)";
const MUTED = "var(--color-text-muted)";
/** Dash patterns that tell the muted lines apart beyond hue. */
const DASHES = [undefined, "6 3", "2 3", "8 3 2 3", "4 2", "1 3"] as const;
const NO_RETRY = new Set(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED"]);

const toPct = (numerator: number, denominator: number) =>
  denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;

/** An Alert in theme tokens, as the page's own notices are styled. */
function noticeStyles(tone: "critical" | "warning" | "info") {
  return {
    root: {
      background: `var(--color-${tone}-light)`,
      borderInlineStart: `3px solid var(--color-${tone})`,
    },
    icon: { color: `var(--color-${tone})` },
    title: { color: "var(--color-text-primary)" },
    message: { color: "var(--color-text-secondary)" },
  };
}

/**
 * The lines and points the chart draws for a series: one line per group (the
 * emphasised one always among the six drawn; every group in the table) or
 * one line for an ungrouped series. Shares are only ever numerator over
 * denominator; nothing about what counts changes here.
 */
export function buildView(
  series: MetricSeries,
  emphasis: string | null,
  allLabel: string,
  axisLabel: (start: string) => string,
): { lines: SeriesLine[]; columns: SeriesLine[]; points: SeriesPoint[]; empty: boolean } {
  const totals = totalsByBucket(series);
  const empty = totals.every((bucket) => bucket.denominator === 0);
  if (series.groups.length === 0) {
    const all: SeriesLine[] = [{ key: "all", label: allLabel, color: ACCENT, width: 2.5 }];
    return {
      lines: all,
      columns: all,
      points: totals.map((bucket) => ({
        start: bucket.start,
        label: bucket.label,
        axisLabel: axisLabel(bucket.start),
        isPartial: bucket.isPartial,
        all: toPct(bucket.numerator, bucket.denominator),
        "n:all": bucket.denominator,
      })),
      empty,
    };
  }
  let drawn = series.groups.slice(0, MAX_LINES);
  if (emphasis && series.groups.includes(emphasis) && !drawn.includes(emphasis)) {
    drawn = [...drawn.slice(0, MAX_LINES - 1), emphasis];
  }
  const columns: SeriesLine[] = series.groups.map((group, i) => ({
    key: group,
    label: group,
    color: group === emphasis ? ACCENT : MUTED,
    width: group === emphasis ? 2.5 : 1.5,
    dash: group === emphasis ? undefined : DASHES[i % DASHES.length],
  }));
  const lines = columns.filter((column) => drawn.includes(column.key));
  const points: SeriesPoint[] = totals.map((bucket) => {
    const point: SeriesPoint = {
      start: bucket.start,
      label: bucket.label,
      axisLabel: axisLabel(bucket.start),
      isPartial: bucket.isPartial,
    };
    for (const group of series.groups) {
      const cell = series.buckets.find((b) => b.group === group && b.start === bucket.start);
      point[group] = cell ? toPct(cell.numerator, cell.denominator) : null;
      point[`n:${group}`] = cell?.denominator ?? 0;
    }
    return point;
  });
  return { lines, columns, points, empty };
}

const isKnown = (key: MetricKey): key is KnownMetricKey => (KNOWN_METRIC_KEYS as readonly string[]).includes(key);
const isKnownUnit = (unit: string): unit is MetricUnit => (METRIC_UNITS as readonly string[]).includes(unit);

/**
 * One metric at a time, over time (Exponential #1276, #1277): a metric from
 * clear-api's registry (`metricDefinitions`, ADR-0015), read by day, week or
 * month from `metricSeries` (ADR-0014), with the deploy markers that bear on
 * it and a before-and-after around the latest one. Shares the page's range
 * and country. Names are translated when this app knows the key; otherwise
 * the registry's English name shows, so a new metric appears without a
 * frontend change.
 */
export function ProgressOverTime({ filters }: { filters: MetricsFilterValues }) {
  const t = useTranslations("metrics.progress");
  const tMarkers = useTranslations("metrics.precision.weekly.markers");
  const format = useFormatter();
  const pct = useShareFormat();
  const [chosen, setChosen] = useState<MetricKey>(DEFAULT_METRIC);
  const [granularityChoice, setGranularityChoice] = useState<Granularity | null>(null);
  const [perSource, setPerSource] = useState(true);
  const [table, setTable] = useState(false);

  const registry = api.metrics.definitions.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
  });
  const definitions = registry.data?.status === "ok" ? registry.data.definitions : null;
  const definition: MetricDefinition | null = definitions
    ? (definitions.find((d) => d.key === chosen) ?? definitions[0] ?? null)
    : null;
  const metric = definition?.key ?? chosen;
  const nameOf = (d: MetricDefinition) => (isKnown(d.key) ? t(`metrics.${d.key}`) : d.name);

  const input = metricsQueryInput(filters);
  const granularity = granularityChoice ?? defaultGranularity(input.from, input.to);
  const grouped = !!definition?.groupable && perSource;
  const groupBy = grouped ? ("SOURCE" as const) : undefined;
  // No placeholder data: a stale series under a new metric's title would mislead.
  const chart = api.metrics.series.useQuery(
    { ...input, metric, granularity, groupBy },
    {
      enabled: definition !== null,
      refetchOnWindowFocus: false,
      retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
    },
  );
  const result = chart.data;
  const series = result?.status === "ok" ? result.series : null;
  // The before-and-after reads whole days over its own window: seven days
  // before the latest marker up to the range's end, whatever the page's
  // range starts on, so a range opened close to the marker is not clipped.
  const latestMarker = series ? latestMarkerInRange(metric, series.from, series.to) : null;
  const daily = api.metrics.series.useQuery(
    { ...input, metric, granularity: "DAY", groupBy, from: latestMarker ? comparisonFrom(latestMarker) : undefined, to: series?.to },
    {
      enabled: latestMarker !== null,
      refetchOnWindowFocus: false,
      retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
    },
  );
  const dailySeries = daily.data?.status === "ok" ? daily.data.series : null;
  // The page already shows clear-api's range message by the date fields.
  const rangeError = chart.error?.data?.code === "BAD_REQUEST";

  const axisLabel = (start: string) =>
    granularity === "MONTH"
      ? format.dateTime(new Date(start), { month: "short", year: "2-digit", timeZone: "UTC" })
      : format.dateTime(new Date(start), { day: "numeric", month: "short", timeZone: "UTC" });
  const emphasis = emphasisFor(definition, series?.groups ?? []);
  const view = series ? buildView(series, emphasis, t("allSources"), axisLabel) : null;
  const markerGroups: MarkerGroup[] =
    view && series
      ? [...markersByBucket(view.points, markersInRange(metric, series.from, series.to), granularity)].map(([label, markers]) => ({
          axisLabel: view.points.find((point) => point.label === label)!.axisLabel,
          names: markers.map((m) => tMarkers(m.key)),
        }))
      : [];

  const focus = dailySeries ? emphasisFor(definition, dailySeries.groups) : null;
  const dayTotals: TotalBucket[] | null = dailySeries
    ? focus
      ? bucketsOfGroup(dailySeries, focus).map(({ start, label, isPartial, numerator, denominator }) => ({ start, label, isPartial, numerator, denominator }))
      : totalsByBucket(dailySeries)
    : null;
  const comparison = latestMarker && dayTotals ? beforeAfter(dayTotals, latestMarker) : null;
  const unit = (n: number) =>
    definition && isKnownUnit(definition.unit) ? t(`units.${definition.unit}`, { n }) : t("units.DEFAULT", { n });
  const utcDay = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" });
  const error = registry.error ?? (rangeError ? null : chart.error);
  const unavailable = registry.data?.status === "unavailable" || result?.status === "unavailable";

  return (
    <Stack gap={16} component="section" aria-labelledby="progress-over-time-title">
      <Box style={{ minWidth: 0 }}>
        <Text id="progress-over-time-title" component="h2" size="lg" fw={700} c="var(--color-text-primary)">
          {t("title")}
        </Text>
        <Text size="sm" c="var(--color-text-secondary)" maw={720}>
          {t("subtitle")}
        </Text>
      </Box>
      <Group gap={12} align="flex-end" wrap="wrap">
        <Select
          label={t("metric.label")}
          data={definitionsByDimension(definitions ?? []).map((group) => ({
            group: t(`dimensions.${group.dimension}`),
            items: group.definitions.map((d) => ({ value: d.key, label: nameOf(d) })),
          }))}
          value={definition?.key ?? null}
          onChange={(value) => value && setChosen(value)}
          allowDeselect={false}
          disabled={!definitions}
          placeholder={definitions ? undefined : t("loading")}
          size="xs"
          w={{ base: "100%", xs: 260 }}
        />
        <Box>
          <Text size="xs" fw={500} c="var(--color-text-primary)" mb={4} component="label" id="progress-granularity-label">
            {t("granularity.label")}
          </Text>
          <SegmentedControl
            size="xs"
            aria-labelledby="progress-granularity-label"
            value={granularity}
            onChange={(value) => setGranularityChoice(value as Granularity)}
            data={GRANULARITIES.map((g) => ({ value: g, label: t(`granularity.${g}`) }))}
          />
        </Box>
        {definition?.groupable && (
          <Switch
            size="xs"
            label={t("perSource")}
            checked={perSource}
            onChange={(event) => setPerSource(event.currentTarget.checked)}
            pb={6}
          />
        )}
      </Group>
      {error ? (
        <Alert styles={noticeStyles("critical")} icon={<IconAlertTriangle size={16} />} title={t("error.title")}>
          {error.message}
        </Alert>
      ) : unavailable ? (
        <Alert styles={noticeStyles("warning")} icon={<IconAlertTriangle size={16} />} title={t("unavailable.title")}>
          {t("unavailable.body")}
        </Alert>
      ) : rangeError ? null : definition && series && view ? (
        view.empty ? (
          <Alert styles={noticeStyles("info")} icon={<IconInfoCircle size={16} />} title={t("empty.title")}>
            {t("empty.body")}
          </Alert>
        ) : (
          <CardSection
            title={nameOf(definition)}
            subtitle={t("card.subtitle", { buckets: t(`bucketsOf.${granularity}`), from: utcDay(series.from), to: utcDay(series.to) })}
            action={
              <Group gap={12} wrap="wrap" aria-label={t("legend")}>
                {view.lines.map((line) => (
                  <Group key={line.key} gap={6} wrap="nowrap">
                    <svg width={20} height={8} aria-hidden>
                      <line x1={0} x2={20} y1={4} y2={4} stroke={line.color} strokeWidth={line.width} strokeDasharray={line.dash} />
                    </svg>
                    <Text size="xs" fw={line.color === ACCENT ? 600 : 400} c="var(--color-text-secondary)">
                      {line.label}
                    </Text>
                  </Group>
                ))}
                <Group gap={6} wrap="nowrap">
                  <svg width={10} height={10} aria-hidden>
                    <circle cx={5} cy={5} r={3.5} fill="none" stroke="var(--color-text-muted)" strokeWidth={1.5} />
                  </svg>
                  <Text size="xs" c="var(--color-text-secondary)">
                    {t("partial")}
                  </Text>
                </Group>
                {markerGroups.length > 0 && (
                  <Group gap={6} wrap="nowrap">
                    <svg width={10} height={10} aria-hidden>
                      <line x1={5} x2={5} y1={0} y2={10} stroke="var(--color-border-dark)" strokeWidth={1.5} strokeDasharray="3 2" />
                    </svg>
                    <Text size="xs" c="var(--color-text-secondary)">
                      {t("deployMarker")}
                    </Text>
                  </Group>
                )}
                <UnstyledButton onClick={() => setTable((open) => !open)} aria-expanded={table}>
                  <Text size="xs" fw={600} c="var(--color-accent)">
                    {table ? t("hideTable") : t("showTable")}
                  </Text>
                </UnstyledButton>
              </Group>
            }
          >
            {comparison && !comparison.tooFew && (
              <Text size="sm" c="var(--color-text-secondary)" mb={8} style={{ fontVariantNumeric: "tabular-nums" }} data-testid="before-after">
                <Text span fw={600} c="var(--color-text-primary)">
                  {t("chip.title", { marker: tMarkers(comparison.marker.key), date: utcDay(comparison.marker.at) })}
                </Text>{" "}
                {t("chip.body", {
                  group: focus ?? t("allSources"),
                  before: pct(comparison.before.share),
                  after: pct(comparison.after.share),
                  nBefore: comparison.before.denominator,
                  nAfter: comparison.after.denominator,
                })}
              </Text>
            )}
            <SeriesChart data={view.points} lines={view.lines} markers={markerGroups} granularity={granularity} unit={unit} />
            {table && (
              <Box style={{ overflowX: "auto" }} mt={8}>
                <Table fz="xs" striped withRowBorders={false} style={{ fontVariantNumeric: "tabular-nums" }}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t("columns.bucket")}</Table.Th>
                      {view.columns.map((line) => (
                        <Table.Th key={line.key} ta="right">
                          {line.label}
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {view.points.map((point) => (
                      <Table.Tr key={point.start}>
                        <Table.Td>
                          {point.label}
                          {point.isPartial ? ` (${t("partial")})` : ""}
                        </Table.Td>
                        {view.columns.map((line) => {
                          const value = point[line.key] as number | null;
                          return (
                            <Table.Td key={line.key} ta="right">
                              {pct(value === null ? null : value / 100)} ({format.number(point[`n:${line.key}`] as number)})
                            </Table.Td>
                          );
                        })}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            )}
            <Text size="xs" c="var(--color-text-muted)" mt={12} data-testid="definition">
              {definition.description} {t("definition.timeBasis", { timeBasis: definition.timeBasis, adr: definition.adr })}
            </Text>
          </CardSection>
        )
      ) : (
        <Box aria-busy aria-label={t("loading")}>
          <MetricsBodySkeleton />
        </Box>
      )}
    </Stack>
  );
}
