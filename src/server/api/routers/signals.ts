import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";
import type { GqlSignal, GqlSignalDetail } from "~/lib/types/graphql";

const LOCATION_FIELDS = `id name level geoId geometry`;

const SOURCE_FIELDS = `id name type baseUrl infoUrl`;

const SIGNAL_LIST_QUERY = `
  query Signals {
    signals {
      id
      source { ${SOURCE_FIELDS} }
      title
      description
      url
      publishedAt
      collectedAt
      generalLocation { ${LOCATION_FIELDS} }
      originLocation { ${LOCATION_FIELDS} }
      destinationLocation { ${LOCATION_FIELDS} }
      events { id }
    }
  }
`;

const SIGNAL_GET_QUERY = `
  query Signal($id: String!) {
    signal(id: $id) {
      id
      source { ${SOURCE_FIELDS} }
      rawData
      title
      description
      url
      publishedAt
      collectedAt
      generalLocation { ${LOCATION_FIELDS} }
      originLocation { ${LOCATION_FIELDS} }
      destinationLocation { ${LOCATION_FIELDS} }
      events {
        id
        title
        types
        rank
        firstSignalCreatedAt
        signals {
          id
          title
          description
          publishedAt
          source { id name type }
        }
      }
    }
  }
`;

const CREATE_SIGNAL_MUTATION = `
  mutation CreateSignal($input: CreateSignalInput!) {
    createSignal(input: $input) {
      id
      source { id name type }
      title
      description
      events { id }
    }
  }
`;

export const signalsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    const data = await graphqlFetch<{ signals: GqlSignal[] }>(SIGNAL_LIST_QUERY);
    return data.signals;
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await graphqlFetch<{ signal: GqlSignalDetail | null }>(
        SIGNAL_GET_QUERY,
        { id: input.id },
      );
      return data.signal;
    }),

  create: publicProcedure
    .input(
      z.object({
        sourceId: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        publishedAt: z.string().optional(),
        collectedAt: z.string().optional(),
        locationId: z.string().optional(),
        originId: z.string().optional(),
        destinationId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = await graphqlFetch<{ createSignal: GqlSignal }>(
        CREATE_SIGNAL_MUTATION,
        { input },
      );
      return data.createSignal;
    }),
});
