import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";
import {
  eventMatchesSearch,
  rankEventsForCrisis,
  scoreEventAgainstCrisis,
  buildCrisisRecommendContext,
} from "~/lib/crisis/recommend-events";

/** Shape returned by the backend `crisis` query. */
export interface GqlCrisis {
  id: string;
  title: string | null;
  summary: string | null;
  severity: number;
  generalLocation: GqlLocation | null;
  /** Free-form JSON, expected to match ClusterNeed[] when set by CLEAR. */
  needs: unknown;
  /** Free-form JSON, expected to match ScenarioPlan[] when set by CLEAR. */
  scenarios: unknown;
  /** BigInt serialised as string; null when unset. */
  populationAffected: string | null;
  populationInArea: string | null;
  /** Presigned S3 URLs generated at query time from stored S3 keys. */
  attachments: string[];
  events: GqlEvent[];
}

/** Tiny row for the Add-to-Crisis menu — ids + title only. */
export interface GqlCrisisMenuItem {
  id: string;
  title: string | null;
  events: { id: string }[];
}

const LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry population
  parent { id name }
  metadata { type data }
  ancestors { id name level population metadata { type data } }
`;

// Slim location shape for nested contexts (signal locations, event
// locations inside a crisis, locations on the crisis-list view). Drops
// the recursive ancestors+metadata walk because that's what was making
// the payload blow past the SSH tunnel's effective throughput on the
// /detection event-detail page at non-English locales (see 2026-06-17
// incident). Each nested location now ships ~100B instead of 100KB-MB.
const NESTED_LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry population
  parent { id name }
  metadata { type data }
`;

// Slim signal-location shape for map markers - only what
// crisis-detail-content actually reads.
const SIGNAL_LOCATION_FIELDS = `
  id name level geometry
`;

const SIGNAL_FIELDS = `
  id
  source { id name type baseUrl infoUrl }
  title
  description
  severity
  url
  publishedAt
  collectedAt
  generalLocation { ${SIGNAL_LOCATION_FIELDS} }
  originLocation { ${SIGNAL_LOCATION_FIELDS} }
  destinationLocation { ${SIGNAL_LOCATION_FIELDS} }
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
  populationDisplaced
  generalLocation { ${NESTED_LOCATION_FIELDS} }
  originLocation { ${NESTED_LOCATION_FIELDS} }
  destinationLocation { ${NESTED_LOCATION_FIELDS} }
  signals { ${SIGNAL_FIELDS} }
  alerts { id status }
`;

const CRISIS_FIELDS = `
  id
  title
  summary
  severity
  generalLocation { ${LOCATION_FIELDS} }
  needs
  scenarios
  populationAffected
  populationInArea
  attachments
  events { ${EVENT_FIELDS} }
`;

/** Cheaper field set for list views - no per-event detail. */
const CRISIS_LIST_FIELDS = `
  id
  title
  summary
  severity
  generalLocation { ${NESTED_LOCATION_FIELDS} }
  needs
  populationAffected
  populationInArea
  events { id title severity rank firstSignalCreatedAt lastSignalCreatedAt }
`;

const CRISES_LIST_QUERY = `
  query Crises {
    crises {
      ${CRISIS_LIST_FIELDS}
    }
  }
`;

/** Menu-only list — avoids locations/needs/summary on every event-detail open. */
const CRISES_LIST_MENU_QUERY = `
  query CrisesMenu {
    crises {
      id
      title
      events { id }
    }
  }
`;

const CRISIS_GET_QUERY = `
  query Crisis($id: String!) {
    crisis(id: $id) {
      ${CRISIS_FIELDS}
    }
  }
`;

const UPDATE_CRISIS_META_MUTATION = `
  mutation UpdateCrisisMeta($id: String!, $input: UpdateCrisisPopulationInput!) {
    updateCrisisPopulation(id: $id, input: $input) {
      id
      title
      summary
    }
  }
`;

/** Any authenticated user — writes a title-edit audit row that locks pipeline overwrites. */
const UPDATE_CRISIS_TITLE_MUTATION = `
  mutation UpdateCrisisTitle($id: String!, $title: String!) {
    updateCrisisTitle(id: $id, title: $title) {
      id
      title
    }
  }
`;

