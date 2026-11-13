"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Box, Text } from "@mantine/core";
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
import type { Granularity } from "~/lib/metric-series";
import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from "./chart-tooltip";
import { useShareFormat } from "./use-share-format";

/** One line on the chart: which point key it reads and how it is drawn. */
export interface SeriesLine {
  key: string;
  label: string;
  color: string;
  width: number;
  dash?: string;
}

/** One bucket on the x-axis, with each line's share in percent under its key and its n under `n:<key>`. */
export interface SeriesPoint {
  start: string;
  /** clear-api's bucket label, e.g. `2026-W44`. */
  label: string;
  /** The x-axis text, unique within a range (at most 364 days). */
  axisLabel: string;
  isPartial: boolean;
  [key: string]: string | number | boolean | null;
}

/** The deploy markers that fall in one bucket, drawn as one line with one label. */
export interface MarkerGroup {
  /** The bucket's `axisLabel`. */
  axisLabel: string;
  names: string[];
}

/** A line's point: hollow on a partial bucket, filled otherwise, none where nothing was measured. */
function marker(color: string) {
  function BucketMarker(props: { cx?: number; cy?: number; index?: number; payload?: SeriesPoint; value?: unknown }) {
    const { cx, cy, payload, index } = props;
    if (cx == null || cy == null || props.value == null || !payload) return <g key={`m-${index}`} />;
    return payload.isPartial ? (
      <circle key={`m-${index}`} cx={cx} cy={cy} r={4} fill="var(--color-bg-white)" stroke={color} strokeWidth={2} />
    ) : (
      <circle key={`m-${index}`} cx={cx} cy={cy} r={3} fill={color} stroke="var(--color-bg-white)" strokeWidth={1.5} />
    );
  }
  return BucketMarker;
}

/**
 * One metric over time: a share per bucket for each line, deploy markers once
 * per bucket, hollow points on partial buckets, and n in the tooltip. Theme
 * tokens only, so it reads in light and dark.
 */
export function SeriesChart({
  data,
  lines,
  markers,
  granularity,
  unit,
}: {
  data: SeriesPoint[];
  lines: SeriesLine[];
  markers: MarkerGroup[];
  granularity: Granularity;
  /** Formats a bucket's n for the tooltip, e.g. "n = 12 signals". */
  unit: (n: number) => string;
}) {
  const t = useTranslations("metrics.progress");
  const format = useFormatter();
  const pct = useShareFormat();

  const title = (point: SeriesPoint) => {
    const start = new Date(point.start);
    if (granularity === "WEEK") return t("tooltip.week", { week: point.label, start: point.axisLabel });
    if (granularity === "MONTH") return format.dateTime(start, { month: "long", year: "numeric", timeZone: "UTC" });
    return format.dateTime(start, { dateStyle: "medium", timeZone: "UTC" });
  };

  return (
    <Box h={260} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis
            dataKey="axisLabel"
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            minTickGap={8}
            // Keep the last (possibly partial) bucket's tick when thinning.
            interval="preserveEnd"
            tick={AXIS_TICK}
            height={28}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => pct(v / 100)}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          {markers.map((group) => (
            <ReferenceLine
              key={group.axisLabel}
              x={group.axisLabel}
              stroke="var(--color-border-dark)"
              strokeDasharray="3 2"
              label={{
                value: group.names.length === 1 ? group.names[0] : t("markers.several", { n: group.names.length }),
                position: "insideTopLeft",
                fill: AXIS_TICK.fill,
                fontSize: 10,
              }}
            />
          ))}
          <Tooltip
            cursor={{ stroke: "var(--color-border-dark)" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as SeriesPoint | undefined;
              if (!active || !point) return null;
              const changes = markers.find((group) => group.axisLabel === point.axisLabel);
              return (
                <ChartTooltipCard title={title(point)}>
                  {lines.map((line) => {
                    const value = point[line.key] as number | null;
                    const n = point[`n:${line.key}`] as number;
                    return (
                      <Text key={line.key} size="xs" c="var(--color-text-secondary)">
                        {line.label}: {pct(value === null ? null : value / 100)} · {unit(n)}
                      </Text>
                    );
                  })}
                  {changes && (
                    <Box mt={4}>
                      <Text size="xs" fw={600} c="var(--color-text-secondary)">
                        {t("tooltip.changes")}
                      </Text>
                      {changes.names.map((name) => (
                        <Text key={name} size="xs" c="var(--color-text-secondary)">
                          {name}
                        </Text>
                      ))}
                    </Box>
                  )}
                  {point.isPartial && (
                    <Text size="xs" c="var(--color-text-muted)" fs="italic" mt={4}>
                      {t("tooltip.partial")}
                    </Text>
                  )}
                </ChartTooltipCard>
              );
            }}
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="linear"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={line.width}
              strokeDasharray={line.dash}
              dot={marker(line.color)}
              activeDot={{ r: 5, fill: line.color, stroke: "var(--color-bg-white)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
