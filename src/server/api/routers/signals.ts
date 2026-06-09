import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlSignal, GqlSignalDetail } from "~/lib/types/graphql";

const LOCATION_FIELDS = `id name level geoId ancestorIds geometry pointType parent { id name } ancestors { id name level }`;

const SOURCE_FIELDS = `id name type baseUrl infoUrl`;

const SIGNAL_LIST_QUERY = `
  query Signals($teamId: String, $includeDummy: Boolean) {
    signals(teamId: $teamId, includeDummy: $includeDummy) {
      id
      source { ${SOURCE_FIELDS} }
      title
      description
      severity
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
      title
      description
      severity
      url
      publishedAt
      collectedAt
      media
      generalLocation { ${LOCATION_FIELDS} }
      originLocation { ${LOCATION_FIELDS} }
      destinationLocation { ${LOCATION_FIELDS} }
      events {
        id
        title
        types
        rank
        severity
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

const DATA_SOURCES_QUERY = `
  query DataSources {
    dataSources { id name type isActive }
  }
`;

const CREATE_SIGNAL_MUTATION = `
  mutation CreateSignal($input: CreateSignalInput!) {
    createSignal(input: $input) {
      id
      source { id name type }
      title
      description
      severity
      media
      events { id }
    }
  }
`;

const CREATE_MANUAL_SIGNAL_MUTATION = `
  mutation CreateManualSignal($input: CreateManualSignalInput!) {
    createManualSignal(input: $input) {
      id
      source { id name type }
      title
      description
      severity
      media
      events { id }
    }
  }
`;

export const signalsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ teamId: z.string().nullish(), includeDummy: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ signals: GqlSignal[] }>(
        SIGNAL_LIST_QUERY,
        {
          ...(input?.teamId ? { teamId: input.teamId } : {}),
          includeDummy: input?.includeDummy ?? false,
        },
        cookieHeaders(ctx),
      );
      return data.signals;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ signal: GqlSignalDetail | null }>(
        SIGNAL_GET_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.signal;
    }),

  sources: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{ dataSources: { id: string; name: string; type: string; isActive: boolean }[] }>(
      DATA_SOURCES_QUERY,
      undefined,
      cookieHeaders(ctx),
    );
    const MANUAL_SOURCE_NAMES = new Set(["field_officer", "partner", "government"]);
    return data.dataSources.filter((s) => MANUAL_SOURCE_NAMES.has(s.name));
  }),

  /** Pipeline-facing signal creation (used internally, not from UI) */
  create: protectedProcedure
    .input(
      z.object({
        sourceId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        url: z.string().optional(),
        severity: z.number().optional(),
        publishedAt: z.string().optional(),
        collectedAt: z.string().optional(),
        locationId: z.string().optional(),
        originId: z.string().optional(),
        destinationId: z.string().optional(),
        media: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const gqlInput = {
        ...input,
        publishedAt: input.publishedAt ?? new Date().toISOString(),
        rawData: { title: input.title, description: input.description },
      };
      const data = await graphqlFetch<{ createSignal: GqlSignal }>(
        CREATE_SIGNAL_MUTATION,
        { input: gqlInput },
        cookieHeaders(ctx),
      );
      return data.createSignal;
    }),

  /** Manual signal creation from UI - triggers pipeline processing + auto-escalation */
  createManual: protectedProcedure
    .input(
      z.object({
        sourceId: z.string(),
        title: z.string().min(1),
        description: z.string().min(1),
        severity: z.number().min(1).max(5).optional(),
        url: z.string().optional(),
        /** Media URLs (pre-uploaded via /api/proxy/upload) */
        mediaUrls: z.array(z.string()).optional(),
        locationId: z.string().optional(),
        originId: z.string().optional(),
        destinationId: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createManualSignal: GqlSignal }>(
        CREATE_MANUAL_SIGNAL_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createManualSignal;
    }),
});
