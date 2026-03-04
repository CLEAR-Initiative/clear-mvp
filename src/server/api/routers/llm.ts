import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  djangoFetch,
  extractCookieHeader,
  LLM_TIMEOUT_MS,
} from "~/server/api/django";
import type {
  LLMQueryResponse,
  LLMProvidersResponse,
} from "~/lib/types/django";

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
    .mutation(async ({ ctx, input }) => {
      return djangoFetch<LLMQueryResponse>("/llm/api/query/", {
        method: "POST",
        timeoutMs: LLM_TIMEOUT_MS,
        headers: extractCookieHeader(ctx.headers),
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

  getProviderStatus: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch<LLMProvidersResponse>(
      "/llm/api/providers/status/",
      { headers: extractCookieHeader(ctx.headers) },
    );
  }),
});
