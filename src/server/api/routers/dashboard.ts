import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  getOverview: publicProcedure.query(async () => {
    return {};
  }),
});
