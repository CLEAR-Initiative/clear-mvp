import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";
import type { GqlAlert } from "~/lib/types/graphql";

const ALERTS_LIST_QUERY = `
  query Alerts($status: AlertStatus) {
    alerts(status: $status) {
      id
      title
      description
      severity
      status
      events {
        id
        signals {
          id
          detection {
            id
            title
            confidence
            status
            detectedAt
            source { id name type }
            locations { id location { id name geoId level latitude longitude } createdAt }
            createdAt
            updatedAt
          }
        }
        primarySignal {
          id
          detection { id title }
        }
      }
      locations { id location { id name latitude longitude } createdAt }
      metadata
      createdAt
      updatedAt
    }
  }
`;

const ALERT_GET_QUERY = `
  query Alert($id: String!) {
    alert(id: $id) {
      id
      title
      description
      severity
      status
      events {
        id
        signals {
          id
          detection {
            id
            title
            confidence
            status
            detectedAt
            source { id name type }
            locations { id location { id name geoId level latitude longitude } createdAt }
            createdAt
            updatedAt
          }
        }
        primarySignal {
          id
          detection { id title }
        }
      }
      locations { id location { id name latitude longitude } createdAt }
      metadata
      createdAt
      updatedAt
    }
  }
`;

const CREATE_ALERT_MUTATION = `
  mutation CreateAlert($input: CreateAlertInput!) {
    createAlert(input: $input) {
      id
      title
      description
      severity
      status
      events { id }
      locations { id location { id name } }
      createdAt
      updatedAt
    }
  }
`;

export const alertsRouter = createTRPCRouter({
  getAlerts: publicProcedure
    .input(
      z
        .object({
          status: z.enum(["draft", "published", "archived"]).optional(),
          activeOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const status =
        input?.activeOnly === true ? "published" : input?.status;
      const data = await graphqlFetch<{ alerts: GqlAlert[] }>(
        ALERTS_LIST_QUERY,
        status ? { status } : undefined,
      );
      // Debug: log alert count and first location's coordinates
      const firstLoc = data.alerts[0]?.locations[0];
      console.log(
        `[alerts.getAlerts] count=${data.alerts.length}`,
        firstLoc ? `firstLoc=${JSON.stringify(firstLoc.location)}` : "no locations",
      );
      return { alerts: data.alerts };
    }),

  getAlert: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await graphqlFetch<{ alert: GqlAlert | null }>(
        ALERT_GET_QUERY,
        { id: input.id },
      );
      return { alert: data.alert };
    }),

  getStats: publicProcedure.query(async () => {
    const data = await graphqlFetch<{ alerts: GqlAlert[] }>(
      ALERTS_LIST_QUERY,
    );
    const alerts = data.alerts;
    const published = alerts.filter((a) => a.status === "published");
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recent7 = alerts.filter(
      (a) => new Date(a.createdAt).getTime() > sevenDaysAgo,
    ).length;
    const recent30 = alerts.filter(
      (a) => new Date(a.createdAt).getTime() > thirtyDaysAgo,
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

  createAlert: publicProcedure
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
    .mutation(async ({ input }) => {
      const data = await graphqlFetch<{ createAlert: GqlAlert }>(
        CREATE_ALERT_MUTATION,
        { input },
      );
      return data.createAlert;
    }),
});
