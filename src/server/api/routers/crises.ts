import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import { isPlatformAdmin } from "~/lib/roles";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";

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

const CREATE_CRISIS_FROM_EVENTS_MUTATION = `
  mutation CreateCrisisFromEvents($input: CreateCrisisFromEventsInput!) {
    createCrisisFromEvents(input: $input) {
      ${CRISIS_FIELDS}
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
      const data = await graphqlFetch<{ createCrisisFromEvents: GqlCrisis }>(
        CREATE_CRISIS_FROM_EVENTS_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
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

  updateMeta: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      summary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = (ctx as { user?: { role?: string } }).user;
      if (!isPlatformAdmin(user?.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...fields } = input;
      const data = await graphqlFetch<{ updateCrisisPopulation: { id: string; title: string | null; summary: string | null } }>(
        UPDATE_CRISIS_META_MUTATION,
        { id, input: fields },
        cookieHeaders(ctx),
      );
      return data.updateCrisisPopulation;
    }),
});
