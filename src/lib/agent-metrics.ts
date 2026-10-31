/**
 * CLEAR Agent usage, as clear-api's `agentMetrics` reports it (clear-api
 * ADR-0013). clear-api owns the definition of a turn and returns counts,
 * sums and averages; this module types the payload and adds the one
 * derivation the /metrics charts need: which weeks mark a model change.
 */

/** One ISO week of clear-api's `AgentMetrics.weekly`. */
export interface AgentWeek {
  isoWeek: string;
  weekStart: string;
  isPartial: boolean;
  turns: number;
  conversations: number;
  users: number;
  costUsd: number;
  costPerTurnUsd: number | null;
  latencyMedianMs: number | null;
  inputTokensPerTurn: number | null;
  toolCallsPerTurn: number | null;
  /** The models that answered this week, sorted. */
  models: string[];
}

/** clear-api's `AgentMetrics` payload, without `recentQuestions`. */
export interface AgentMetrics {
  from: string;
  to: string;
  turns: number;
  turnsUnrecorded: number;
  conversations: number;
  newConversations: number;
  users: number;
  totalCostUsd: number;
  costPerTurnUsd: number | null;
  costPerTurnP95Usd: number | null;
  costPerConversationUsd: number | null;
  latencyMedianMs: number | null;
  latencyP95Ms: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  inputTokensPerTurn: number | null;
  outputTokensPerTurn: number | null;
  toolCallsPerTurn: number | null;
  turnsWithoutTools: number;
  turnsWithManyToolCalls: number;
  budgetLimitUsd: number;
  budgetHits: number;
  byModel: Array<{ model: string; turns: number; costUsd: number; inputTokens: number; outputTokens: number }>;
  byTool: Array<{ tool: string; calls: number; turns: number }>;
  byPage: Array<{ page: string; turns: number }>;
  weekly: AgentWeek[];
}

/** One recent question, as clear-api returns it: never the user. */
export interface AgentQuestion {
  askedAt: string;
  question: string;
  page: string;
}

/** `metrics.agent`'s result: the metrics, or clear-api not serving them yet. */
export type AgentMetricsResult = { status: "ok"; metrics: AgentMetrics } | { status: "unavailable" };

/** `metrics.agentQuestions`'s result. */
export type AgentQuestionsResult =
  | { status: "ok"; from: string; to: string; questions: AgentQuestion[] }
  | { status: "unavailable" };

/**
 * The ISO weeks where the set of answering models differs from the last
 * week that had any turns. Weeks with no turns are skipped, not counted as
 * a change, so a quiet week between two Sonnet weeks marks nothing. The
 * first week with turns is never a change.
 */
export function modelChangeWeeks(weekly: ReadonlyArray<Pick<AgentWeek, "isoWeek" | "models">>): Set<string> {
  const changes = new Set<string>();
  let previous: string | null = null;
  for (const week of weekly) {
    if (week.models.length === 0) continue;
    const key = week.models.join("\u0000");
    if (previous !== null && key !== previous) changes.add(week.isoWeek);
    previous = key;
  }
  return changes;
}
