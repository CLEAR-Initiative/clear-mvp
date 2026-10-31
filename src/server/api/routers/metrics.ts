import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch } from "~/server/api/graphql";
import { isGraphqlSchemaUnavailable } from "~/server/api/graphql-schema-unavailable";
import { toTrpcError } from "~/server/api/routers/tasks";
import { isPlatformAdmin } from "~/lib/roles";
import {
  withShares,
  type DetectionMetricsResult,
  type GqlDetectionMetrics,
} from "~/lib/detection-metrics";
import {
  withShares as withPrecisionShares,
  type GqlLocationPrecisionMetrics,
  type LocationPrecisionResult,
} from "~/lib/location-precision";
import {
  GRANULARITIES,
  type MetricAnnotationsResult,
  type MetricDefinition,
  type MetricDefinitionsResult,
  type MetricSeries,
  type MetricSeriesResult,
  type SeriesMarker,
} from "~/lib/metric-series";

/**
 * Platform metrics for the admin /metrics page. A thin proxy over
 * clear-api's `detectionMetrics` (clear-api ADR-0011, "Time to detection"):
 * clear-api decides which events count and returns counts; this adds the
 * shares. The admin check here only spares clear-api a call it would refuse —
 * clear-api's FORBIDDEN is the real gate.
 */

export const DETECTION_METRICS_QUERY = `
  query DetectionMetrics($input: DetectionMetricsInput) {
    detectionMetrics(input: $input) {
      from
      to
      eventsInRange
      withOnset
      counted
      sameDay
      byNextDay
      histogram { daysAfterOnset isOpenEnded count }
      weekly { isoWeek weekStart counted sameDay byNextDay isPartial }
      exclusions { reason count }
    }
  }
`;

export const LOCATION_PRECISION_QUERY = `
  query LocationPrecisionMetrics($input: LocationPrecisionMetricsInput) {
    locationPrecisionMetrics(input: $input) {
      from
      to
      signalsInRange
      bySource { source total noLocation country state district point }
      weekly { isoWeek weekStart source total noLocation country state district point isPartial }
      corrections { open accepted corrected declined superseded }
    }
  }
`;

/** The registry documents (clear-api ADR-0015): what the "Progress over
 * time" section reads. The older cards keep their own documents, so they keep
 * working while these are `unavailable`. */
export const METRIC_DEFINITIONS_QUERY = `
  query MetricDefinitions {
    metricDefinitions { key name dimension unit description timeBasis groupable adr }
  }
`;

export const METRIC_SERIES_QUERY = `
  query MetricSeries($input: MetricSeriesInput!) {
    metricSeries(input: $input) {
      metric
      granularity
      from
      to
      groups
      buckets { start label isPartial group numerator denominator }
    }
  }
`;

/** The annotation documents (clear-api ADR-0016): the changes that should move a metric, as rows. */
export const METRIC_ANNOTATIONS_QUERY = `
  query MetricAnnotations($input: MetricAnnotationsInput) {
    metricAnnotations(input: $input) { id at label description link metricKeys }
  }
`;

export const CREATE_METRIC_ANNOTATION_MUTATION = `
  mutation CreateMetricAnnotation($input: CreateMetricAnnotationInput!) {
    createMetricAnnotation(input: $input) { id at label description link metricKeys }
  }
`;

export const DELETE_METRIC_ANNOTATION_MUTATION = `
  mutation DeleteMetricAnnotation($id: ID!) {
    deleteMetricAnnotation(id: $id)
  }
`;

