import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
// GqlDetection was removed — Detection is now accessed via Signal.source (DataSource)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GqlDetection = any;

const DETECTION_LIST_QUERY = `
  query Detections($status: DetectionStatus) {
    detections(status: $status) {
      id
      title
      confidence
      status
      detectedAt
      rawData
      source { id name type }
      signal { id }
      locations { id location { id name geoId level } createdAt }
      createdAt
      updatedAt
    }
  }
`;

const CREATE_DETECTION_MUTATION = `
  mutation CreateDetection($input: CreateDetectionInput!) {
    createDetection(input: $input) {
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
`;

export const detectionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["raw", "processed", "ignored"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ detections: GqlDetection[] }>(
        DETECTION_LIST_QUERY,
        input?.status ? { status: input.status } : undefined,
        cookieHeaders(ctx),
      );
      return data.detections;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        confidence: z.number().optional(),
        status: z.enum(["raw", "processed", "ignored"]).optional(),
        sourceId: z.string().optional(),
        locationIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createDetection: GqlDetection }>(
        CREATE_DETECTION_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createDetection;
    }),
});
