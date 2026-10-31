"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Box, Group, Table, Text, UnstyledButton } from "@mantine/core";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardSection } from "~/components/ui";
import { LEVELS, type LocationPrecisionMetrics, type SourcePrecision } from "~/lib/location-precision";
import { AXIS_TICK, ChartTooltipCard, GRID_STROKE } from "./chart-tooltip";
import { LEVEL_FILL, toPct } from "./precision-levels";
import { useShareFormat } from "./use-share-format";

interface Row {
  source: string;
  total: number;
  fineLabel: string;
  counts: SourcePrecision;
  noLocation: number;
  country: number;
  state: number;
  district: number;
  point: number;
}

/** Each source's located signals by the level of their location, as a
 * stacked bar of shares, with the district-or-finer share at the end. */
export function PrecisionBySource({ metrics }: { metrics: LocationPrecisionMetrics }) {
  const t = useTranslations("metrics.precision.bySource");
  const tl = useTranslations("metrics.precision.levels");
  const format = useFormatter();
  const pct = useShareFormat();
  const [table, setTable] = useState(false);
  const rows = metrics.bySource.filter((row) => row.total > 0);
  const data: Row[] = rows.map((row) => ({
    source: row.source,
    total: row.total,
    fineLabel: pct(row.fineShare),
    counts: row,
    noLocation: toPct(row.shares.noLocation) ?? 0,
    country: toPct(row.shares.country) ?? 0,
    state: toPct(row.shares.state) ?? 0,
    district: toPct(row.shares.district) ?? 0,
    point: toPct(row.shares.point) ?? 0,
  }));

  return (
    <CardSection
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        <Group gap={12} wrap="wrap" aria-label={t("legend")}>
          {LEVELS.map((level) => (
            <Group key={level} gap={6} wrap="nowrap">
              <Box w={12} h={12} style={{ borderRadius: 3, background: LEVEL_FILL[level] }} aria-hidden />
              <Text size="xs" c="var(--color-text-secondary)">
                {tl(level)}
              </Text>
            </Group>
          ))}
          <UnstyledButton onClick={() => setTable((open) => !open)} aria-expanded={table}>
            <Text size="xs" fw={600} c="var(--color-accent)">
              {table ? t("hideTable") : t("showTable")}
            </Text>
          </UnstyledButton>
        </Group>
      }
    >
      <Box h={Math.max(120, rows.length * 34 + 40)} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 4, right: 56, bottom: 0, left: 8 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => pct(v / 100)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <YAxis type="category" dataKey="source" width={104} tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--color-bg-muted)" }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Row | undefined;
                if (!active || !row) return null;
                return (
                  <ChartTooltipCard title={row.source}>
                    {LEVELS.map((level) => (
                      <Text key={level} size="xs" c="var(--color-text-secondary)">
                        {tl(level)}: {t("tooltip", { count: row.counts[level], share: pct(row.counts.shares[level]) })}
                      </Text>
                    ))}
                    <Text size="xs" fw={600} c="var(--color-text-primary)" mt={4}>
                      {t("columns.fine")}: {pct(row.counts.fineShare)} · {t("n", { n: row.total })}
                    </Text>
                  </ChartTooltipCard>
                );
              }}
            />
            {LEVELS.map((level, i) => (
              <Bar
                key={level}
                dataKey={level}
                stackId="levels"
                name={tl(level)}
                fill={LEVEL_FILL[level]}
                stroke="var(--color-bg-white)"
                strokeWidth={1}
                maxBarSize={22}
                isAnimationActive={false}
              >
                {i === LEVELS.length - 1 && (
                  <LabelList dataKey="fineLabel" position="right" fill="var(--color-text-primary)" fontSize={11} />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
      {table && (
        <Box style={{ overflowX: "auto" }} mt={8}>
          <Table fz="xs" striped withRowBorders={false} style={{ fontVariantNumeric: "tabular-nums" }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("columns.source")}</Table.Th>
                <Table.Th ta="right">{t("columns.signals")}</Table.Th>
                {LEVELS.map((level) => (
                  <Table.Th key={level} ta="right">
                    {tl(level)}
                  </Table.Th>
                ))}
                <Table.Th ta="right">{t("columns.fine")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.source}>
                  <Table.Td>{row.source}</Table.Td>
                  <Table.Td ta="right">{format.number(row.total)}</Table.Td>
                  {LEVELS.map((level) => (
                    <Table.Td key={level} ta="right">
                      {format.number(row[level])}
                    </Table.Td>
                  ))}
                  <Table.Td ta="right" fw={600}>
                    {pct(row.fineShare)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}
    </CardSection>
  );
}
