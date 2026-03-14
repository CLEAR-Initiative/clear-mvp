import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

const SIGNAL_FIELDS = `
  id
  source {
    id
    title
    confidence
    status
    detectedAt
    dataSource { id name type }
    locations { id location { id name geoId level } createdAt }
    createdAt
    updatedAt
  }
`;

const EVENT_FIELDS = `
  id
  description
  eventType
  severity
  status
  rank
  isAlert
  populationAffected
  firstSignalCreatedAt
  lastSignalCreatedAt
  locations { id location { id name level geometry } createdAt }
  signals { ${SIGNAL_FIELDS} }
  primarySignal { ${SIGNAL_FIELDS} }
  createdAt
  updatedAt
`;

const EVENT_LIST_QUERY = `
  query Events {
    events {
      ${EVENT_FIELDS}
    }
  }
`;

const EVENT_GET_QUERY = `
  query Event($id: String!) {
    event(id: $id) {
      ${EVENT_FIELDS}
    }
  }
`;

const CREATE_EVENT_MUTATION = `
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      ${EVENT_FIELDS}
    }
  }
`;

export const eventsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    const data = await graphqlFetch<{ events: GqlEvent[] }>(EVENT_LIST_QUERY);
    return data.events;
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await graphqlFetch<{ event: GqlEvent | null }>(
        EVENT_GET_QUERY,
        { id: input.id },
      );
      return data.event;
    }),

  create: publicProcedure
    .input(
      z.object({
        signalIds: z.array(z.string()).min(1),
        primarySignalId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = await graphqlFetch<{ createEvent: GqlEvent }>(
        CREATE_EVENT_MUTATION,
        { input },
      );
      return data.createEvent;
    }),
});
