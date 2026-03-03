import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { DjangoDetector, DjangoDetection } from "~/lib/types/django";

export const alertFrameworkRouter = createTRPCRouter({
  getDetectors: publicProcedure.query(async () => {
    return { success: true, detectors: [] as DjangoDetector[] };
  }),

  getDetections: publicProcedure.query(async () => {
    return { success: true, detections: [] as DjangoDetection[] };
  }),

  getStats: publicProcedure.query(async () => {
    return {
      success: true,
      stats: {
        detectors: { total: 0, active: 0 },
        detections: { total: 0, pending: 0, processed: 0, dismissed: 0 },
        alerts_generated: 0,
      },
    };
  }),
});
