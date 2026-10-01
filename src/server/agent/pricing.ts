/**
 * What a CLEAR Agent turn costs, for the daily Agent budget.
 *
 * USD per million tokens, keyed by the exact `CLEAR_AGENT_MODEL` router
 * string. Anthropic first-party rates as of 2026-09-25. All input tokens
 * are priced at the full input rate (cache reads are cheaper), so the
 * budget errs on the side of counting too much.
 *
 * A configured model with no price here fails startup
 * (`assertClearAgentModelPriced`, called from instrumentation): the budget
 * must never be bypassed by a model nobody priced.
 */

export interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  "anthropic/claude-fable-5-1": { inputPerMTok: 10, outputPerMTok: 50 },
  "anthropic/claude-opus-5-5": { inputPerMTok: 4, outputPerMTok: 20 },
  "anthropic/claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25 },
  "anthropic/claude-sonnet-5-5": { inputPerMTok: 2, outputPerMTok: 10 },
  "anthropic/claude-sonnet-5": { inputPerMTok: 2, outputPerMTok: 10 },
  "anthropic/claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
};

export function priceFor(modelId: string): ModelPrice | undefined {
  return Object.hasOwn(MODEL_PRICES, modelId) ? MODEL_PRICES[modelId] : undefined;
}

export interface TurnTokens {
  inputTokens: number;
  outputTokens: number;
}

/** Cost of one turn in USD. Throws for an unpriced model. */
export function turnCostUsd(modelId: string, tokens: TurnTokens): number {
  const price = priceFor(modelId);
  if (!price) throw new Error(`No price for CLEAR_AGENT_MODEL "${modelId}"`);
  return (
    (tokens.inputTokens * price.inputPerMTok + tokens.outputTokens * price.outputPerMTok) /
    1_000_000
  );
}

/**
 * Fail startup when the configured model has no price. An unset model is
 * fine at startup — the Agent just answers 503 until one is configured.
 */
export function assertClearAgentModelPriced(
  env: Record<string, string | undefined> = process.env,
): void {
  const id = env.CLEAR_AGENT_MODEL?.trim();
  if (id && !priceFor(id)) {
    throw new Error(
      `CLEAR_AGENT_MODEL "${id}" has no price in src/server/agent/pricing.ts. ` +
        "Add one so the daily Agent budget can be enforced.",
    );
  }
}
