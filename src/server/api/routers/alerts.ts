import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlAlert, GqlEvent, GqlSignal, GqlCrisis } from "~/lib/types/graphql";

const LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry pointType
  ancestors { id name level }
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
        event { ${EVENT_FIELDS} }
      }
    }
  }
`;

const EVENTS_PAGE_QUERY = `
  query EventsPage($input: EventsPageInput) {
    eventsPage(input: $input) {
      totalCount
      hasMore
      items { ${EVENT_FIELDS} }
    }
  }
`;

const SIGNALS_PAGE_QUERY = `
  query SignalsPage($input: SignalsPageInput) {
    signalsPage(input: $input) {
      totalCount
      hasMore
      items { ${SIGNAL_FIELDS} }
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
const SIGNAL_ORDER = ["PUBLISHED_DESC", "PUBLISHED_ASC", "SEVERITY_DESC", "SEVERITY_ASC"] as const;
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

  signalsPage: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).optional(),
        offset: z.number().int().min(0).optional(),
        orderBy: z.enum(SIGNAL_ORDER).optional(),
        // Signals filter shape mirrors commonFilter except `eventTypes` is
        // replaced by `sourceNames` (signals don't carry the type array).
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
