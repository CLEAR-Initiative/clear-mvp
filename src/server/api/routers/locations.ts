import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";

interface GqlLocationNode {
  id: string;
  name: string;
  level: number;
  ancestorIds: string[];
  parent: { id: string; name: string } | null;
}

const LOCATIONS_QUERY = `
  query Locations($level: Int) {
    locations(level: $level) {
      id
      name
      level
      ancestorIds
      parent { id name }
    }
  }
`;

export const locationsRouter = createTRPCRouter({
  /** Fetch all locations, optionally filtered by level */
  list: protectedProcedure
    .input(z.object({ level: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ locations: GqlLocationNode[] }>(
        LOCATIONS_QUERY,
        input?.level != null ? { level: input.level } : undefined,
        cookieHeaders(ctx),
      );
      return data.locations;
    }),

  /** Get hierarchical location tree: countries → states → districts */
  tree: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ locations: GqlLocationNode[] }>(
      LOCATIONS_QUERY,
      undefined,
      cookieHeaders(ctx),
    );

    const all = data.locations;
    const countries = all.filter((l) => l.level === 0);
    const states = all.filter((l) => l.level === 1);
    const districts = all.filter((l) => l.level === 2);

    return countries.map((country) => ({
      ...country,
      states: states
        .filter((s) => s.ancestorIds.includes(country.id))
        .map((state) => ({
          ...state,
          districts: districts.filter((d) => d.ancestorIds.includes(state.id)),
        })),
    }));
  }),
});
