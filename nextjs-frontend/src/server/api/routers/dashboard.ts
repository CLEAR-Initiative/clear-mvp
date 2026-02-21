import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch, extractCookieHeader } from "~/server/api/django";

export const dashboardRouter = createTRPCRouter({
  /** Get dashboard overview data from Django. */
  getOverview: publicProcedure.query(async ({ ctx }) => {
    return await djangoFetch("/api/dashboard/overview/", {
      headers: extractCookieHeader(ctx.headers),
    });
  }),
});
