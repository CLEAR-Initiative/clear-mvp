import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { FEATURE_FLAGS, getDefaultFlags } from "~/lib/constants/feature-flags";
import { djangoFetch, extractCookieHeader, extractCsrfToken } from "~/server/api/django";

interface DjangoFlagsResponse {
  flags: Record<string, boolean>;
}

export const featureFlagsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    let flags: Record<string, boolean>;

    try {
      const res = await djangoFetch<DjangoFlagsResponse>(
        "/feature_flags/api/flags/",
        { headers: extractCookieHeader(ctx.headers) },
      );
      flags = res.flags;
    } catch {
      // Django unreachable — fall back to local defaults
      flags = getDefaultFlags();
    }

    return FEATURE_FLAGS.map((def) => ({
      ...def,
      enabled: flags[def.key] ?? def.defaultEnabled,
    }));
  }),

  toggle: publicProcedure
    .input(
      z.object({
        key: z.string(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await djangoFetch(
        `/feature_flags/api/flags/${input.key}/toggle/`,
        {
          method: "POST",
          headers: {
            ...extractCookieHeader(ctx.headers),
            ...extractCsrfToken(ctx.headers),
          },
          body: JSON.stringify({ enabled: input.enabled }),
        },
      );
      return { key: input.key, enabled: input.enabled };
    }),
});
