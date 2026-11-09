"use client";

import { useFormatter, useTranslations } from "next-intl";
import { keepPreviousData } from "@tanstack/react-query";
import { Alert, Box, List, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { CardSection } from "~/components/ui";
import { MetricsBodySkeleton } from "~/components/ui/metrics-page-skeleton";
import { api } from "~/trpc/react";
import { AgentBreakdowns } from "./agent-breakdowns";
import { AgentQuestions } from "./agent-questions";
import { AgentStatTiles } from "./agent-stat-tiles";
import { AgentWeeklyChart } from "./agent-weekly-chart";
import { noticeStyles } from "./notice-styles";
import { useAgentFormat } from "./use-agent-format";

const NO_RETRY = new Set(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED"]);

/** How the Agent numbers are measured, in plain language (clear-api ADR-0013). */
function AgentMethodNote() {
  const t = useTranslations("metrics.agent.method");
  const items = ["turn", "inRange", "tokens", "pages", "questions", "definition"] as const;
  return (
    <CardSection title={t("title")}>
      <Text size="sm" c="var(--color-text-secondary)" mb={8}>
        {t("intro")}
      </Text>
      <List size="sm" spacing={6} listStyleType="disc" c="var(--color-text-secondary)">
        {items.map((key) => (
          <List.Item key={key}>{t(`points.${key}`)}</List.Item>
        ))}
      </List>
    </CardSection>
  );
}

/**
 * The CLEAR Agent on /metrics: spend, cost per turn, latency and usage over
 * the page's date range, as weekly trends with model-change markers, so a
 * change to the Agent (Exponential #1269) shows as before and after. Dates
 * only: the Agent is not scoped to a country, so the country filter does not
 * apply here and the heading says so.
 */
export function AgentSection({ input }: { input: { from?: string; to?: string } }) {
  const t = useTranslations("metrics.agent");
  const format = useFormatter();
  const { usd, seconds, decimal } = useAgentFormat();
  const query = api.metrics.agent.useQuery(input, {
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: (count, err) => !NO_RETRY.has(err.data?.code ?? "") && count < 2,
  });
  const result = query.data;
  const utcDay = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" });

  let body;
  // The page leaves this section out while the filters show a refused range,
  // so any error here, a refused range included, is shown here.
  if (query.error) {
    body = (
      <Alert styles={noticeStyles("critical")} icon={<IconAlertTriangle size={16} />} title={t("error.title")}>
        {query.error.message}
      </Alert>
    );
  } else if (result?.status === "unavailable") {
    body = (
      <Alert styles={noticeStyles("warning")} icon={<IconAlertTriangle size={16} />} title={t("unavailable.title")}>
        {t("unavailable.body")}
      </Alert>
    );
  } else if (result?.status === "ok") {
    const m = result.metrics;
    body = (
      <Stack gap={16}>
        <Text size="xs" c="var(--color-text-muted)">
          {t("range", { from: utcDay(m.from), to: utcDay(m.to) })}
        </Text>
        {m.turns === 0 ? (
          <Alert styles={noticeStyles("info")} icon={<IconInfoCircle size={16} />} title={t("empty.title")}>
            {t("empty.body", { unrecorded: m.turnsUnrecorded })}
          </Alert>
        ) : (
          <>
            <AgentStatTiles metrics={m} />
            <Text size="xs" c="var(--color-text-muted)">
              {t("budget", { limit: usd(m.budgetLimitUsd), hits: m.budgetHits })}
              {m.turnsUnrecorded > 0 ? ` ${t("unrecorded", { n: m.turnsUnrecorded })}` : ""}
            </Text>
            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing={16}>
              <AgentWeeklyChart metric="costPerTurnUsd" weekly={m.weekly} formatValue={(v) => usd(v, 3)} />
              <AgentWeeklyChart
                metric="latencyMedianMs"
                weekly={m.weekly}
                toValue={(ms) => ms / 1000}
                formatValue={(s) => seconds(s * 1000)}
              />
              <AgentWeeklyChart metric="inputTokensPerTurn" weekly={m.weekly} formatValue={(v) => decimal(v, 0)} />
            </SimpleGrid>
            <AgentBreakdowns metrics={m} />
          </>
        )}
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={16}>
          <AgentQuestions input={input} />
          <AgentMethodNote />
        </SimpleGrid>
      </Stack>
    );
  } else {
    body = (
      <Box aria-busy aria-label={t("loading")}>
        <MetricsBodySkeleton />
      </Box>
    );
  }

  return (
    <Stack gap={12} component="section" aria-labelledby="metrics-agent-heading">
      <Box>
        <Text id="metrics-agent-heading" component="h2" fw={600} c="var(--color-text-primary)" style={{ fontSize: 16 }}>
          {t("title")}
        </Text>
        <Text size="xs" c="var(--color-text-muted)">
          {t("scope")}
        </Text>
      </Box>
      {body}
    </Stack>
  );
}
