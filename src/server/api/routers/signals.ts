import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";
import type { GqlSignal } from "~/lib/types/graphql";

const SIGNAL_LIST_QUERY = `
  query Signals {
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
      events { id }
      primaryOf { id }
    }
  }
`;

const CREATE_SIGNAL_MUTATION = `
  mutation CreateSignal($detectionId: String!) {
    createSignal(detectionId: $detectionId) {
      id
      detection { id title }
      events { id }
      primaryOf { id }
    }
  }
`;

export const signalsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    const data = await graphqlFetch<{ signals: GqlSignal[] }>(
      SIGNAL_LIST_QUERY,
    );
    return data.signals;
  }),

  create: publicProcedure
    .input(z.object({ detectionId: z.string() }))
    .mutation(async ({ input }) => {
      const data = await graphqlFetch<{ createSignal: GqlSignal }>(
        CREATE_SIGNAL_MUTATION,
        { detectionId: input.detectionId },
      );
      return data.createSignal;
    }),
});
