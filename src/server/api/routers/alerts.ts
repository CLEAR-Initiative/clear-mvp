import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import type { GqlAlert } from "~/lib/types/graphql";

const LOCATION_FIELDS = `
  id name level geoId ancestorIds geometry
`;

const SIGNAL_FIELDS = `
  id
  source { id name type }
  title
  description
  severity
  url
  publishedAt
  collectedAt
  generalLocation { ${LOCATION_FIELDS} }
  originLocation { ${LOCATION_FIELDS} }
  destinationLocation { ${LOCATION_FIELDS} }
`;

const EVENT_FIELDS = `
  id
  title
  description
  types
  severity
  rank
  firstSignalCreatedAt
  lastSignalCreatedAt
  populationAffected
  generalLocation { ${LOCATION_FIELDS} }
  originLocation { ${LOCATION_FIELDS} }
  destinationLocation { ${LOCATION_FIELDS} }
  signals { ${SIGNAL_FIELDS} }
  alerts { id status }
`;

const ALERTS_LIST_QUERY = `
  query Alerts($status: AlertStatus, $teamId: String) {
    alerts(status: $status, teamId: $teamId) {
      id
      status
      event { ${EVENT_FIELDS} }
    }
  }
`;

const ALERT_GET_QUERY = `
  query Alert($id: String!) {
    alert(id: $id) {
      id
      status
      event { ${EVENT_FIELDS} }
    }
  }
`;

const CREATE_ALERT_MUTATION = `
  mutation CreateAlert($input: CreateAlertInput!) {
    createAlert(input: $input) {
      id
      status
      event { id title types rank }
    }
  }
`;

export const alertsRouter = createTRPCRouter({
  getAlerts: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["draft", "published", "archived"]).optional(),
          activeOnly: z.boolean().optional(),
          teamId: z.string().nullish(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const status =
        input?.activeOnly === true ? "published" : input?.status;
      const data = await graphqlFetch<{ alerts: GqlAlert[] }>(
        ALERTS_LIST_QUERY,
        { ...(status ? { status } : {}), ...(input?.teamId ? { teamId: input.teamId } : {}) },
        cookieHeaders(ctx),
      );
      return { alerts: data.alerts };
    }),

  getAlert: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ alert: GqlAlert | null }>(
        ALERT_GET_QUERY,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return { alert: data.alert };
    }),

  getStats: protectedProcedure
    .input(z.object({ teamId: z.string().nullish() }).optional())
    .query(async ({ ctx, input }) => {
    const data = await graphqlFetch<{ alerts: GqlAlert[] }>(
      ALERTS_LIST_QUERY,
      input?.teamId ? { teamId: input.teamId } : undefined,
      cookieHeaders(ctx),
    );
    const alerts = data.alerts;
    const published = alerts.filter((a) => a.status === "published");
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recent7 = alerts.filter(
      (a) => new Date(a.event.firstSignalCreatedAt).getTime() > sevenDaysAgo,
    ).length;
    const recent30 = alerts.filter(
      (a) => new Date(a.event.firstSignalCreatedAt).getTime() > thirtyDaysAgo,
    ).length;

    return {
      stats: {
        overview: {
          total_alerts: alerts.length,
          active_alerts: published.length,
          recent_30_days: recent30,
          recent_7_days: recent7,
        },
      },
    };
  }),

  getShockTypes: publicProcedure.query(() => {
    // Shock types are a Django concept — stub for backward compat
    return { shock_types: [] as Array<{ id: number; name: string; icon: string; color: string }> };
  }),

  createAlert: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        severity: z.number().min(1).max(5),
        status: z.enum(["draft", "published", "archived"]).optional(),
        eventIds: z.array(z.string()).optional(),
        primaryEventId: z.string().optional(),
        locationIds: z.array(z.string()).optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ createAlert: GqlAlert }>(
        CREATE_ALERT_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.createAlert;
    }),
});
