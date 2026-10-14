"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Box, Group, Text } from "@mantine/core";
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
import type { DetectionMetrics } from "~/lib/detection-metrics";
import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from "./chart-tooltip";
import { useShareFormat } from "./use-share-format";

type Week = DetectionMetrics["weekly"][number];

/** Each series: its value, colour token and dash. Same day is dashed, so the
 * pair is told apart by more than hue. */
const SERIES = [
  { key: "byNextDay", dataKey: "byNextDayPct", color: "var(--color-accent)", dash: undefined },
  { key: "sameDay", dataKey: "sameDayPct", color: "var(--color-info)", dash: "5 4" },
] as const;

interface Point extends Week {
  label: string;
  byNextDayPct: number | null;
  sameDayPct: number | null;
}

const toPct = (share: number | null) => (share === null ? null : Math.round(share * 1000) / 10);

/** A line's marker: hollow on the partial week, filled otherwise, none
 * where the week measured nothing. */
function marker(color: string) {
  function WeekMarker(props: { cx?: number; cy?: number; index?: number; payload?: Point; value?: unknown }) {
    const { cx, cy, payload, index } = props;
    if (cx == null || cy == null || props.value == null || !payload) return <g key={`m-${index}`} />;
    return payload.isPartial ? (
      <circle key={`m-${index}`} cx={cx} cy={cy} r={4} fill="var(--color-bg-white)" stroke={color} strokeWidth={2} />
    ) : (
      <circle key={`m-${index}`} cx={cx} cy={cy} r={3.5} fill={color} stroke="var(--color-bg-white)" strokeWidth={1.5} />
    );
  }
  return WeekMarker;
}

/** By next day (solid) and same day (dashed), as shares of each ISO week's
 * measured events. The current, partial week has a hollow marker. */
export function WeeklyTrend({ metrics }: { metrics: DetectionMetrics }) {
  const t = useTranslations("metrics.weekly");
  const format = useFormatter();
  const pct = useShareFormat();
  const data: Point[] = metrics.weekly.map((week) => ({
    ...week,
    label: format.dateTime(new Date(week.weekStart), { day: "numeric", month: "short", timeZone: "UTC" }),
    byNextDayPct: toPct(week.byNextDayShare),
    sameDayPct: toPct(week.sameDayShare),
  }));

  return (
    <CardSection
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        <Group gap={12} wrap="wrap" aria-label={t("legend")}>
          {SERIES.map((s) => (
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
      }
    >
      <Box h={240} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
              minTickGap={8}
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
                return (
                  <ChartTooltipCard title={t("tooltip.week", { week: week.isoWeek, start: week.label })}>
                    {SERIES.map((s) => (
                      <Text key={s.key} size="xs" c="var(--color-text-secondary)">
                        {t(`series.${s.key}`)}: {pct(s.key === "byNextDay" ? week.byNextDayShare : week.sameDayShare)}
                      </Text>
                    ))}
                    <Text size="xs" c="var(--color-text-muted)" mt={4}>
                      {t("tooltip.n", { n: week.counted })}
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
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.dataKey}
                name={t(`series.${s.key}`)}
                stroke={s.color}
                strokeWidth={2}
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
    </CardSection>
  );
}
