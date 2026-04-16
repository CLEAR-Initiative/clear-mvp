import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";

/** Shape returned by the backend `situation` query. */
export interface GqlSituation {
  id: string;
  title: string | null;
  summary: string | null;
  severity: number;
  generalLocation: GqlLocation | null;
  /** Free-form JSON, expected to match ClusterNeed[] when set by CLEAR. */
  needs: unknown;
  /** BigInt serialised as string; null when unset. */
  populationAffected: string | null;
  populationInArea: string | null;
  events: GqlEvent[];
}

const LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry
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

const SITUATION_FIELDS = `
  id
  title
  summary
  severity
  generalLocation { ${LOCATION_FIELDS} }
  needs
  populationAffected
  populationInArea
  events { ${EVENT_FIELDS} }
`;

/** Cheaper field set for list views - no per-event detail. */
const SITUATION_LIST_FIELDS = `
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

const SITUATIONS_LIST_QUERY = `
  query Situations {
    situations {
      ${SITUATION_LIST_FIELDS}
    }
  }
`;

const SITUATION_GET_QUERY = `
  query Situation($id: String!) {
    situation(id: $id) {
      ${SITUATION_FIELDS}
    }
  }
`;

const CREATE_SITUATION_FROM_EVENTS_MUTATION = `
  mutation CreateSituationFromEvents($input: CreateSituationFromEventsInput!) {
    createSituationFromEvents(input: $input) {
      ${SITUATION_FIELDS}
    }
  }
`;

const ADD_EVENT_TO_SITUATION_MUTATION = `
  mutation AddEventToSituation($situationId: String!, $eventId: String!) {
    addEventToSituation(situationId: $situationId, eventId: $eventId) {
      id
      situationId
      eventId
      collectedAt
    }
  }
`;

export const situationsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ situations: GqlSituation[] }>(
      SITUATIONS_LIST_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    return data.situations;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ situation: GqlSituation | null }>(
        SITUATION_GET_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.situation;
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
      const data = await graphqlFetch<{ createSituationFromEvents: GqlSituation }>(
        CREATE_SITUATION_FROM_EVENTS_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createSituationFromEvents;
    }),

  addEvent: protectedProcedure
    .input(z.object({ situationId: z.string(), eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        addEventToSituation: {
          id: string;
          situationId: string;
          eventId: string;
          collectedAt: string;
        };
      }>(ADD_EVENT_TO_SITUATION_MUTATION, input, cookieHeaders(ctx));
      return data.addEventToSituation;
    }),
});
