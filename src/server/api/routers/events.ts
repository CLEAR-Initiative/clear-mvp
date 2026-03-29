import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

const LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry
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

const EVENT_LIST_QUERY = `
  query Events($teamId: String) {
    events(teamId: $teamId) {
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
  list: protectedProcedure
    .input(z.object({ teamId: z.string().nullish() }).optional())
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ events: GqlEvent[] }>(
        EVENT_LIST_QUERY,
        input?.teamId ? { teamId: input.teamId } : undefined,
        cookieHeaders(ctx),
      );
      return data.events;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ event: GqlEvent | null }>(
        EVENT_GET_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.event;
    }),

  create: protectedProcedure
    .input(
      z.object({
        signalIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createEvent: GqlEvent }>(
        CREATE_EVENT_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createEvent;
    }),
});