const CREATE_CRISIS_FROM_EVENTS_MUTATION = `
  mutation CreateCrisisFromEvents($input: CreateCrisisFromEventsInput!) {
    createCrisisFromEvents(input: $input) {
      id
      title
      summary
      severity
      needs
      scenarios
      generalLocation { ${NESTED_LOCATION_FIELDS} }
      populationAffected
      populationInArea
      events {
        id
        title
        description
        types
        severity
        rank
        isDummy
        firstSignalCreatedAt
        lastSignalCreatedAt
        populationAffected
        populationDisplaced
        generalLocation { ${NESTED_LOCATION_FIELDS} }
        originLocation { ${NESTED_LOCATION_FIELDS} }
        destinationLocation { ${NESTED_LOCATION_FIELDS} }
        signals { ${SIGNAL_FIELDS} }
        alerts { id status }
      }
      attachments
    }
  }
`;

const ADD_ATTACHMENTS_MUTATION = `
  mutation AddCrisisAttachments($id: String!, $keys: [String!]!) {
    addCrisisAttachments(id: $id, keys: $keys) {
      id
      attachments
    }
  }
`;

const REMOVE_ATTACHMENT_MUTATION = `
  mutation RemoveCrisisAttachment($id: String!, $key: String!) {
    removeCrisisAttachment(id: $id, key: $key) {
      id
      attachments
    }
  }
`;

const ADD_EVENT_TO_CRISIS_MUTATION = `
  mutation AddEventToCrisis($crisisId: String!, $eventId: String!) {
    addEventToCrisis(crisisId: $crisisId, eventId: $eventId) {
      id
      crisisId
      eventId
      collectedAt
    }
  }
`;

/** Slim candidate page for reverse-path add + recommendations. */
const RECOMMEND_LOCATION_FIELDS = `
  id name level geoId ancestorIds
`;

const RECOMMEND_EVENT_FIELDS = `
  id
  title
  description
  types
  severity
  firstSignalCreatedAt
  lastSignalCreatedAt
  generalLocation { ${RECOMMEND_LOCATION_FIELDS} }
  originLocation { ${RECOMMEND_LOCATION_FIELDS} }
  destinationLocation { ${RECOMMEND_LOCATION_FIELDS} }
  signals { id source { name } }
  alerts { id status }
`;

const EVENTS_FOR_RECOMMEND_QUERY = `
  query EventsForCrisisRecommend($input: EventsPageInput) {
    eventsPage(input: $input) {
      items { ${RECOMMEND_EVENT_FIELDS} }
    }
  }
`;

const REMOVE_EVENT_FROM_CRISIS_MUTATION = `
  mutation RemoveEventFromCrisis($crisisId: String!, $eventId: String!) {
    removeEventFromCrisis(crisisId: $crisisId, eventId: $eventId) {
      id
      events { id }
    }
  }
`;

const DELETE_CRISIS_MUTATION = `
  mutation DeleteCrisis($id: String!) {
    deleteCrisis(id: $id)
  }
`;

