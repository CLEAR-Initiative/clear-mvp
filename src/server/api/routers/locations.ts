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

interface GqlLocationWithGeometry extends GqlLocationNode {
  pCode: string | null;
  geometry: unknown; // GeoJSON Point | Polygon | MultiPolygon
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

const LOCATIONS_WITH_GEOMETRY_QUERY = `
  query LocationsWithGeometry($level: Int) {
    locations(level: $level) {
      id
      name
      level
      ancestorIds
      parent { id name }
      pCode
      geometry
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

  /**
   * Resolve a country (level 0) by its ISO / humanitarian P-Code, with a
   * name-based fallback. P-Code may be null on many installs, so `pCode`
   * acts as the preferred hint and `name` as the reliable fallback.
   */
  getCountryByPCode: protectedProcedure
    .input(z.object({ pCode: z.string().optional(), name: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ locations: GqlLocationWithGeometry[] }>(
        LOCATIONS_WITH_GEOMETRY_QUERY,
        { level: 0 },
        cookieHeaders(ctx),
      );

      const byPCode = input.pCode
        ? data.locations.find(
            (l) => l.pCode?.toUpperCase() === input.pCode!.toUpperCase(),
          )
        : undefined;
      if (byPCode) return byPCode;

      const byName = input.name
        ? data.locations.find(
            (l) => l.name.toLowerCase() === input.name!.toLowerCase(),
          )
        : undefined;
      return byName ?? null;
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
