import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlAlert, GqlEvent, GqlSignal, GqlCrisis } from "~/lib/types/graphql";
import { sanitizeLocationGeometry } from "~/lib/geo/to-map-point";

const LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry pointType
  parent { id name }
  ancestors { id name level }
`;

// Slim location-fields for *list views*. The events/alerts feed renders
// `location.name` for the card and `location.geometry` for the map
// marker; `geometry` is cheap because the resolver caches per-request
// via a WeakMap. What was expensive was `ancestors { ... }` (recursive
// resolver) and `metadata` (separate sub-query) - dropping those gets
// the list query off the heavy path while keeping map markers visible.
// Detail pages keep using the full LOCATION_FIELDS (they need the
// ancestor/metadata fallback chain).
// `ancestorIds` is a plain array field (not the recursive `ancestors`
// resolver above) and is cheap for the same reason `geometry` is. It's
// required by `clipToRegion()` in the Detection page: a point-level
// signal/event location's own id never equals the selected region id,
// so region filtering falls through to `ancestorIds.includes(regionId)`.
// Without it, every point marker silently disappears once a region
// filter is applied.
const LOCATION_LIST_FIELDS = `
  id name level geometry ancestorIds
`;

const SIGNAL_FIELDS = `
  id
  source { id name type }
  title
  description
  severity
  url
  publishedAt
  collectedAt
  generalLocation { ${LOCATION_FIELDS} }
  originLocation { ${LOCATION_FIELDS} }
  destinationLocation { ${LOCATION_FIELDS} }
`;

// Slim variant for the signals list view (signalsPage). The signals tab
// only reads name from locations and skips collectedAt entirely; the
// full SIGNAL_FIELDS for a 100-row history page kicks off 300 nested
// LOCATION_FIELDS resolutions, each of which fans out into a separate
// PostGIS query + recursive ancestor lookup - the same wedge that
// stalled events / alerts at non-English locales.
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

const EVENT_FIELDS = `
  id
  title
  description
  types
  severity
  isDummy
  rank
  firstSignalCreatedAt
  lastSignalCreatedAt
  populationAffected
  generalLocation { ${LOCATION_FIELDS} }
  originLocation { ${LOCATION_FIELDS} }
  destinationLocation { ${LOCATION_FIELDS} }
  signals { ${SIGNAL_FIELDS} }
  alerts { id status }
