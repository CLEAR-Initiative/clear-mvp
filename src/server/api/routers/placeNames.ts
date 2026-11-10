import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import { isGraphqlSchemaUnavailable } from "~/server/api/graphql-schema-unavailable";
import { toTrpcError } from "~/server/api/routers/tasks";
import type {
  GqlPlaceAlias,
  GqlPlaceNameSuggestion,
  GqlUnresolvedPlaceName,
  PlaceAliasCountry,
} from "~/lib/types/graphql";
import { PLACE_ALIAS_SOURCES, PLACE_NAME_RESOLUTION_KINDS, aliasCountries } from "~/lib/place-names";

/**
 * The unresolved place-name queue (clear-api ADR-0019): place names that
 * geocoding could not place inside a Signal's area. clear-api decides who
 * reads and who resolves (platform admins; team admins inside their team's
 * area); this router only shapes the calls.
 */

/** clear-api's page maximum for the queue. */
const QUEUE_PAGE_MAX = 200;
/** Pages read at most: 2000 names. Beyond that the list says it is cut. */
const QUEUE_PAGE_READS_MAX = 10;

const QUEUE_QUERY = `
  query UnresolvedPlaceNames($first: Int, $offset: Int) {
    unresolvedPlaceNames(status: OPEN, first: $first, offset: $offset) {
      totalCount
      hasMore
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

const ALIAS_FIELDS = `
  id
  nameNorm
  nameDisplay
  countryCode
  scopeLocationId
  scopeLocation { id name }
  locationId
  location { id name level ancestors { id name level } }
  source
  createdByName
  createdAt
  note
  canEdit
`;

/** Aliases per "Load more" page. */
export const ALIAS_PAGE_SIZE = 50;

const ALIASES_QUERY = `
  query PlaceAliases($search: String, $source: PlaceAliasSource, $first: Int, $after: String) {
    placeAliases(search: $search, source: $source, first: $first, after: $after) {
      totalCount
      hasMore
      endCursor
      items { ${ALIAS_FIELDS} }
    }
  }
`;

// The countries the pipeline covers (with their ISO-2 code), and the level-0
// and level-1 locations to match them to: an alias needs a country code, and
// a country location does not always carry one.
const ALIAS_SCOPES_QUERY = `
  query PlaceAliasScopes {
    pipelineCountries { name pcode }
    countries: locations(level: 0) { id name pCode }
    states: locations(level: 1) { id name parent { id } }
  }
`;

const CREATE_ALIAS_MUTATION = `
  mutation CreatePlaceAlias($input: CreatePlaceAliasInput!) {
    createPlaceAlias(input: $input) { ${ALIAS_FIELDS} }
  }
`;

const UPDATE_ALIAS_MUTATION = `
  mutation UpdatePlaceAlias($id: String!, $input: UpdatePlaceAliasInput!) {
    updatePlaceAlias(id: $id, input: $input) { ${ALIAS_FIELDS} }
  }
`;

const DELETE_ALIAS_MUTATION = `
  mutation DeletePlaceAlias($id: String!) {
    deletePlaceAlias(id: $id)
  }
