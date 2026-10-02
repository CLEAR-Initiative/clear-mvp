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
import { createScriptedModel, SCRIPTED_MODEL_ID } from "~/server/agent/scripted-model";

export function clearAgentModelId(): string {
  const id = process.env.CLEAR_AGENT_MODEL?.trim();
  if (!id) throw new Error("CLEAR_AGENT_MODEL is not configured on the server.");
  return id;
}

export function resolveClearAgentModel(): MastraModelConfig {
  const id = clearAgentModelId();
  if (id === SCRIPTED_MODEL_ID) {
    if (process.env.NODE_ENV === "production" && process.env.CLEAR_AGENT_ALLOW_SCRIPTED_MODEL !== "1") {
      throw new Error(`${SCRIPTED_MODEL_ID} is for tests; set a real CLEAR_AGENT_MODEL.`);
    }
    return createScriptedModel() as unknown as MastraModelConfig;
  }
  return id;
}
