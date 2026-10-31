"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Box, Group, Text } from "@mantine/core";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type XAxisTickContentProps,
} from "recharts";
import { CardSection } from "~/components/ui";
import { modelChangeWeeks, type AgentWeek } from "~/lib/agent-metrics";
import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from "./chart-tooltip";

/** Which weekly number a chart shows. One measure per chart: the three share
 * no axis, so they are three charts, never two scales on one. */
export type AgentWeeklyMetric = "costPerTurnUsd" | "latencyMedianMs" | "inputTokensPerTurn";

interface Point extends AgentWeek {
  label: string;
  value: number | null;
  /** True on the first week whose models differ from the last active week. */
  modelChanged: boolean;
}

const LINE = "var(--color-accent)";
const CHANGE = "var(--color-text-muted)";

/** A week's marker: hollow on the partial week, filled otherwise, none
 * where the week had no turns. */
function WeekMarker(props: { cx?: number; cy?: number; index?: number; payload?: Point; value?: unknown }) {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null || props.value == null || !payload) return <g key={`m-${index}`} />;
  return payload.isPartial ? (
    <circle key={`m-${index}`} cx={cx} cy={cy} r={4} fill="var(--color-bg-white)" stroke={LINE} strokeWidth={2} />
  ) : (
    <circle key={`m-${index}`} cx={cx} cy={cy} r={3.5} fill={LINE} stroke="var(--color-bg-white)" strokeWidth={1.5} />
  );
}

/**
 * One Agent number per ISO week, as a line, with a dashed vertical rule on
 * each week where the answering model changed. That rule is the point of the
 * chart: whether a change to the Agent moved the number.
 */
export function AgentWeeklyChart({
  metric,
  weekly,
  formatValue,
  toValue = (v) => v,
}: {
  metric: AgentWeeklyMetric;
  weekly: AgentWeek[];
  /** Formats a value for the axis and tooltip. */
  formatValue: (value: number) => string;
  /** Maps clear-api's unit to the chart's (milliseconds to seconds). */
  toValue?: (value: number) => number;
}) {
  const t = useTranslations("metrics.agent.weekly");
  const format = useFormatter();
  const changes = modelChangeWeeks(weekly);
  const data: Point[] = weekly.map((week) => {
    const raw = week[metric];
    return {
      ...week,
      label: format.dateTime(new Date(week.weekStart), { day: "numeric", month: "short", timeZone: "UTC" }),
      value: raw === null ? null : toValue(raw),
      modelChanged: changes.has(week.isoWeek),
    };
  });
  const anyChange = data.some((d) => d.modelChanged);

  return (
    <CardSection
      title={t(`${metric}.title`)}
      subtitle={t(`${metric}.subtitle`)}
      action={
        <Group gap={12} wrap="wrap" aria-label={t("legend")}>
          {anyChange && (
            <Group gap={6} wrap="nowrap">
              <svg width={8} height={14} aria-hidden>
                <line x1={4} x2={4} y1={0} y2={14} stroke={CHANGE} strokeWidth={1.5} strokeDasharray="3 3" />
              </svg>
              <Text size="xs" c="var(--color-text-secondary)">
                {t("modelChanged")}
              </Text>
            </Group>
          )}
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
      <Box h={220} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
              minTickGap={8}
              interval="preserveEnd"
              tick={({ x, y, payload }: XAxisTickContentProps) => {
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
              domain={[0, "auto"]}
              tickFormatter={(v: number) => formatValue(v)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            {data
              .filter((d) => d.modelChanged)
              .map((d) => (
                <ReferenceLine key={d.isoWeek} x={d.label} stroke={CHANGE} strokeDasharray="3 3" ifOverflow="extendDomain" />
              ))}
            <Tooltip
              cursor={{ stroke: "var(--color-border-dark)" }}
              content={({ active, payload }) => {
                const week = payload?.[0]?.payload as Point | undefined;
                if (!active || !week) return null;
                return (
                  <ChartTooltipCard title={t("tooltip.week", { week: week.isoWeek, start: week.label })}>
                    <Text size="xs" c="var(--color-text-secondary)">
                      {t(`${metric}.series`)}: {week.value === null ? "—" : formatValue(week.value)}
                    </Text>
                    <Text size="xs" c="var(--color-text-muted)" mt={4}>
                      {t("tooltip.n", { n: week.turns })}
                    </Text>
                    {week.models.length > 0 && (
                      <Text size="xs" c="var(--color-text-muted)">
                        {t("tooltip.models", { models: week.models.join(", ") })}
                      </Text>
                    )}
                    {week.modelChanged && (
                      <Text size="xs" c="var(--color-text-muted)" fs="italic">
                        {t("tooltip.modelChanged")}
                      </Text>
                    )}
                    {week.isPartial && (
                      <Text size="xs" c="var(--color-text-muted)" fs="italic">
                        {t("tooltip.partial")}
                      </Text>
                    )}
                  </ChartTooltipCard>
                );
              }}
            />
            <Line
              type="linear"
              dataKey="value"
              name={t(`${metric}.series`)}
              stroke={LINE}
              strokeWidth={2}
              dot={WeekMarker}
              activeDot={{ r: 5, fill: LINE, stroke: "var(--color-bg-white)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </CardSection>
  );
}
