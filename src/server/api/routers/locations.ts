import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
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
  population?: string | null;
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

// Tree-only variant. `parent { id name }` fires a separate
// Location.parent findUnique per location through the SSH tunnel
// (~600 round-trips for L0-L2), which triggered Node fetch timeouts
// on signal/event detail batches that include this procedure. The
// tree-building below uses `ancestorIds` not `parent`, so dropping
// the field is invisible to callers.
const LOCATIONS_TREE_QUERY = `
  query Locations($level: Int) {
    locations(level: $level) {
      id
      name
      level
      ancestorIds
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
      population
    }
  }
`;

const LOCATION_BY_ID_QUERY = `
  query LocationById($id: String!) {
    location(id: $id) {
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
  getCountryByPCode: publicProcedure
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

  /** Get a single location by ID, including geometry. */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ location: GqlLocationWithGeometry | null }>(
        LOCATION_BY_ID_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.location;
    }),

  /** Fetch A2 district boundaries with population for the choropleth layer. */
  getPopulationBoundaries: protectedProcedure
    .input(z.object({ countryId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ locations: GqlLocationWithGeometry[] }>(
        LOCATIONS_WITH_GEOMETRY_QUERY,
        { level: 2 },
        cookieHeaders(ctx),
      );
      const all = data.locations;
      return input.countryId
        ? all.filter((l) => l.ancestorIds.includes(input.countryId!))
        : all;
    }),

  /**
   * Fetch admin boundary polygons for a given hierarchy level (1 = states, 2 = districts).
   * Optionally scoped to a country by its location ID.
   */
  getAdminBoundaries: protectedProcedure
    .input(z.object({ level: z.number(), countryId: z.string().optional(), stateId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ locations: GqlLocationWithGeometry[] }>(
        LOCATIONS_WITH_GEOMETRY_QUERY,
        { level: input.level },
        cookieHeaders(ctx),
      );
      if (input.stateId) {
        return data.locations.filter((l) => l.ancestorIds.includes(input.stateId!));
      }
      if (input.countryId) {
        return data.locations.filter((l) => l.ancestorIds.includes(input.countryId!));
      }
      return data.locations;
    }),

  /** Get hierarchical location tree: countries → states → districts.
   *
   * Fetches only L0/L1/L2 in three parallel queries - the previous
   * implementation called `locations(level: null)` which returned every
   * level (2300+ rows, vs the ~640 actually used here), and every
   * returned row's `name` triggered a translation-loader lookup on
   * non-English locales. That pushed the procedure to 18+ seconds on
   * /detection load, and combined with the lazy-enqueue fan-out for
   * untranslated landmark points (L3/L4), eventually wedged the API. */
  tree: protectedProcedure.query(async ({ ctx }) => {
    const [countriesData, statesData, districtsData] = await Promise.all([
      graphqlFetch<{ locations: GqlLocationNode[] }>(
        LOCATIONS_TREE_QUERY,
        { level: 0 },
        cookieHeaders(ctx),
      ),
      graphqlFetch<{ locations: GqlLocationNode[] }>(
        LOCATIONS_TREE_QUERY,
        { level: 1 },
        cookieHeaders(ctx),
      ),
      graphqlFetch<{ locations: GqlLocationNode[] }>(
        LOCATIONS_TREE_QUERY,
        { level: 2 },
        cookieHeaders(ctx),
      ),
    ]);

    const countries = countriesData.locations;
    const states = statesData.locations;
    const districts = districtsData.locations;

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
