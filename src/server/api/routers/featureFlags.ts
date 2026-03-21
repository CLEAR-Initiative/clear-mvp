import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";
import { FEATURE_FLAGS, getDefaultFlags } from "~/lib/constants/feature-flags";
import { GRAPHQL_API_KEY } from "~/server/env";

interface GqlFeatureFlag {
  key: string;
  enabled: boolean;
}

export const featureFlagsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    const flags = getDefaultFlags();

    try {
      const data = await graphqlFetch<{ featureFlags: GqlFeatureFlag[] }>(
        `{ featureFlags { key enabled } }`,
        undefined,
        { "x-api-key": GRAPHQL_API_KEY },
      );
      for (const f of data.featureFlags) {
        flags[f.key] = f.enabled;
      }
    } catch {
      // GraphQL unreachable — local defaults already set above
    }

    return FEATURE_FLAGS.map((def) => ({
      ...def,
      enabled: flags[def.key] ?? def.defaultEnabled,
    }));
  }),

  toggle: publicProcedure
    .input(z.object({ key: z.string(), enabled: z.boolean() }))
    .mutation(({ input }) => {
      // No toggle mutation on the GraphQL backend yet — optimistic UI only
      return { key: input.key, enabled: input.enabled };
    }),
});
