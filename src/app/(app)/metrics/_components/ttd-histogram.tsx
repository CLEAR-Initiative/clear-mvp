"use client";

import { useTranslations } from "next-intl";
import { Box, Text } from "@mantine/core";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CardSection } from "~/components/ui";
import type { DetectionMetrics } from "~/lib/detection-metrics";
import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from "./chart-tooltip";
import { useShareFormat } from "./use-share-format";

type Row = DetectionMetrics["histogram"][number];

/** A histogram bucket's label, as a `metrics.histogram.buckets` key and its
 * day count: same day, next day, +Nd, or Nd+ for the open-ended last one. */
export function bucketLabelKey(row: Pick<Row, "daysAfterOnset" | "isOpenEnded">): {
  key: "sameDay" | "nextDay" | "plusDays" | "openEnded";
  days: number;
} {
  const days = row.daysAfterOnset;
  if (row.isOpenEnded) return { key: "openEnded", days };
  if (days === 0) return { key: "sameDay", days };
  if (days === 1) return { key: "nextDay", days };
  return { key: "plusDays", days };
}

/** Measured events by whole days from onset to first signal (0..7, then 8+). */
export function TtdHistogram({ metrics }: { metrics: DetectionMetrics }) {
  const t = useTranslations("metrics.histogram");
  const tBucket = useTranslations("metrics.histogram.buckets");
  const pct = useShareFormat();
  const data = metrics.histogram.map((row) => {
    const { key, days } = bucketLabelKey(row);
    return { ...row, label: tBucket(key, { days }) };
  });

  return (
    <CardSection title={t("title")} subtitle={t("subtitle")}>
      <Box h={240} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval={0} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--color-bg-muted)" }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (Row & { label: string }) | undefined;
                if (!active || !row) return null;
                return (
                  <ChartTooltipCard title={row.label}>
                    <Text size="xs" c="var(--color-text-secondary)">
                      {t("tooltip", { count: row.count, share: pct(row.share) })}
                    </Text>
                  </ChartTooltipCard>
                );
              }}
            />
            <Bar
              dataKey="count"
              name={t("series")}
              fill="var(--color-accent)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <Text size="xs" c="var(--color-text-muted)" mt={8}>
        {t("footnote", { counted: metrics.counted })}
      </Text>
    </CardSection>
  );
}
