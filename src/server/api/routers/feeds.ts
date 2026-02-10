import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  fetchEarthquakes,
  fetchReliefWebReports,
  fetchWeather,
  checkFeedStatus,
} from "~/server/services/live-feeds";

export const feedsRouter = createTRPCRouter({
  earthquakes: protectedProcedure
    .input(
      z
        .object({
          minMagnitude: z.number().min(0).max(10).optional().default(4.5),
          period: z
            .enum(["hour", "day", "week", "month"])
            .optional()
            .default("week"),
        })
        .optional()
        .default({}),
    )
    .query(async ({ input }) => {
      return fetchEarthquakes(input.minMagnitude, input.period);
    }),

  reliefweb: protectedProcedure
    .input(
      z
        .object({
          country: z.string().optional(),
          limit: z.number().min(1).max(100).optional().default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ input }) => {
      return fetchReliefWebReports(input.country, input.limit);
    }),

  weather: protectedProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    )
    .query(async ({ input }) => {
      return fetchWeather(input.latitude, input.longitude);
    }),

  status: protectedProcedure.query(async () => {
    return checkFeedStatus();
  }),
});