`;

// Slim variant for *list views* (eventsPage / alertsPage). The events
// feed only reads `signals.length`, `signals[0].source.name`, and
// `signals.some(s => sources.has(s.source.name))` - fetching the full
// SIGNAL_FIELDS for every signal of every event in a page of 25 events
// triggers thousands of nested location resolutions (each signal has
// general/origin/destination locations, each with a name that, on
// non-English locales, runs through `translationLoader.load("location",
// id)`). That fan-out wedged the response for tens of seconds at
// `locale=ar`. Detail pages and other call sites that *do* render full
// signal cards keep using EVENT_FIELDS.
// Slim signal shape nested inside EVENT_LIST_FIELDS. The events feed
// reads `signals[].source.name` (count + filter), AND the map-marker
// fallback walks `signals[].{general,origin,destination}Location` when
// the event itself has a Polygon (not Point) geometry - so signal
// locations need at minimum geometry + ancestorIds to render markers.
// We deliberately skip name translation work at the signal level by
// keeping the shape minimal: id, name, level, geometry, ancestorIds.
const SIGNAL_NESTED_FOR_EVENT_LIST = `
  id
  source { name }
  generalLocation { id name level geometry ancestorIds }
  originLocation { id name level geometry ancestorIds }
  destinationLocation { id name level geometry ancestorIds }
`;

const EVENT_LIST_FIELDS = `
  id
  title
  description
  types
  severity
  isDummy
  rank
  firstSignalCreatedAt
  lastSignalCreatedAt
  populationAffected
  representativePoint { id name level geometry ancestorIds }
  generalLocation { ${LOCATION_LIST_FIELDS} }
  originLocation { ${LOCATION_LIST_FIELDS} }
  destinationLocation { ${LOCATION_LIST_FIELDS} }
  signals { ${SIGNAL_NESTED_FOR_EVENT_LIST} }
  alerts { id status }
`;

// Map-only event shape (clear-api representativePoint). One Location per
// marker — no nested signal geometries and no admin polygons on the event.
// Detection list views keep EVENT_LIST_FIELDS (they still need signals[]).
const MAP_POINT_LOCATION_FIELDS = `
  id name level geometry ancestorIds
`;

const EVENT_MAP_FIELDS = `
  id
  title
  description
  types
  severity
  isDummy
  rank
  firstSignalCreatedAt
  lastSignalCreatedAt
  populationAffected
  representativePoint { ${MAP_POINT_LOCATION_FIELDS} }
  alerts { id status }
`;

const CRISIS_FIELDS = `
  id
  title
  summary
  severity
  generalLocation { ${LOCATION_FIELDS} }
  events { id types }
`;

const EVENTS_LIST_QUERY = `
  query Events($teamId: String) {
    events(teamId: $teamId) { ${EVENT_FIELDS} }
  }
`;

const CRISES_LIST_QUERY = `
  query Crises {
    crises { ${CRISIS_FIELDS} }
  }
`;

const ALERTS_LIST_QUERY = `
  query Alerts($status: AlertStatus, $teamId: String, $includeDummy: Boolean) {
    alerts(status: $status, teamId: $teamId, includeDummy: $includeDummy) {
      id
      status
      event { ${EVENT_FIELDS} }
    }
  }
`;

const ALERT_GET_QUERY = `
  query Alert($id: String!) {
    alert(id: $id) {
      id
      status
      event { ${EVENT_FIELDS} }
    }
  }
`;

const CREATE_ALERT_MUTATION = `
  mutation CreateAlert($input: CreateAlertInput!) {
    createAlert(input: $input) {
      id
      status
      event { id title types rank }
    }
  }
`;

// ─── Paginated queries (alerts / events / signals) + cross-entity stats ───
// Each *Page query mirrors the shape of the underlying list query but wraps
// the rows in `{ items, totalCount, hasMore }` so the UI can render proper
// pagination + filter chips. `entityStats` is a cross-entity counter that
// honours the same filter shape.

const ALERTS_PAGE_QUERY = `
  query AlertsPage($input: AlertsPageInput) {
    alertsPage(input: $input) {
      totalCount
      hasMore
      items {
        id
        status
        event { ${EVENT_LIST_FIELDS} }
      }
    }
  }
`;

const EVENTS_PAGE_QUERY = `
  query EventsPage($input: EventsPageInput) {
    eventsPage(input: $input) {
      totalCount
      hasMore
      items { ${EVENT_LIST_FIELDS} }
    }
  }
`;

/** Paginated alerts feed for /map — representativePoint only (no signal nest). */
const ALERTS_FOR_MAP_PAGE_QUERY = `
  query AlertsForMapPage($input: AlertsPageInput) {
    alertsPage(input: $input) {
      totalCount
      hasMore
      items {
        id
        status
        representativePoint { ${MAP_POINT_LOCATION_FIELDS} }
        event { ${EVENT_MAP_FIELDS} }
      }
    }
  }
`;

/** Paginated events feed for /map — representativePoint only (no signal nest). */
const EVENTS_FOR_MAP_PAGE_QUERY = `
  query EventsForMapPage($input: EventsPageInput) {
    eventsPage(input: $input) {
      totalCount
      hasMore
      items { ${EVENT_MAP_FIELDS} }
    }
  }
`;

// Overview attention queue: map-slim event + signal geometries for lava-heatmap
// (event + signal points). Skips names/admin polygons Detection still needs.
const OVERVIEW_SIGNAL_POINT_FIELDS = `
  id
  generalLocation { geometry }
  originLocation { geometry }
  destinationLocation { geometry }
`;

const EVENT_OVERVIEW_FIELDS = `
  ${EVENT_MAP_FIELDS}
  signals { ${OVERVIEW_SIGNAL_POINT_FIELDS} }
`;

const EVENTS_FOR_OVERVIEW_PAGE_QUERY = `
  query EventsForOverviewPage($input: EventsPageInput) {
    eventsPage(input: $input) {
      totalCount
      hasMore
      items { ${EVENT_OVERVIEW_FIELDS} }
    }
  }
`;

const ENTITY_STATS_QUERY = `
  query EntityStats($input: EntityStatsInput!) {
    entityStats(input: $input) {
      total
      buckets { key count }
    }
  }
`;

// Shared zod fragments for the filter shape.
const dateLike = z.union([z.date(), z.string()]).optional();
const commonFilter = {
  teamId: z.string().nullish(),
  locationId: z.string().nullish(),
  eventTypes: z.array(z.string()).optional(),
  severityMin: z.number().int().min(1).max(5).optional(),
  severityMax: z.number().int().min(1).max(5).optional(),
  from: dateLike,
  to: dateLike,
  includeDummy: z.boolean().optional(),
};

const ALERT_ORDER = ["CREATED_DESC", "CREATED_ASC", "SEVERITY_DESC", "SEVERITY_ASC"] as const;
const EVENT_ORDER = ["LAST_SIGNAL_DESC", "LAST_SIGNAL_ASC", "CREATED_DESC", "CREATED_ASC", "SEVERITY_DESC", "SEVERITY_ASC"] as const;
const ENTITY_KIND = ["signal", "event", "alert"] as const;
const STATS_GROUP_BY = ["none", "type", "severity", "day", "week", "month"] as const;

interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export const alertsRouter = createTRPCRouter({
  getAlerts: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["draft", "published", "archived"]).optional(),
          activeOnly: z.boolean().optional(),
          teamId: z.string().nullish(),
          includeDummy: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const status =
        input?.activeOnly === true ? "published" : input?.status;
      const data = await graphqlFetch<{ alerts: GqlAlert[] }>(
        ALERTS_LIST_QUERY,
        {
          ...(status ? { status } : {}),
          ...(input?.teamId ? { teamId: input.teamId } : {}),
          includeDummy: input?.includeDummy ?? false,
        },
        cookieHeaders(ctx),
      );
      return { alerts: data.alerts };
    }),

  getAlert: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ alert: GqlAlert | null }>(
        ALERT_GET_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return { alert: data.alert };
    }),

  getStats: protectedProcedure
    .input(z.object({ teamId: z.string().nullish() }).optional())
    .query(async ({ ctx, input }) => {
    const data = await graphqlFetch<{ alerts: GqlAlert[] }>(
      ALERTS_LIST_QUERY,
      input?.teamId ? { teamId: input.teamId } : undefined,
      cookieHeaders(ctx),
    );
    const alerts = data.alerts;
    const published = alerts.filter((a) => a.status === "published");
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recent7 = alerts.filter(
      (a) => new Date(a.event.firstSignalCreatedAt).getTime() > sevenDaysAgo,
    ).length;
    const recent30 = alerts.filter(
      (a) => new Date(a.event.firstSignalCreatedAt).getTime() > thirtyDaysAgo,
    ).length;

    return {
      stats: {
        overview: {
          total_alerts: alerts.length,
          active_alerts: published.length,
          recent_30_days: recent30,
          recent_7_days: recent7,
        },
      },
    };
  }),

  getEvents: protectedProcedure
    .input(z.object({ teamId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ events: GqlEvent[] }>(
        EVENTS_LIST_QUERY,
        { teamId: input.teamId },
        cookieHeaders(ctx),
      );
      return { events: data.events };
    }),

  getCrises: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ crises: GqlCrisis[] }>(
      CRISES_LIST_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    return { crises: data.crises };
  }),

  // ─── Slim map procedures ───────────────────────────────────────────────
  // Paginated *Page queries with date filters + clear-api representativePoint
  // (first-signal Location). No nested signal geometries / admin polygons.
  // sanitizeLocationGeometry remains a safety net if a point is unexpectedly
  // a Polygon.

  alertsForMap: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["draft", "published", "archived"]).optional(),
          activeOnly: z.boolean().optional(),
          teamId: z.string().nullish(),
          locationId: z.string().nullish(),
          includeDummy: z.boolean().optional(),
          from: dateLike,
          to: dateLike,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const status = input?.activeOnly === true ? "published" : input?.status;

      const alerts: GqlAlert[] = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;

      while (hasMore) {
        const data = await graphqlFetch<{ alertsPage: PaginatedResult<GqlAlert> }>(
          ALERTS_FOR_MAP_PAGE_QUERY,
          {
            input: {
              limit,
              offset,
              ...(status ? { status } : {}),
              ...(input?.teamId ? { teamId: input.teamId } : {}),
              ...(input?.locationId ? { locationId: input.locationId } : {}),
              ...(input?.from ? { from: input.from } : {}),
              ...(input?.to ? { to: input.to } : {}),
              includeDummy: input?.includeDummy ?? true,
            },
          },
          cookieHeaders(ctx),
        );

        alerts.push(...data.alertsPage.items);
        hasMore = data.alertsPage.hasMore;
        offset += limit;
      }

      for (const alert of alerts) {
        sanitizeLocationGeometry(alert.representativePoint ?? null);
        sanitizeLocationGeometry(alert.event.representativePoint ?? null);
      }

      return { alerts };
    }),

  eventsForMap: protectedProcedure
    .input(
      z.object({
        teamId: z.string().optional(),
        locationId: z.string().optional(),
        includeDummy: z.boolean().optional(),
        from: dateLike,
        to: dateLike,
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const events: GqlEvent[] = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;

      while (hasMore) {
        const data = await graphqlFetch<{ eventsPage: PaginatedResult<GqlEvent> }>(
          EVENTS_FOR_MAP_PAGE_QUERY,
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

        events.push(...data.eventsPage.items);
        hasMore = data.eventsPage.hasMore;
        offset += limit;
      }

      for (const event of events) {
        sanitizeLocationGeometry(event.representativePoint ?? null);
      }

      return { events };
    }),

  /** Paginated events for Overview situations — representativePoint + signal ids. */
  eventsForOverview: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        orderBy: z.enum(EVENT_ORDER).optional(),
        _v: z.number().int().optional(),
        ...commonFilter,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { _v: _, ...graphqlInput } = input;
      const data = await graphqlFetch<{ eventsPage: PaginatedResult<GqlEvent> }>(
        EVENTS_FOR_OVERVIEW_PAGE_QUERY,
        { input: graphqlInput },
        cookieHeaders(ctx),
      );
      for (const event of data.eventsPage.items) {
        sanitizeLocationGeometry(event.representativePoint ?? null);
      }
      return data.eventsPage;
    }),

  getShockTypes: publicProcedure.query(() => {
    // Shock types are a Django concept - stub for backward compat
    return { shock_types: [] as Array<{ id: number; name: string; icon: string; color: string }> };
  }),

  getDisasterTypes: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ disasterTypes: Array<{ id: string; disasterType: string; disasterClass: string; glideNumber: string; level1: string; level2: string }> }>(
      `query { disasterTypes { id disasterType disasterClass glideNumber level1 level2 } }`,
      undefined,
      cookieHeaders(ctx),
    );
    return data.disasterTypes;
  }),

  getDisasterTypeHierarchy: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{
      disasterTypeHierarchy: Array<{
        name: string;
        groups: Array<{ name: string; codes: string[] }>;
      }>;
    }>(
      `query { disasterTypeHierarchy { name groups { name codes } } }`,
      undefined,
      cookieHeaders(ctx),
    );
    return data.disasterTypeHierarchy;
  }),

  createAlert: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        severity: z.number().min(1).max(5),
        status: z.enum(["draft", "published", "archived"]).optional(),
        eventIds: z.array(z.string()).optional(),
        primaryEventId: z.string().optional(),
        locationIds: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createAlert: GqlAlert }>(
        CREATE_ALERT_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createAlert;
    }),

  promoteToAlert: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createAlert: GqlAlert }>(
        CREATE_ALERT_MUTATION,
        { input: { eventId: input.eventId, status: "published" } },
        cookieHeaders(ctx),
      );
      return data.createAlert;
    }),

  // ─── Paginated feeds ───────────────────────────────────────────────────
  // `_v` is a client-only cache-bust knob: bumping it on the client forces
  // a new React Query cache key without any change to the meaningful inputs.
  // It's declared here so the client can pass it through the typed input
  // without an `as` cast, and stripped out below before the GraphQL call.
  alertsPage: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        orderBy: z.enum(ALERT_ORDER).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        _v: z.number().int().optional(),
        ...commonFilter,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { _v: _, ...graphqlInput } = input;
      const data = await graphqlFetch<{ alertsPage: PaginatedResult<GqlAlert> }>(
        ALERTS_PAGE_QUERY,
        { input: graphqlInput },
        cookieHeaders(ctx),
      );
      return data.alertsPage;
    }),

  eventsPage: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        orderBy: z.enum(EVENT_ORDER).optional(),
        _v: z.number().int().optional(),
        ...commonFilter,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { _v: _, ...graphqlInput } = input;
      const data = await graphqlFetch<{ eventsPage: PaginatedResult<GqlEvent> }>(
        EVENTS_PAGE_QUERY,
        { input: graphqlInput },
        cookieHeaders(ctx),
      );
      return data.eventsPage;
    }),

  // ─── Cross-entity stats ────────────────────────────────────────────────
  entityStats: protectedProcedure
    .input(
      z.object({
        entity: z.enum(ENTITY_KIND),
        groupBy: z.enum(STATS_GROUP_BY).optional(),
        ...commonFilter,
      }),
    )
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        entityStats: { total: number; buckets: { key: string; count: number }[] };
      }>(
        ENTITY_STATS_QUERY,
        { input },
        cookieHeaders(ctx),
      );
      return data.entityStats;
    }),
});
