"use client";

import { useFormatter, useTranslations } from "next-intl";
import { StatsGrid } from "~/components/ui";
import type { AgentMetrics } from "~/lib/agent-metrics";
import { useAgentFormat } from "./use-agent-format";

const VALUE = "var(--color-text-primary)";
const SUB = "var(--color-text-muted)";

/** The headline numbers for the Agent: spend, cost per turn, median latency,
 * and how much it was used. The targets in Exponential #1269 are stated in
 * the second and third, so they sit side by side. */
export function AgentStatTiles({ metrics }: { metrics: AgentMetrics }) {
  const t = useTranslations("metrics.agent.tiles");
  const format = useFormatter();
  const { usd, seconds } = useAgentFormat();

  return (
    <StatsGrid
      cols={4}
      mobileCols={2}
      mb={0}
      stats={[
        {
          label: t("spend.label"),
          value: usd(metrics.totalCostUsd),
          color: VALUE,
          sub: t("spend.sub", { perConversation: usd(metrics.costPerConversationUsd) }),
          subColor: SUB,
        },
        {
          label: t("costPerTurn.label"),
          value: usd(metrics.costPerTurnUsd, 3),
          color: VALUE,
          sub: t("costPerTurn.sub", { p95: usd(metrics.costPerTurnP95Usd, 3) }),
          subColor: SUB,
        },
        {
          label: t("latency.label"),
          value: seconds(metrics.latencyMedianMs),
          color: VALUE,
          sub: t("latency.sub", { p95: seconds(metrics.latencyP95Ms) }),
          subColor: SUB,
        },
        {
          label: t("turns.label"),
          value: format.number(metrics.turns),
          color: VALUE,
          sub: t("turns.sub", { conversations: metrics.conversations, users: metrics.users }),
          subColor: SUB,
        },
      ]}
    />
  );
}
