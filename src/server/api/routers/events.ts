import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";
import type { GqlEvent } from "~/lib/types/graphql";

const EVENT_LIST_QUERY = `
  query Events {
    events {
      id
      signals {
        id
        detection {
          id
          title
          confidence
          status
          detectedAt
          source { id name type }
          locations { id location { id name geoId level } createdAt }
          createdAt
          updatedAt
        }
      }
      primarySignal {
        id
        detection {
          id
          title
          confidence
          status
          detectedAt
          source { id name type }
          locations { id location { id name geoId level } createdAt }
          createdAt
          updatedAt
        }
      }
      alerts { id title }
    }
  }
`;

const EVENT_GET_QUERY = `
  query Event($id: String!) {
    event(id: $id) {
      id
      signals {
        id
        detection {
          id
          title
          confidence
          status
          detectedAt
          source { id name type }
          locations { id location { id name geoId level } createdAt }
          createdAt
          updatedAt
        }
      }
      primarySignal {
        id
        detection {
          id
          title
          confidence
          status
          detectedAt
          source { id name type }
          locations { id location { id name geoId level } createdAt }
          createdAt
          updatedAt
        }
      }
      alerts { id title }
    }
  }
`;

const CREATE_EVENT_MUTATION = `
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      signals {
        id
        detection { id title }
      }
      primarySignal {
        id
        detection { id title }
      }
      alerts { id title }
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
