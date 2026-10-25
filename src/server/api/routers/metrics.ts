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

/**
 * Platform metrics for the admin /metrics page. A thin proxy over
 * clear-api's `detectionMetrics` (clear-api ADR-0011, "Time to detection"):
 * clear-api decides which events count and returns counts; this adds the
 * shares. The admin check here only spares clear-api a call it would refuse —
 * clear-api's FORBIDDEN is the real gate.
 */

const detectionMetricsQuery = (weekFields: string) => `
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
      weekly { ${weekFields} }
      exclusions { reason count }
    }
  }
`;

/** With each week's events in range, for the trend's coverage line. */
export const DETECTION_METRICS_QUERY = detectionMetricsQuery(
  "isoWeek weekStart eventsInRange counted sameDay byNextDay isPartial",
);
/** Without it: for a clear-api that predates `DetectionWeek.eventsInRange`.
 * The page then draws no coverage line. Drop once every environment has it. */
export const DETECTION_METRICS_QUERY_V1 = detectionMetricsQuery(
  "isoWeek weekStart counted sameDay byNextDay isPartial",
);

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
      const fetchWith = (query: string) =>
        graphqlFetch<{ detectionMetrics: GqlDetectionMetrics }>(query, { input: variables }, cookieHeaders(ctx));
      try {
        let data: { detectionMetrics: GqlDetectionMetrics };
        try {
          data = await fetchWith(DETECTION_METRICS_QUERY);
        } catch (err) {
          if (!isGraphqlSchemaUnavailable(err)) throw err;
          data = await fetchWith(DETECTION_METRICS_QUERY_V1);
        }
        return { status: "ok", metrics: withShares(data.detectionMetrics) };
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return { status: "unavailable" };
        toTrpcError(err);
      }
    }),
});
