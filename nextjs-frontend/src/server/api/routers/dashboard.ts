import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch } from "~/server/api/django";

export const dashboardRouter = createTRPCRouter({
  /**
   * Get dashboard overview data from Django.
   * Falls back to static data when Django is unavailable.
   */
  getOverview: publicProcedure.query(async () => {
    try {
      return await djangoFetch("/api/dashboard/overview/");
    } catch {
      // Return static fallback data when Django is unavailable
      return {
        activeCrises: 3,
        teamsDeployed: 12,
        atRisk: 45000,
        crises: [
          {
            id: 1,
            name: "Cholera Outbreak",
            meta: "Somali Region \u2022 247 cases \u2022 46h window",
            severity: "critical",
          },
          {
            id: 2,
            name: "Flooding Risk",
            meta: "Oromia Region \u2022 36h warning",
            severity: "high",
          },
          {
            id: 3,
            name: "Drought Monitoring",
            meta: "Afar Region \u2022 Early warning",
            severity: "medium",
          },
        ],
      };
    }
  }),
});
