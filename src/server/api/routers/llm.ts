import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
    .mutation(async () => {
      return {
        response: "LLM service is being migrated.",
        provider: "stub",
        model: "stub",
      };
    }),

  getProviderStatus: publicProcedure.query(async () => {
    return { providers: [] };
  }),
});