export const crisesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ crises: GqlCrisis[] }>(
      CRISES_LIST_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    return data.crises;
  }),

  /** Tiny list for Add-to-Crisis dropdown — fetch only when the menu opens. */
  listMenu: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ crises: GqlCrisisMenuItem[] }>(
      CRISES_LIST_MENU_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    return data.crises;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ crisis: GqlCrisis | null }>(
        CRISIS_GET_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.crisis;
    }),

  createFromEvents: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        summary: z.string().optional(),
        severity: z.number(),
        locationId: z.string().optional(),
        /** Free-form JSON; CLEAR writes ClusterNeed[] shape. */
        needs: z.unknown(),
        eventIds: z.array(z.string()).min(1),
        /** Team the crisis is filed under. Purely an authorisation hint —
         *  the backend uses it to admit team_admin / field_coordinator
         *  callers without a global admin/analyst role. Ignored
         *  (harmlessly) for platform callers. */
        teamId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        createCrisisFromEvents: GqlCrisis;
      }>(CREATE_CRISIS_FROM_EVENTS_MUTATION, { input }, cookieHeaders(ctx));
      return data.createCrisisFromEvents;
    }),

  addAttachments: protectedProcedure
    .input(z.object({ id: z.string(), keys: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ addCrisisAttachments: { id: string; attachments: string[] } }>(
        ADD_ATTACHMENTS_MUTATION,
        input,
        cookieHeaders(ctx),
      );
      return data.addCrisisAttachments;
    }),

  removeAttachment: protectedProcedure
    .input(z.object({ id: z.string(), key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ removeCrisisAttachment: { id: string; attachments: string[] } }>(
        REMOVE_ATTACHMENT_MUTATION,
        input,
        cookieHeaders(ctx),
      );
      return data.removeCrisisAttachment;
    }),

  addEvent: protectedProcedure
    .input(z.object({ crisisId: z.string(), eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        addEventToCrisis: {
          id: string;
          crisisId: string;
          eventId: string;
          collectedAt: string;
        };
      }>(ADD_EVENT_TO_CRISIS_MUTATION, input, cookieHeaders(ctx));
      return data.addEventToCrisis;
    }),

  /**
   * Reverse-path add: search + smart recommendations for events not yet
   * linked to this crisis. Scoring: location / ±7d time / type / severity / source.
   */
  recommendEvents: protectedProcedure
    .input(
      z.object({
        crisisId: z.string(),
        search: z.string().optional(),
        teamId: z.string().nullish(),
        limit: z.number().int().min(1).max(25).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const crisisData = await graphqlFetch<{ crisis: GqlCrisis | null }>(
        CRISIS_GET_QUERY,
        { id: input.crisisId },
        cookieHeaders(ctx),
      );
      const crisis = crisisData.crisis;
      if (!crisis) {
        return { recommended: [], searchResults: [], linkedIds: [] as string[] };
      }

      const linkedIds = crisis.events.map((e) => e.id);
      const linkedSet = new Set(linkedIds);

      const pageData = await graphqlFetch<{ eventsPage: { items: GqlEvent[] } }>(
        EVENTS_FOR_RECOMMEND_QUERY,
        {
          input: {
            teamId: input.teamId ?? undefined,
            includeDummy: false,
            limit: 200,
            orderBy: "LAST_SIGNAL_DESC",
          },
        },
        cookieHeaders(ctx),
      );
      const candidates = pageData.eventsPage.items.filter((e) => !linkedSet.has(e.id));
      const search = input.search?.trim() ?? "";
      const limit = input.limit ?? 10;

      const recommended = rankEventsForCrisis(candidates, crisis.events, {
        excludeIds: linkedSet,
        limit,
      }).map((r) => ({
        event: r.event as GqlEvent,
        score: r.score,
        reasons: r.reasons,
      }));

      if (!search) {
        return { recommended, searchResults: [] as typeof recommended, linkedIds };
      }

      const ctxScore = buildCrisisRecommendContext(crisis.events);
      const searchResults = candidates
        .filter((e) => eventMatchesSearch(e, search))
        .map((event) => {
          const { score, reasons } = scoreEventAgainstCrisis(event, ctxScore);
          return { event, score, reasons };
        })
        .sort((a, b) => b.score - a.score || (b.event.lastSignalCreatedAt ?? "").localeCompare(a.event.lastSignalCreatedAt ?? ""))
        .slice(0, 40);

      return { recommended, searchResults, linkedIds };
    }),

  removeEvent: protectedProcedure
    .input(z.object({ crisisId: z.string(), eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ removeEventFromCrisis: { id: string; events: { id: string }[] } | null }>(
        REMOVE_EVENT_FROM_CRISIS_MUTATION,
        input,
        cookieHeaders(ctx),
      );
      return data.removeEventFromCrisis;
    }),

  deleteCrisis: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ deleteCrisis: boolean }>(
        DELETE_CRISIS_MUTATION,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.deleteCrisis;
    }),

  /** Rename a crisis. Uses updateCrisisTitle (any auth user), not admin-only updateCrisisPopulation. */
  updateTitle: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ updateCrisisTitle: { id: string; title: string | null } }>(
        UPDATE_CRISIS_TITLE_MUTATION,
        input,
        cookieHeaders(ctx),
      );
      return data.updateCrisisTitle;
    }),

  /** Admin-only summary/population path via updateCrisisPopulation. */
  updateMeta: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      summary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const data = await graphqlFetch<{ updateCrisisPopulation: { id: string; title: string | null; summary: string | null } }>(
        UPDATE_CRISIS_META_MUTATION,
        { id, input: fields },
        cookieHeaders(ctx),
      );
      return data.updateCrisisPopulation;
    }),
});
