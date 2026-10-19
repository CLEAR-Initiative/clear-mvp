"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Group, SegmentedControl, Text } from "@mantine/core";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type XAxisTickContentProps,
} from "recharts";
import { CardSection } from "~/components/ui";
import { SkeletonBone, SkeletonPulseStyles } from "~/components/ui/skeleton-bone";
import { rollingWeekly, ROLLING_WEEKS, TREND_WEEKS, type DetectionMetrics, type RollingWeek } from "~/lib/detection-metrics";
import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from "./chart-tooltip";
import { useShareFormat } from "./use-share-format";

export type TrendMode = "rolling" | "weekly";

/** Each series: its share, colour token and dash. The two TTD shares are
 * told apart by dash as well as hue; coverage, a different quantity on the
 * same 0–100% axis, is a muted dotted line behind them. */
const SERIES = [
  { key: "byNextDay", dataKey: "byNextDayPct", share: "byNextDayShare", color: "var(--color-accent)", dash: undefined },
  { key: "sameDay", dataKey: "sameDayPct", share: "sameDayShare", color: "var(--color-info)", dash: "5 4" },
  { key: "measured", dataKey: "measuredPct", share: "measuredShare", color: "var(--color-text-muted)", dash: "2 3" },
] as const;

interface Point extends RollingWeek {
  label: string;
  byNextDayPct: number | null;
  sameDayPct: number | null;
  measuredPct: number | null;
}

const toPct = (share: number | null) => (share === null ? null : Math.round(share * 1000) / 10);

/** A line's marker: hollow on the partial week, filled otherwise, none
 * where the point measured nothing. */
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

/**
 * Time to detection over time: by next day (solid), same day (dashed) and
 * measured coverage (dotted), per ISO week or over the 4 weeks to each week.
 * `metrics` is the trend's own query, which runs from `ROLLING_WEEKS - 1`
 * weeks before `showFrom` so the first drawn window is full; only weeks from
 * `showFrom` are drawn. The current, partial week has a hollow marker.
 */
export function WeeklyTrend({
  metrics,
  showFrom,
  loading = false,
  error = null,
  defaultMode = "rolling",
}: {
  metrics?: DetectionMetrics;
  showFrom: string;
  loading?: boolean;
  error?: string | null;
  defaultMode?: TrendMode;
}) {
  const t = useTranslations("metrics.weekly");
  const format = useFormatter();
  const pct = useShareFormat();
  const [mode, setMode] = useState<TrendMode>(defaultMode);
  const weekLabel = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", timeZone: "UTC" });

  const weeks = metrics
    ? (mode === "rolling"
        ? rollingWeekly(metrics.weekly)
        : metrics.weekly.map((week) => ({ ...week, windowWeeks: 1 }))
      ).filter((week) => week.weekStart >= showFrom)
    : [];
  const data: Point[] = weeks.map((week) => ({
    ...week,
    label: weekLabel(week.weekStart),
    byNextDayPct: toPct(week.byNextDayShare),
    sameDayPct: toPct(week.sameDayShare),
    measuredPct: toPct(week.measuredShare),
  }));
  const hasCoverage = data.some((point) => point.measuredShare !== null);
  const series = SERIES.filter((s) => s.key !== "measured" || hasCoverage);
  const anyMeasured = data.some((point) => point.counted > 0);

  let body: React.ReactNode;
  if (error) {
    body = (
      <Text size="sm" c="var(--color-text-secondary)" role="alert">
        {t("error", { message: error })}
      </Text>
    );
  } else if (loading || !metrics) {
    body = (
      <Box aria-busy aria-label={t("loading")}>
        <SkeletonPulseStyles />
        <SkeletonBone height={260} />
      </Box>
    );
  } else if (!anyMeasured) {
    body = (
      <Text size="sm" c="var(--color-text-secondary)">
        {t("empty")}
      </Text>
    );
  } else {
    body = (
      <>
        <Box h={260} dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: GRID_STROKE }}
                minTickGap={16}
                // Keep the last (possibly partial) week's tick when thinning.
                interval="preserveEnd"
                tick={({ x, y, payload }: XAxisTickContentProps) => {
                  // `index` counts the ticks left after thinning, not weeks.
                  const partial = data.find((week) => week.label === payload.value)?.isPartial;
                  return (
                    <text x={x} y={Number(y) + 12} textAnchor="middle" fill={AXIS_TICK.fill} fontSize={AXIS_TICK.fontSize}>
                      <tspan x={x}>{String(payload.value)}</tspan>
                      {partial && (
                        <tspan x={x} dy={13} fontStyle="italic">
                          {t("partial")}
                        </tspan>
                      )}
                    </text>
                  );
                }}
                height={40}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => pct(v / 100)}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border-dark)" }}
                content={({ active, payload }) => {
                  const week = payload?.[0]?.payload as Point | undefined;
                  if (!active || !week) return null;
                  const title =
                    mode === "rolling"
                      ? t("tooltip.window", { weeks: week.windowWeeks, week: week.isoWeek, start: week.label })
                      : t("tooltip.week", { week: week.isoWeek, start: week.label });
                  return (
                    <ChartTooltipCard title={title}>
                      {series.map((s) => (
                        <Text key={s.key} size="xs" c="var(--color-text-secondary)">
                          {t(`series.${s.key}`)}: {pct(week[s.share])}
                        </Text>
                      ))}
                      <Text size="xs" c="var(--color-text-muted)" mt={4}>
                        {week.eventsInRange === null
                          ? t("tooltip.n", { n: week.counted })
                          : t("tooltip.nOfRange", { n: week.counted, total: week.eventsInRange })}
                      </Text>
                      {week.isPartial && (
                        <Text size="xs" c="var(--color-text-muted)" fs="italic">
                          {t("tooltip.partial")}
                        </Text>
                      )}
                    </ChartTooltipCard>
                  );
                }}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="linear"
                  dataKey={s.dataKey}
                  name={t(`series.${s.key}`)}
                  stroke={s.color}
                  strokeWidth={s.key === "measured" ? 1.5 : 2}
                  strokeDasharray={s.dash}
                  dot={marker(s.color)}
                  activeDot={{ r: 5, fill: s.color, stroke: "var(--color-bg-white)", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Group gap={16} mt={12} wrap="wrap" aria-label={t("legend")}>
          {series.map((s) => (
            <Group key={s.key} gap={6} wrap="nowrap">
              <svg width={20} height={8} aria-hidden>
                <line x1={0} x2={20} y1={4} y2={4} stroke={s.color} strokeWidth={2} strokeDasharray={s.dash} />
              </svg>
              <Text size="xs" c="var(--color-text-secondary)">
                {t(`series.${s.key}`)}
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
        </Group>
        <Text size="xs" c="var(--color-text-muted)" mt={8}>
          {t("footnote", { weeks: TREND_WEEKS })}
          {hasCoverage ? ` ${t("coverageNote")}` : ` ${t("coverageUnavailable")}`}
        </Text>
      </>
    );
  }

  return (
    <CardSection
      title={t("title")}
      subtitle={mode === "rolling" ? t("subtitle.rolling", { weeks: ROLLING_WEEKS }) : t("subtitle.weekly")}
      action={
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={(value) => setMode(value as TrendMode)}
          aria-label={t("mode.label")}
          data={[
            { value: "rolling", label: t("mode.rolling", { weeks: ROLLING_WEEKS }) },
            { value: "weekly", label: t("mode.weekly") },
          ]}
        />
      }
    >
      {body}
    </CardSection>
  );
}
