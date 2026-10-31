"use client";

import { useFormatter, useTranslations } from "next-intl";
import { SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { CardSection } from "~/components/ui";
import type { AgentMetrics } from "~/lib/agent-metrics";
import { useAgentFormat } from "./use-agent-format";

/** The longest list shown per breakdown; the rest is summed as "other". */
const MAX_ROWS = 8;

function Heading({ children }: { children: string }) {
  return (
    <Text size="xs" fw={600} tt="uppercase" c="var(--color-text-muted)" style={{ letterSpacing: "0.5px" }}>
      {children}
    </Text>
  );
}

/** A small table in text tokens: a name column and numeric columns. */
function BreakdownTable({
  columns,
  rows,
  other,
}: {
  columns: string[];
  rows: Array<Array<string | number>>;
  /** The summed rows beyond the first {@link MAX_ROWS}, if any. */
  other?: Array<string | number>;
}) {
  const t = useTranslations("metrics.agent.breakdown");
  const format = useFormatter();
  const cell = (v: string | number) => (typeof v === "number" ? format.number(v) : v);
  return (
    <Table verticalSpacing={4} horizontalSpacing={6} fz="xs" c="var(--color-text-secondary)">
      <Table.Thead>
        <Table.Tr>
          {columns.map((c, i) => (
            <Table.Th key={c} ta={i === 0 ? "start" : "end"} c="var(--color-text-muted)" fw={500}>
              {c}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((r) => (
          <Table.Tr key={String(r[0])}>
            {r.map((v, i) => (
              <Table.Td key={i} ta={i === 0 ? "start" : "end"} c={i === 0 ? "var(--color-text-primary)" : undefined}>
                {cell(v)}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
        {other && (
          <Table.Tr>
            {other.map((v, i) => (
              <Table.Td key={i} ta={i === 0 ? "start" : "end"} fs="italic">
                {i === 0 ? t("other", { n: Number(v) }) : cell(v)}
              </Table.Td>
            ))}
          </Table.Tr>
        )}
      </Table.Tbody>
    </Table>
  );
}

/** Tools, pages and models, as tables: what the Agent is used for, from
 * where, and by which model. Tables rather than bars, so the numbers read
 * exactly and the page needs no third colour. */
export function AgentBreakdowns({ metrics }: { metrics: AgentMetrics }) {
  const t = useTranslations("metrics.agent.breakdown");
  const { decimal, usd } = useAgentFormat();

  const tools = metrics.byTool.slice(0, MAX_ROWS).map((r) => [r.tool, r.calls, r.turns]);
  const toolsRest = metrics.byTool.slice(MAX_ROWS);
  const pages = metrics.byPage.slice(0, MAX_ROWS).map((r) => [r.page === "unknown" ? t("unknown") : r.page, r.turns]);
  const pagesRest = metrics.byPage.slice(MAX_ROWS);
  const models = metrics.byModel.map((r) => [r.model === "unknown" ? t("unknown") : r.model, r.turns, usd(r.costUsd)]);

  return (
    <CardSection
      title={t("title")}
      subtitle={t("subtitle", {
        perTurn: decimal(metrics.toolCallsPerTurn),
        many: metrics.turnsWithManyToolCalls,
        none: metrics.turnsWithoutTools,
      })}
    >
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing={16}>
        <Stack gap={6}>
          <Heading>{t("tools")}</Heading>
          {tools.length === 0 ? (
            <Text size="xs" c="var(--color-text-muted)">
              {t("empty")}
            </Text>
          ) : (
            <BreakdownTable
              columns={[t("columns.tool"), t("columns.calls"), t("columns.turns")]}
              rows={tools}
              other={
                toolsRest.length > 0
                  ? [toolsRest.length, toolsRest.reduce((a, r) => a + r.calls, 0), toolsRest.reduce((a, r) => a + r.turns, 0)]
                  : undefined
              }
            />
          )}
        </Stack>
        <Stack gap={6}>
          <Heading>{t("pages")}</Heading>
          {pages.length === 0 ? (
            <Text size="xs" c="var(--color-text-muted)">
              {t("empty")}
            </Text>
          ) : (
            <BreakdownTable
              columns={[t("columns.page"), t("columns.turns")]}
              rows={pages}
              other={pagesRest.length > 0 ? [pagesRest.length, pagesRest.reduce((a, r) => a + r.turns, 0)] : undefined}
            />
          )}
        </Stack>
        <Stack gap={6}>
          <Heading>{t("models")}</Heading>
          {models.length === 0 ? (
            <Text size="xs" c="var(--color-text-muted)">
              {t("empty")}
            </Text>
          ) : (
            <BreakdownTable columns={[t("columns.model"), t("columns.turns"), t("columns.cost")]} rows={models} />
          )}
        </Stack>
      </SimpleGrid>
    </CardSection>
  );
}
