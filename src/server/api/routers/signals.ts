import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlSignal, GqlSignalDetail } from "~/lib/types/graphql";
import { sanitizeLocationGeometry } from "~/lib/geo/to-map-point";

const LOCATION_FIELDS = `id name level geoId ancestorIds geometry pointType parent { id name } ancestors { id name level }`;

// Slim location fields for map views — drops the recursive ancestors
// resolver and metadata, keeping only what map markers need.
const LOCATION_LIST_FIELDS = `id name level geometry ancestorIds`;

const SOURCE_FIELDS = `id name type baseUrl infoUrl`;

const SIGNAL_LIST_QUERY = `
  query Signals($teamId: String, $includeDummy: Boolean) {
    signals(teamId: $teamId, includeDummy: $includeDummy) {
      id
      source { ${SOURCE_FIELDS} }
      title
      description
      severity
      url
      publishedAt
      collectedAt
      generalLocation { ${LOCATION_FIELDS} }
      originLocation { ${LOCATION_FIELDS} }
      destinationLocation { ${LOCATION_FIELDS} }
      events { id }
    }
  }
`;

// Slim variant for map — drops recursive ancestor chains and metadata
// lookups. The map only needs geometry + ancestorIds for marker paint
// and hierarchy filtering; the heavyweight detail fields are unused.
const SIGNALS_FOR_MAP_QUERY = `
  query SignalsForMap($teamId: String, $includeDummy: Boolean) {
    signals(teamId: $teamId, includeDummy: $includeDummy) {
      id
      source { ${SOURCE_FIELDS} }
      title
      description
      severity
      url
      publishedAt
      generalLocation { ${LOCATION_LIST_FIELDS} }
      originLocation { ${LOCATION_LIST_FIELDS} }
      destinationLocation { ${LOCATION_LIST_FIELDS} }
      events { id }
    }
  }
`;

// Slim signal fields for paginated list views (signalsPage)
const SIGNAL_LIST_FIELDS = `
  id
  source { id name type }
  title
  description
  severity
  url
  publishedAt
  generalLocation { ${LOCATION_LIST_FIELDS} }
  originLocation { ${LOCATION_LIST_FIELDS} }
  destinationLocation { ${LOCATION_LIST_FIELDS} }
`;

// signal-detail-content reads `ev.signals` for the "related signals"
// list and source counts. The nested `signals { ... }` shape stays
// slim — id/title/description/publishedAt/source only, no locations,
// no severity, no media. clear-api's Event.signals resolver also caps
// returned signals at 50 (most recent first), so a signal whose
// related events have hundreds of siblings doesn't explode the
// payload.
const SIGNAL_GET_QUERY = `
  query Signal($id: String!) {
    signal(id: $id) {
      id
      source { ${SOURCE_FIELDS} }
      title
      description
      severity
      url
      publishedAt
      collectedAt
      media
      generalLocation { ${LOCATION_FIELDS} }
      originLocation { ${LOCATION_FIELDS} }
      destinationLocation { ${LOCATION_FIELDS} }
      events {
        id
        title
        types
        rank
        severity
        firstSignalCreatedAt
        signals {
          id
          title
          description
          publishedAt
          source { id name type }
        }
      }
    }
  }
`;

const DATA_SOURCES_QUERY = `
  query DataSources {
    dataSources { id name type isActive }
  }
`;

const CREATE_SIGNAL_MUTATION = `
  mutation CreateSignal($input: CreateSignalInput!) {
    createSignal(input: $input) {
      id
      source { id name type }
      title
      description
      severity
      media
      events { id }
    }
  }
`;

const CREATE_MANUAL_SIGNAL_MUTATION = `
  mutation CreateManualSignal($input: CreateManualSignalInput!) {
    createManualSignal(input: $input) {
      id
      source { id name type }
      title
      description
      severity
      media
      events { id }
    }
  }
`;

// Paginated query for signals list view (moved from alerts.ts for proper architecture)
const SIGNALS_PAGE_QUERY = `
  query SignalsPage($input: SignalsPageInput) {
    signalsPage(input: $input) {
      totalCount
      hasMore
      items { ${SIGNAL_LIST_FIELDS} }
    }
  }
`;

// Constants for pagination and ordering
const SIGNAL_ORDER = ["PUBLISHED_DESC", "PUBLISHED_ASC", "SEVERITY_DESC", "SEVERITY_ASC"] as const;
const dateLike = z.union([z.date(), z.string()]).optional();

interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export const signalsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ teamId: z.string().nullish(), includeDummy: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ signals: GqlSignal[] }>(
        SIGNAL_LIST_QUERY,
        {
          ...(input?.teamId ? { teamId: input.teamId } : {}),
          includeDummy: input?.includeDummy ?? false,
        },
        cookieHeaders(ctx),
      );
      return data.signals;
    }),

  /** 
   * Slim variant for map rendering with server-side date/location filtering
   * and geometry sanitization. Uses signalsPage pagination internally, then
   * strips polygon geometries to centroid points before returning.
   */
  forMap: protectedProcedure
    .input(
      z.object({
        teamId: z.string().nullish(),
        locationId: z.string().nullish(),
        includeDummy: z.boolean().optional(),
        from: dateLike,
        to: dateLike,
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      // Paginate through all results using signalsPage (server-side filtering)
      const signals: GqlSignal[] = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;

      while (hasMore) {
        const data = await graphqlFetch<{ signalsPage: PaginatedResult<GqlSignal> }>(
          SIGNALS_PAGE_QUERY,
          {
            input: {
              limit,
              offset,
              ...(input?.teamId ? { teamId: input.teamId } : {}),
              ...(input?.locationId ? { locationId: input.locationId } : {}),
              ...(input?.from ? { from: input.from } : {}),
              ...(input?.to ? { to: input.to } : {}),
              includeDummy: input?.includeDummy ?? true,
            },
          },
          cookieHeaders(ctx),
        );

        signals.push(...data.signalsPage.items);
        hasMore = data.signalsPage.hasMore;
        offset += limit;
      }

      // Sanitize geometries: replace Polygon/MultiPolygon with centroid Points
      for (const signal of signals) {
        sanitizeLocationGeometry(signal.generalLocation);
        sanitizeLocationGeometry(signal.originLocation);
        sanitizeLocationGeometry(signal.destinationLocation);
      }

      return signals;
    }),

  /** Paginated feed for signals list view (Detection page, etc.) */
  signalsPage: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        orderBy: z.enum(SIGNAL_ORDER).optional(),
        teamId: z.string().nullish(),
        locationId: z.string().nullish(),
        sourceNames: z.array(z.string()).optional(),
        severityMin: z.number().int().min(1).max(5).optional(),
        severityMax: z.number().int().min(1).max(5).optional(),
        from: dateLike,
        to: dateLike,
        includeDummy: z.boolean().optional(),
        _v: z.number().int().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { _v: _, ...graphqlInput } = input;
      const data = await graphqlFetch<{ signalsPage: PaginatedResult<GqlSignal> }>(
        SIGNALS_PAGE_QUERY,
        { input: graphqlInput },
        cookieHeaders(ctx),
      );
      return data.signalsPage;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Force English on the signal detail query — translation work
      // through the SSH tunnel was wedging the page (multi-minute
      // load + Node fetch timeouts). Product decision: signal detail
      // renders canonical English for everyone regardless of locale.
      // The `x-force-locale` header is read by clear-api's
      // resolveLocale and overrides the cookie / user.language chain.
      const data = await graphqlFetch<{ signal: GqlSignalDetail | null }>(
        SIGNAL_GET_QUERY,
        { id: input.id },
        { ...cookieHeaders(ctx), "x-force-locale": "en" },
      );
      return data.signal;
    }),

  sources: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ dataSources: { id: string; name: string; type: string; isActive: boolean }[] }>(
      DATA_SOURCES_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    const MANUAL_SOURCE_NAMES = new Set(["field_officer", "partner", "government"]);
    return data.dataSources.filter((s) => MANUAL_SOURCE_NAMES.has(s.name));
  }),

  /** Pipeline-facing signal creation (used internally, not from UI) */
  create: protectedProcedure
    .input(
      z.object({
        sourceId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        severity: z.number().optional(),
        publishedAt: z.string().optional(),
        collectedAt: z.string().optional(),
        locationId: z.string().optional(),
        originId: z.string().optional(),
        destinationId: z.string().optional(),
        media: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const gqlInput = {
        ...input,
        publishedAt: input.publishedAt ?? new Date().toISOString(),
        rawData: { title: input.title, description: input.description },
      };
      const data = await graphqlFetch<{ createSignal: GqlSignal }>(
        CREATE_SIGNAL_MUTATION,
        { input: gqlInput },
        cookieHeaders(ctx),
      );
      return data.createSignal;
    }),

  /** Manual signal creation from UI - triggers pipeline processing + auto-escalation */
  createManual: protectedProcedure
    .input(
      z.object({
        sourceId: z.string(),
        title: z.string().min(1),
        description: z.string().min(1),
        severity: z.number().min(1).max(5).optional(),
        url: z.string().optional(),
        /** Media URLs (pre-uploaded via /api/proxy/upload) */
        mediaUrls: z.array(z.string()).optional(),
        locationId: z.string().optional(),
        originId: z.string().optional(),
        destinationId: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        /**
         * Team the signal is being filed under. Purely an authorisation
         * hint — the backend uses it to admit team_admin / field_coordinator
         * callers without a global admin/analyst role. Ignored (harmlessly)
         * for platform callers, so the UI can always send it.
         */
        teamId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createManualSignal: GqlSignal }>(
        CREATE_MANUAL_SIGNAL_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createManualSignal;
    }),
});
