/**
 * The CLEAR Agent's model, from configuration only.
 *
 * `CLEAR_AGENT_MODEL` is a Mastra model-router string (`provider/model`,
 * e.g. `anthropic/<model>`, which reads `ANTHROPIC_API_KEY`). No model name
 * is hard-coded anywhere else, so the model can change — including to a
 * self-hosted open-weight one, pending NRC's data-handling answer — without
 * touching the Agent's code.
 *
 * `CLEAR_AGENT_MODEL_URL` points the Agent at an OpenAI-compatible endpoint
 * instead (a self-hosted llama.cpp or vLLM server: the base URL up to and
 * including `/v1`). `CLEAR_AGENT_MODEL` is then the id the endpoint is asked
 * for, still `provider/model`, and `CLEAR_AGENT_MODEL_API_KEY` is its bearer
 * key. No provider key (`ANTHROPIC_API_KEY`) is read or needed.
 */

import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { MastraModelConfig } from "@mastra/core/llm";
import { wrapLanguageModel } from "ai";
import { createScriptedModel, SCRIPTED_MODEL_ID } from "~/server/agent/scripted-model";
import { systemFirst } from "~/server/agent/system-first";

/**
 * The self-hosted endpoint's model. Built here, not by Mastra's model router,
 * for two things the router's own OpenAI-compatible client cannot do:
 *
 *  - ask for token usage on a streamed reply (`includeUsage`). Without it
 *    llama.cpp reports none, and every turn is recorded with 0 tokens;
 *  - join every system message into one at the start of the prompt
 *    (see system-first.ts for why).
 */
function endpointModel(id: string, url: string, apiKey: string | undefined): MastraModelConfig {
  const slash = id.indexOf("/");
  const provider = createOpenAICompatible({
    name: id.slice(0, slash),
    baseURL: url,
    ...(apiKey ? { apiKey } : {}),
    includeUsage: true,
    supportsStructuredOutputs: true,
  });
  return wrapLanguageModel({
    model: provider.chatModel(id.slice(slash + 1)),
    middleware: {
      specificationVersion: "v4",
      transformParams: async ({ params }) => ({ ...params, prompt: systemFirst(params.prompt) }),
    },
  }) as MastraModelConfig;
}

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
  const url = process.env.CLEAR_AGENT_MODEL_URL?.trim();
  if (!url) return id;
  if (!/^[^/]+\/.+$/.test(id)) {
    throw new Error("CLEAR_AGENT_MODEL must be `provider/model` when CLEAR_AGENT_MODEL_URL is set.");
  }
  const apiKey = process.env.CLEAR_AGENT_MODEL_API_KEY?.trim();
  return endpointModel(id, url, apiKey);
}
