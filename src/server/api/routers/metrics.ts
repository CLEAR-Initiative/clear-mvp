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
  METRIC_KEYS,
  detectionSeries,
  precisionSeries,
  type GqlDetectionSeries,
  type GqlLocationPrecisionSeries,
  type MetricSeriesResult,
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

/** The series documents (clear-api ADR-0014): only what the "Progress over
 * time" section reads, so the older cards' documents stay as they are and
 * keep working while this one is `unavailable`. */
export const DETECTION_SERIES_QUERY = `
  query DetectionSeries($input: DetectionMetricsInput) {
    detectionMetrics(input: $input) {
      from
      to
      granularity
      series { start label isPartial counted sameDay byNextDay }
    }
  }
`;

export const LOCATION_PRECISION_SERIES_QUERY = `
  query LocationPrecisionSeries($input: LocationPrecisionMetricsInput) {
    locationPrecisionMetrics(input: $input) {
      from
      to
      granularity
      bySource { source total }
      series { start label isPartial source total district point }
    }
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

  /** One metric's series by day, ISO week or calendar month (clear-api
   * ADR-0014), as numerator over denominator per bucket and group. The
   * metric names which clear-api query serves it. `unavailable` while
   * clear-api does not serve `series` yet. */
  series: protectedProcedure
    .input(
      z.object({
        metric: z.enum(METRIC_KEYS),
        granularity: z.enum(GRANULARITIES).optional(),
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
      const variables: Record<string, string | string[]> = {};
      if (input.from) variables.from = input.from;
      if (input.to) variables.to = input.to;
      if (input.locationId) variables.locationId = input.locationId;
      if (input.granularity) variables.granularity = input.granularity;
      try {
        if (input.metric === "districtOrFiner") {
          if (input.sourceNames?.length) variables.sourceNames = input.sourceNames;
          const data = await graphqlFetch<{ locationPrecisionMetrics: GqlLocationPrecisionSeries }>(
            LOCATION_PRECISION_SERIES_QUERY,
            { input: variables },
            cookieHeaders(ctx),
          );
          return { status: "ok", series: precisionSeries(data.locationPrecisionMetrics) };
        }
        const data = await graphqlFetch<{ detectionMetrics: GqlDetectionSeries }>(
          DETECTION_SERIES_QUERY,
          { input: variables },
          cookieHeaders(ctx),
        );
        return { status: "ok", series: detectionSeries(input.metric, data.detectionMetrics) };
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return { status: "unavailable" };
        toTrpcError(err);
      }
    }),
});
