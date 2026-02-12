import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch, LLM_TIMEOUT_MS } from "~/server/api/django";
import type {
  LLMQueryResponse,
  LLMProvidersResponse,
} from "~/lib/types/django";
import { FALLBACK_LLM_PROVIDERS } from "~/lib/fallback-data";

export const llmRouter = createTRPCRouter({
  query: publicProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        system: z.string().optional(),
        provider: z.string().optional(),
        model: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().optional(),
        cache: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return djangoFetch<LLMQueryResponse>("/llm/api/query/", {
        method: "POST",
        timeoutMs: LLM_TIMEOUT_MS,
        body: JSON.stringify({
          prompt: input.prompt,
          system: input.system,
          provider: input.provider,
          model: input.model,
          temperature: input.temperature,
          max_tokens: input.maxTokens,
          cache: input.cache,
          stream: false,
        }),
      });
    }),

  getProviderStatus: publicProcedure.query(async () => {
    try {
      return await djangoFetch<LLMProvidersResponse>(
        "/llm/api/providers/status/",
      );
    } catch {
      return FALLBACK_LLM_PROVIDERS;
    }
  }),
});