export const metricsRouter = createTRPCRouter({
  /** Time to detection over a range (clear-api's default: the last 12 ISO
   * weeks), optionally for one location. `unavailable` while clear-api does
   * not serve `detectionMetrics` yet. */
  detection: protectedProcedure
    .input(
      z
        .object({
          from: z.string().datetime({ offset: true }).optional(),
          to: z.string().datetime({ offset: true }).optional(),
          locationId: z.string().min(1).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<DetectionMetricsResult> => {
      if (!isPlatformAdmin(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Metrics are for platform admins" });
      }
      const variables: Record<string, string> = {};
      if (input?.from) variables.from = input.from;
      if (input?.to) variables.to = input.to;
      if (input?.locationId) variables.locationId = input.locationId;
      try {
        const data = await graphqlFetch<{ detectionMetrics: GqlDetectionMetrics }>(
          DETECTION_METRICS_QUERY,
          { input: variables },
          cookieHeaders(ctx),
        );
        return { status: "ok", metrics: withShares(data.detectionMetrics) };
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return { status: "unavailable" };
        toTrpcError(err);
      }
    }),

  /** Location precision over a range (clear-api ADR-0012): how finely the
   * pipeline placed the signals it located, per source and ISO week.
   * `unavailable` while clear-api does not serve `locationPrecisionMetrics`. */
  locationPrecision: protectedProcedure
    .input(
      z
        .object({
          from: z.string().datetime({ offset: true }).optional(),
          to: z.string().datetime({ offset: true }).optional(),
          locationId: z.string().min(1).optional(),
          sourceNames: z.array(z.string().min(1)).max(50).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<LocationPrecisionResult> => {
      if (!isPlatformAdmin(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Metrics are for platform admins" });
      }
      const variables: Record<string, string | string[]> = {};
      if (input?.from) variables.from = input.from;
      if (input?.to) variables.to = input.to;
      if (input?.locationId) variables.locationId = input.locationId;
      if (input?.sourceNames?.length) variables.sourceNames = input.sourceNames;
      try {
        const data = await graphqlFetch<{ locationPrecisionMetrics: GqlLocationPrecisionMetrics }>(
          LOCATION_PRECISION_QUERY,
          { input: variables },
          cookieHeaders(ctx),
        );
        return { status: "ok", metrics: withPrecisionShares(data.locationPrecisionMetrics) };
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return { status: "unavailable" };
        toTrpcError(err);
      }
    }),

  /** The metric registry (clear-api ADR-0015): every metric the page can
   * plot, with its name, dimension, unit, method text and grouping.
   * `unavailable` while clear-api does not serve it yet. */
  definitions: protectedProcedure.query(async ({ ctx }): Promise<MetricDefinitionsResult> => {
    if (!isPlatformAdmin(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Metrics are for platform admins" });
    }
    try {
      const data = await graphqlFetch<{ metricDefinitions: MetricDefinition[] }>(METRIC_DEFINITIONS_QUERY, {}, cookieHeaders(ctx));
      return { status: "ok", definitions: data.metricDefinitions };
    } catch (err) {
      if (isGraphqlSchemaUnavailable(err)) return { status: "unavailable" };
      toTrpcError(err);
    }
  }),

  /** One metric's series by day, ISO week or calendar month (clear-api
   * ADR-0014), as numerator over denominator per bucket, optionally grouped
   * by source (ADR-0015). The metric is a `MetricKey` from the registry;
   * clear-api refuses an unknown one. `unavailable` while clear-api does not
   * serve `metricSeries` yet. */
  series: protectedProcedure
    .input(
      z.object({
        metric: z.string().min(1).max(64),
        granularity: z.enum(GRANULARITIES).optional(),
        groupBy: z.enum(["SOURCE"]).optional(),
        from: z.string().datetime({ offset: true }).optional(),
        to: z.string().datetime({ offset: true }).optional(),
        locationId: z.string().min(1).optional(),
        sourceNames: z.array(z.string().min(1)).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }): Promise<MetricSeriesResult> => {
      if (!isPlatformAdmin(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Metrics are for platform admins" });
      }
      const variables: Record<string, string | string[]> = { metric: input.metric };
      if (input.granularity) variables.granularity = input.granularity;
      if (input.groupBy) variables.groupBy = input.groupBy;
      if (input.from) variables.from = input.from;
      if (input.to) variables.to = input.to;
      if (input.locationId) variables.locationId = input.locationId;
      if (input.sourceNames?.length) variables.sourceNames = input.sourceNames;
      try {
        const data = await graphqlFetch<{ metricSeries: MetricSeries }>(METRIC_SERIES_QUERY, { input: variables }, cookieHeaders(ctx));
        return { status: "ok", series: data.metricSeries };
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return { status: "unavailable" };
        toTrpcError(err);
      }
    }),

  /** The changes recorded against a metric in a range (clear-api ADR-0016),
   * oldest first; drawn as markers. `unavailable` while clear-api does not
   * serve `metricAnnotations` yet. */
  annotations: protectedProcedure
    .input(
      z
        .object({
          from: z.string().datetime({ offset: true }).optional(),
          to: z.string().datetime({ offset: true }).optional(),
          metric: z.string().min(1).max(64).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }): Promise<MetricAnnotationsResult> => {
      if (!isPlatformAdmin(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Metrics are for platform admins" });
      }
      const variables: Record<string, string> = {};
      if (input?.from) variables.from = input.from;
      if (input?.to) variables.to = input.to;
      if (input?.metric) variables.metric = input.metric;
      try {
        const data = await graphqlFetch<{ metricAnnotations: SeriesMarker[] }>(METRIC_ANNOTATIONS_QUERY, { input: variables }, cookieHeaders(ctx));
        return { status: "ok", annotations: data.metricAnnotations };
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return { status: "unavailable" };
        toTrpcError(err);
      }
    }),

  /** Record a change that should move a metric. clear-api validates and logs it. */
  createAnnotation: protectedProcedure
    .input(
      z.object({
        at: z.string().datetime({ offset: true }),
        label: z.string().trim().min(1).max(120),
        description: z.string().trim().max(1000).optional(),
        link: z.string().trim().url().max(500).optional(),
        metricKeys: z.array(z.string().min(1).max(64)).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }): Promise<SeriesMarker> => {
      if (!isPlatformAdmin(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Metrics are for platform admins" });
      }
      try {
        const data = await graphqlFetch<{ createMetricAnnotation: SeriesMarker }>(CREATE_METRIC_ANNOTATION_MUTATION, { input }, cookieHeaders(ctx));
        return data.createMetricAnnotation;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** Remove a recorded change. clear-api logs it. */
  deleteAnnotation: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }): Promise<boolean> => {
    if (!isPlatformAdmin(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Metrics are for platform admins" });
    }
    try {
      const data = await graphqlFetch<{ deleteMetricAnnotation: boolean }>(DELETE_METRIC_ANNOTATION_MUTATION, { id: input.id }, cookieHeaders(ctx));
      return data.deleteMetricAnnotation;
    } catch (err) {
      toTrpcError(err);
    }
  }),
});
