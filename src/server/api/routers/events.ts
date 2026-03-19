import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

const LOCATION_FIELDS = `
  id name level geoId geometry
`;

const SIGNAL_FIELDS = `
  id
  source { id name type }
  title
  description
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
  list: publicProcedure
    .input(z.object({ teamId: z.string().nullish() }).optional())
    .query(async ({ input }) => {
      const data = await graphqlFetch<{ events: GqlEvent[] }>(
        EVENT_LIST_QUERY,
        input?.teamId ? { teamId: input.teamId } : undefined,
      );
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
