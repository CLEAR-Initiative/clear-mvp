"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Group, Table, Text, UnstyledButton } from "@mantine/core";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardSection } from "~/components/ui";
import { EMPHASIS_SOURCE, weekOf, type LocationPrecisionMetrics } from "~/lib/location-precision";
import type { SeriesMarker } from "~/lib/metric-series";
import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from "./chart-tooltip";
import { toPct } from "./precision-levels";
import { useShareFormat } from "./use-share-format";

/** How many sources the chart draws; the rest stay in the table. */
const MAX_LINES = 6;
const EMPHASIS_STROKE = "var(--color-accent)";
const OTHER_STROKE = "var(--color-text-muted)";

interface Point {
  weekStart: string;
  isoWeek: string;
  label: string;
  isPartial: boolean;
  /** `<source>` → share in percent; `n:<source>` → signals. */
  [key: string]: string | number | boolean | null;
}

/** A line's marker: hollow on the partial week, filled otherwise, none
 * where the week located nothing. */
function marker(color: string) {
  function WeekMarker(props: { cx?: number; cy?: number; index?: number; payload?: Point; value?: unknown }) {
    const { cx, cy, payload, index } = props;
    if (cx == null || cy == null || props.value == null || !payload) return <g key={`m-${index}`} />;
    return payload.isPartial ? (
      <circle key={`m-${index}`} cx={cx} cy={cy} r={4} fill="var(--color-bg-white)" stroke={color} strokeWidth={2} />
    ) : (
      <circle key={`m-${index}`} cx={cx} cy={cy} r={3} fill={color} stroke="var(--color-bg-white)" strokeWidth={1.5} />
    );
  }
  return WeekMarker;
}

/** Share of each ISO week's located signals at district or finer, one line
 * per source with the text-only feed emphasised, and a marker on each week a
 * recorded change landed in (several in one week share one label). */
export function PrecisionWeekly({ metrics, markers = [] }: { metrics: LocationPrecisionMetrics; markers?: SeriesMarker[] }) {
  const t = useTranslations("metrics.precision.weekly");
  const format = useFormatter();
  const pct = useShareFormat();
  const [table, setTable] = useState(false);

  const sources = metrics.bySource.slice(0, MAX_LINES).map((row) => row.source);
  const weekStarts = [...new Set(metrics.weekly.map((row) => row.weekStart))].sort();
  const data: Point[] = weekStarts.map((weekStart) => {
    const rows = metrics.weekly.filter((row) => row.weekStart === weekStart);
    const point: Point = {
      weekStart,
      isoWeek: rows[0]?.isoWeek ?? "",
      label: format.dateTime(new Date(weekStart), { day: "numeric", month: "short", timeZone: "UTC" }),
      isPartial: rows.some((row) => row.isPartial),
    };
    for (const source of sources) {
      const row = rows.find((r) => r.source === source);
      point[source] = row ? toPct(row.fineShare) : null;
      point[`n:${source}`] = row?.total ?? 0;
    }
    return point;
  });
  const markerWeeks = new Map<string, string[]>();
  for (const marker of markers) {
    const weekStart = weekOf(weekStarts, marker.at);
    if (!weekStart) continue;
    markerWeeks.set(weekStart, [...(markerWeeks.get(weekStart) ?? []), marker.label]);
  }
  const markerGroups = [...markerWeeks].map(([weekStart, names]) => ({
    weekStart,
    label: data.find((p) => p.weekStart === weekStart)!.label,
    text: names.length === 1 ? names[0]! : t("severalChanges", { n: names.length }),
  }));
  const strokeOf = (source: string) => (source === EMPHASIS_SOURCE ? EMPHASIS_STROKE : OTHER_STROKE);

  return (
    <CardSection
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        <Group gap={12} wrap="wrap" aria-label={t("legend")}>
          {sources.map((source) => (
            <Group key={source} gap={6} wrap="nowrap">
              <svg width={20} height={8} aria-hidden>
                <line x1={0} x2={20} y1={4} y2={4} stroke={strokeOf(source)} strokeWidth={source === EMPHASIS_SOURCE ? 2.5 : 1.5} />
              </svg>
              <Text size="xs" fw={source === EMPHASIS_SOURCE ? 600 : 400} c="var(--color-text-secondary)">
                {source}
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
          <Group gap={6} wrap="nowrap">
            <svg width={10} height={10} aria-hidden>
              <line x1={5} x2={5} y1={0} y2={10} stroke="var(--color-border-dark)" strokeWidth={1.5} strokeDasharray="3 2" />
            </svg>
            <Text size="xs" c="var(--color-text-secondary)">
              {t("deployMarker")}
            </Text>
          </Group>
          <UnstyledButton onClick={() => setTable((open) => !open)} aria-expanded={table}>
            <Text size="xs" fw={600} c="var(--color-accent)">
              {table ? t("hideTable") : t("showTable")}
            </Text>
          </UnstyledButton>
        </Group>
      }
    >
      <Box h={260} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID_STROKE }} minTickGap={8} interval="preserveEnd" tick={AXIS_TICK} height={28} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => pct(v / 100)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            {markerGroups.map((m) => (
              <ReferenceLine
                key={m.weekStart}
                x={m.label}
                stroke="var(--color-border-dark)"
                strokeDasharray="3 2"
                label={{ value: m.text, position: "insideTopLeft", fill: AXIS_TICK.fill, fontSize: 10 }}
              />
            ))}
            <Tooltip
              cursor={{ stroke: "var(--color-border-dark)" }}
              content={({ active, payload }) => {
                const week = payload?.[0]?.payload as Point | undefined;
                if (!active || !week) return null;
                return (
                  <ChartTooltipCard title={t("tooltip.week", { week: week.isoWeek, start: week.label })}>
                    {sources.map((source) => {
                      const value = week[source] as number | null;
                      return (
                        <Text key={source} size="xs" c="var(--color-text-secondary)">
                          {source}: {pct(value === null ? null : value / 100)} · {t("tooltip.n", { n: week[`n:${source}`] as number })}
                        </Text>
                      );
                    })}
                    {week.isPartial && (
                      <Text size="xs" c="var(--color-text-muted)" fs="italic" mt={4}>
                        {t("tooltip.partial")}
                      </Text>
                    )}
                  </ChartTooltipCard>
                );
              }}
            />
            {sources.map((source) => (
              <Line
                key={source}
                type="linear"
                dataKey={source}
                name={source}
                stroke={strokeOf(source)}
                strokeWidth={source === EMPHASIS_SOURCE ? 2.5 : 1.5}
                dot={marker(strokeOf(source))}
                activeDot={{ r: 5, fill: strokeOf(source), stroke: "var(--color-bg-white)", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
      {table && (
        <Box style={{ overflowX: "auto" }} mt={8}>
          <Table fz="xs" striped withRowBorders={false} style={{ fontVariantNumeric: "tabular-nums" }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("columns.week")}</Table.Th>
                {sources.map((source) => (
                  <Table.Th key={source} ta="right">
                    {source}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((week) => (
                <Table.Tr key={week.weekStart}>
                  <Table.Td>
                    {week.isoWeek}
                    {week.isPartial ? ` (${t("partial")})` : ""}
                  </Table.Td>
                  {sources.map((source) => {
                    const value = week[source] as number | null;
                    return (
                      <Table.Td key={source} ta="right">
                        {pct(value === null ? null : value / 100)} ({format.number(week[`n:${source}`] as number)})
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}
    </CardSection>
  );
}
