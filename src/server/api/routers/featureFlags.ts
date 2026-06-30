import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch } from "~/server/api/graphql";
import { FEATURE_FLAGS, getDefaultFlags } from "~/lib/constants/feature-flags";

interface GqlFeatureFlag {
  key: string;
  enabled: boolean;
}

export const featureFlagsRouter = createTRPCRouter({
  /**
   * Public — the nav has to render for unauthenticated visitors too, so
   * reads stay open. The backend's `featureFlags` query has no auth guard
   * either, so the cookie passthrough is just a convenience for logged-in
   * users; no privileged data is returned.
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    const flags = getDefaultFlags();

    try {
      const data = await graphqlFetch<{ featureFlags: GqlFeatureFlag[] }>(
        `{ featureFlags { key enabled } }`,
        undefined,
        cookieHeaders(ctx),
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

  /**
   * Admin-only. Persists the toggle in clear-api so the change is
   * org-wide and survives logout, browser switches, and storage clears.
   * Returns the new enabled state so the caller can update local state
   * without re-querying.
   */
  toggle: protectedProcedure
    .input(z.object({ key: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can toggle feature flags",
        });
      }
      const data = await graphqlFetch<{ setFeatureFlag: GqlFeatureFlag }>(
        `mutation SetFeatureFlag($key: String!, $enabled: Boolean!) {
          setFeatureFlag(key: $key, enabled: $enabled) { key enabled }
        }`,
        { key: input.key, enabled: input.enabled },
        cookieHeaders(ctx),
      );
      return data.setFeatureFlag;
    }),
});