`;

const pointInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  name: z.string().trim().max(500).optional(),
});

/** A target is an existing location or a point, never both. */
const oneTarget = (val: { locationId?: string; point?: unknown }) => !(val.locationId != null && val.point != null);

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
  /** Open rows the reader may resolve, the ones most Signals name first.
   * Every page is read (clear-api gives 200 a page), so search and the list
   * reach a name below the first page. `totalCount` is clear-api's count:
   * larger than `items` only past the read limit, and the Inbox then says
   * the list is cut. */
  queue: protectedProcedure.query(async ({ ctx }): Promise<{ items: GqlUnresolvedPlaceName[]; totalCount: number }> => {
    try {
      const items: GqlUnresolvedPlaceName[] = [];
      // A row recorded mid-read shifts the pages, so one can come back twice.
      const seen = new Set<string>();
      let totalCount = 0;
      for (let read = 0; read < QUEUE_PAGE_READS_MAX; read++) {
        const data = await graphqlFetch<{
          unresolvedPlaceNames: { items: GqlUnresolvedPlaceName[]; totalCount: number; hasMore: boolean };
        }>(QUEUE_QUERY, { first: QUEUE_PAGE_MAX, offset: read * QUEUE_PAGE_MAX }, cookieHeaders(ctx));
        const page = data.unresolvedPlaceNames;
        totalCount = page?.totalCount ?? 0;
        for (const row of page?.items ?? []) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            items.push(row);
          }
        }
        if (!page?.hasMore || (page.items ?? []).length === 0) break;
      }
      return { items, totalCount: Math.max(totalCount, items.length) };
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

  /** The alias list, newest first, a page at a time. `cursor` is clear-api's
   * `endCursor`, for infinite queries. Every decider reads every alias;
   * `canEdit` says which ones the reader may change. */
  aliases: protectedProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(500).optional(),
          source: z.enum(PLACE_ALIAS_SOURCES).optional(),
          cursor: z.string().min(1).nullish(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<{ items: GqlPlaceAlias[]; totalCount: number; nextCursor: string | null }> => {
      try {
        const data = await graphqlFetch<{
          placeAliases: { items: GqlPlaceAlias[]; totalCount: number; hasMore: boolean; endCursor: string | null };
        }>(
          ALIASES_QUERY,
          {
            search: input?.search || undefined,
            source: input?.source,
            first: ALIAS_PAGE_SIZE,
            after: input?.cursor ?? undefined,
          },
          cookieHeaders(ctx),
        );
        const page = data.placeAliases;
        return {
          items: page?.items ?? [],
          totalCount: page?.totalCount ?? 0,
          nextCursor: page?.hasMore ? (page.endCursor ?? null) : null,
        };
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return { items: [], totalCount: 0, nextCursor: null };
        toTrpcError(err);
      }
    }),

  /** The countries an alias can belong to and the states it can be scoped
   * to, for the Add alias form. */
  aliasScopes: protectedProcedure.query(async ({ ctx }): Promise<PlaceAliasCountry[]> => {
    try {
      const data = await graphqlFetch<Parameters<typeof aliasCountries>[0]>(ALIAS_SCOPES_QUERY, {}, cookieHeaders(ctx));
      return aliasCountries(data);
    } catch (err) {
      if (isGraphqlSchemaUnavailable(err)) return [];
      toTrpcError(err);
    }
  }),

  /** Add an alias by hand. clear-api checks the decider, the scope and the
   * target, and closes the open queue rows the alias answers. Its error
   * comes back with its code (FORBIDDEN, BAD_REQUEST, CONFLICT). */
  createAlias: protectedProcedure
    .input(
      z
        .object({
          name: z.string().trim().min(1).max(500),
          nameAr: z.string().trim().max(500).optional(),
          countryCode: z.string().trim().length(2),
          /** Null: the whole country. */
          scopeLocationId: z.string().min(1).nullable(),
          locationId: z.string().min(1).optional(),
          point: pointInput.optional(),
          note: z.string().trim().max(2000).optional(),
        })
        .refine((val) => (val.locationId != null) !== (val.point != null), {
          message: "Give the target as locationId or as point, not both",
          path: ["locationId"],
        }),
    )
    .mutation(async ({ ctx, input }): Promise<GqlPlaceAlias> => {
      try {
        const data = await graphqlFetch<{ createPlaceAlias: GqlPlaceAlias }>(
          CREATE_ALIAS_MUTATION,
          {
            input: {
              ...input,
              nameAr: input.nameAr || undefined,
              note: input.note || undefined,
              point: input.point ? { ...input.point, name: input.point.name || undefined } : undefined,
            },
          },
          cookieHeaders(ctx),
        );
        return data.createPlaceAlias;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** Change an alias's target, scope or note. A field left out stays as it
   * is; `scopeLocationId: null` means the whole country. */
  updateAlias: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        change: z
          .object({
            scopeLocationId: z.string().min(1).nullable().optional(),
            locationId: z.string().min(1).optional(),
            point: pointInput.optional(),
            note: z.string().trim().max(2000).nullable().optional(),
          })
          .refine(oneTarget, { message: "Give the target as locationId or as point, not both", path: ["locationId"] })
          .refine((val) => Object.values(val).some((v) => v !== undefined), { message: "Nothing to change" }),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<GqlPlaceAlias> => {
      const { scopeLocationId, locationId, point, note } = input.change;
      // Only the fields the reader changed are sent: clear-api reads a field
      // that is present, even as null, as a change.
      const change: Record<string, unknown> = {};
      if (scopeLocationId !== undefined) change.scopeLocationId = scopeLocationId;
      if (locationId !== undefined) change.locationId = locationId;
      if (point !== undefined) change.point = { ...point, name: point.name || undefined };
      if (note !== undefined) change.note = note || null;
      try {
        const data = await graphqlFetch<{ updatePlaceAlias: GqlPlaceAlias }>(
          UPDATE_ALIAS_MUTATION,
          { id: input.id, input: change },
          cookieHeaders(ctx),
        );
        return data.updatePlaceAlias;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** Delete an alias. Signals it moved stay where they are; the queue row
   * it came from opens again. */
  deleteAlias: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }): Promise<{ deleted: boolean }> => {
      try {
        const data = await graphqlFetch<{ deletePlaceAlias: boolean }>(
          DELETE_ALIAS_MUTATION,
          { id: input.id },
          cookieHeaders(ctx),
        );
        return { deleted: !!data.deletePlaceAlias };
      } catch (err) {
        toTrpcError(err);
      }
    }),
});
