import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
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
  id name level geoId ancestorIds geometry
  metadata { type data }
  ancestors { id name level metadata { type data } }
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
  generalLocation { ${LOCATION_FIELDS} }
  needs
  populationAffected
  populationInArea
  events { id title severity rank }
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
});
