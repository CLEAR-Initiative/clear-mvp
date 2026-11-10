import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import { isGraphqlSchemaUnavailable } from "~/server/api/graphql-schema-unavailable";
import { toTrpcError } from "~/server/api/routers/tasks";
import type { GqlPlaceNameSuggestion, GqlUnresolvedPlaceName } from "~/lib/types/graphql";
import { PLACE_NAME_RESOLUTION_KINDS } from "~/lib/place-names";

/**
 * The unresolved place-name queue (clear-api ADR-0019): place names that
 * geocoding could not place inside a Signal's area. clear-api decides who
 * reads and who resolves (platform admins; team admins inside their team's
 * area); this router only shapes the calls.
 */

/** clear-api's page maximum for the queue. */
const QUEUE_MAX = 200;

const QUEUE_QUERY = `
  query UnresolvedPlaceNames($first: Int) {
    unresolvedPlaceNames(status: OPEN, first: $first) {
      totalCount
      items {
        id
        nameNorm
        nameAsWritten
        nameAr
        countryCode
        stateLocationId
        countryLocationId
        stateLocation { id name level }
        status
        signalCount
        firstSeenAt
        lastSeenAt
        signals(first: 5) {
          signalId
          nameAsWritten
          reason
          seenAt
          relocatedAt
          areaLocation { id name level }
          signal { id title description publishedAt }
        }
      }
    }
  }
`;

const QUEUE_COUNT_QUERY = `
  query UnresolvedPlaceNamesCount {
    unresolvedPlaceNames(status: OPEN, first: 1) { totalCount }
  }
`;

const SUGGESTIONS_QUERY = `
  query PlaceNameSuggestions($name: String!, $nameAr: String, $countryCode: String!, $withinLocationId: String) {
    placeNameSuggestions(name: $name, nameAr: $nameAr, countryCode: $countryCode, withinLocationId: $withinLocationId) {
      kind
      geonamesId
      locationId
      name
      level
      featureClass
      featureCode
      latitude
      longitude
      score
      insideArea
      distanceKm
    }
  }
`;

const RESOLVE_MUTATION = `
  mutation ResolveUnresolvedPlaceName($id: String!, $resolution: UnresolvedPlaceNameResolutionInput!, $note: String) {
    resolveUnresolvedPlaceName(id: $id, resolution: $resolution, note: $note) {
      id
      status
      signalsMoved
    }
  }
`;

const resolutionInput = z
  .object({
    kind: z.enum(PLACE_NAME_RESOLUTION_KINDS),
    locationId: z.string().min(1).optional(),
    geonamesId: z.number().int().optional(),
    point: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        name: z.string().trim().max(500).optional(),
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    // Each kind takes exactly its own field, as clear-api requires.
    const needs = { LOCATION: "locationId", GEONAMES: "geonamesId", POINT: "point" } as const;
    const need = val.kind in needs ? needs[val.kind as keyof typeof needs] : null;
    for (const field of ["locationId", "geonamesId", "point"] as const) {
      const given = val[field] != null;
      if (field === need && !given) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${val.kind} needs ${field}`, path: [field] });
      if (field !== need && given) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${val.kind} does not take ${field}`, path: [field] });
    }
  });

export const placeNamesRouter = createTRPCRouter({
  /** Open rows the reader may resolve, the ones most Signals name first. */
  queue: protectedProcedure.query(async ({ ctx }): Promise<{ items: GqlUnresolvedPlaceName[]; totalCount: number }> => {
    try {
      const data = await graphqlFetch<{
        unresolvedPlaceNames: { items: GqlUnresolvedPlaceName[]; totalCount: number };
      }>(QUEUE_QUERY, { first: QUEUE_MAX }, cookieHeaders(ctx));
      return { items: data.unresolvedPlaceNames?.items ?? [], totalCount: data.unresolvedPlaceNames?.totalCount ?? 0 };
    } catch (err) {
      if (isGraphqlSchemaUnavailable(err)) return { items: [], totalCount: 0 };
      toTrpcError(err);
    }
  }),

  /** How many open rows wait for the reader, for the nav badge. */
  queueCount: protectedProcedure.query(async ({ ctx }): Promise<{ count: number }> => {
    try {
      const data = await graphqlFetch<{ unresolvedPlaceNames: { totalCount: number } }>(
        QUEUE_COUNT_QUERY,
        {},
        cookieHeaders(ctx),
      );
      return { count: data.unresolvedPlaceNames?.totalCount ?? 0 };
    } catch (err) {
      if (isGraphqlSchemaUnavailable(err)) return { count: 0 };
      toTrpcError(err);
    }
  }),

  /** Places a queued name can mean: GeoNames candidates and CLEAR districts
   * or landmarks, those inside the area first. Optional help for the decider. */
  suggestions: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(500),
        nameAr: z.string().trim().max(500).optional(),
        countryCode: z.string().trim().length(2),
        withinLocationId: z.string().min(1).optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<GqlPlaceNameSuggestion[]> => {
      try {
        const data = await graphqlFetch<{ placeNameSuggestions: GqlPlaceNameSuggestion[] }>(
          SUGGESTIONS_QUERY,
          { ...input, nameAr: input.nameAr || undefined },
          cookieHeaders(ctx),
        );
        return data.placeNameSuggestions ?? [];
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return [];
        toTrpcError(err);
      }
    }),

  /** Resolve a row. A location answer writes a place alias and moves the
   * waiting Signals; clear-api checks the decider and the place, and its
   * error comes back with its code (FORBIDDEN, BAD_REQUEST, CONFLICT,
   * NOT_FOUND). */
  resolve: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        resolution: resolutionInput,
        note: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<{ id: string; status: string; signalsMoved: number }> => {
      const { kind, locationId, geonamesId, point } = input.resolution;
      try {
        const data = await graphqlFetch<{
          resolveUnresolvedPlaceName: { id: string; status: string; signalsMoved: number };
        }>(
          RESOLVE_MUTATION,
          {
            id: input.id,
            resolution: {
              kind,
              locationId,
              geonamesId,
              point: point ? { ...point, name: point.name || undefined } : undefined,
            },
            note: input.note || undefined,
          },
          cookieHeaders(ctx),
        );
        return data.resolveUnresolvedPlaceName;
      } catch (err) {
        toTrpcError(err);
      }
    }),
});
