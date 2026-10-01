/**
 * The CLEAR Agent's model, from configuration only.
 *
 * `CLEAR_AGENT_MODEL` is a Mastra model-router string (`provider/model`,
 * e.g. `anthropic/<model>`, which reads `ANTHROPIC_API_KEY`). No model name
 * is hard-coded anywhere else, so the model can change — including to a
 * self-hosted open-weight one, pending NRC's data-handling answer — without
 * touching the Agent's code.
 */

import "server-only";
import type { MastraModelConfig } from "@mastra/core/llm";

export function clearAgentModelId(): string {
  const id = process.env.CLEAR_AGENT_MODEL?.trim();
  if (!id) throw new Error("CLEAR_AGENT_MODEL is not configured on the server.");
  return id;
}

export function resolveClearAgentModel(): MastraModelConfig {
  return clearAgentModelId();
}
