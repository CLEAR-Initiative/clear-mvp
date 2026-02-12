import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch } from "~/server/api/django";
import type {
  DjangoDetectorsResponse,
  DjangoDetectionsResponse,
  DjangoFrameworkStatsResponse,
} from "~/lib/types/django";
import {
  FALLBACK_DETECTORS,
  FALLBACK_DETECTIONS,
  FALLBACK_FRAMEWORK_STATS,
} from "~/lib/fallback-data";

export const alertFrameworkRouter = createTRPCRouter({
  getDetectors: publicProcedure.query(async () => {
    try {
      return await djangoFetch<DjangoDetectorsResponse>(
        "/alert_framework/api/detectors/",
      );
    } catch {
      return FALLBACK_DETECTORS;
    }
  }),

  getDetections: publicProcedure.query(async () => {
    try {
      return await djangoFetch<DjangoDetectionsResponse>(
        "/alert_framework/api/detections/",
      );
    } catch {
      return FALLBACK_DETECTIONS;
    }
  }),

  getStats: publicProcedure.query(async () => {
    try {
      // Django SystemStatsAPIView returns { detector_stats, detection_stats, ... }
      // We transform it to match our DjangoFrameworkStatsResponse shape
      const raw = await djangoFetch<{
        detector_stats?: { total: number; active: number };
        detection_stats?: { total: number; pending: number; processed_today?: number; dismissed_today?: number };
        // Also accept the already-transformed shape from fallback
        stats?: { detectors: { total: number; active: number }; detections: { total: number; pending: number; processed: number; dismissed: number }; alerts_generated: number };
      }>("/alert_framework/api/stats/");

      // If it already has the expected shape, return directly
      if (raw.stats) return raw as DjangoFrameworkStatsResponse;

      // Transform from Django SystemStatsAPIView response
      return {
        success: true,
        stats: {
          detectors: {
            total: raw.detector_stats?.total ?? 0,
            active: raw.detector_stats?.active ?? 0,
          },
          detections: {
            total: raw.detection_stats?.total ?? 0,
            pending: raw.detection_stats?.pending ?? 0,
            processed: raw.detection_stats?.processed_today ?? 0,
            dismissed: raw.detection_stats?.dismissed_today ?? 0,
          },
          alerts_generated: 0,
        },
      } satisfies DjangoFrameworkStatsResponse;
    } catch {
      return FALLBACK_FRAMEWORK_STATS;
    }
  }),
});
