import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch } from "~/server/api/graphql";
import { toTrpcError } from "~/server/api/routers/tasks";
import type { GqlNotification } from "~/lib/types/graphql";

/**
 * In-app notifications: thin proxies over clear-api's `notifications` and
 * `markNotificationRead`, which are scoped to the signed-in user server-
 * side. The minimum the V2 Review flow needs (clear-api ADR-0010): list the
 * rows and mark one read when it is opened. clear-api writes them (Task
 * outcomes as `notificationType: "task"`); nothing in clear-mvp sends mail.
 */

const NOTIFICATION_FIELDS = `
  id
  message
  notificationType
  actionUrl
  actionText
  status
  createdAt
  updatedAt
`;

export const NOTIFICATION_STATUSES = ["PENDING", "DELIVERED", "FAILED", "READ"] as const;

export const NOTIFICATIONS_QUERY = `
  query Notifications($status: NotificationStatus) {
    notifications(status: $status) {
      ${NOTIFICATION_FIELDS}
    }
  }
`;

export const MARK_NOTIFICATION_READ = `
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id) {
      ${NOTIFICATION_FIELDS}
    }
  }
`;

export const notificationsRouter = createTRPCRouter({
  /** The signed-in user's notifications, newest first; optionally one status. */
  list: protectedProcedure
    .input(z.object({ status: z.enum(NOTIFICATION_STATUSES).optional() }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const data = await graphqlFetch<{ notifications: GqlNotification[] }>(
          NOTIFICATIONS_QUERY,
          { status: input?.status },
          cookieHeaders(ctx),
        );
        return data.notifications;
      } catch (err) {
        toTrpcError(err);
      }
    }),

  /** Mark one of the signed-in user's notifications read. */
  markRead: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const data = await graphqlFetch<{ markNotificationRead: GqlNotification }>(
        MARK_NOTIFICATION_READ,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.markNotificationRead;
    } catch (err) {
      toTrpcError(err);
    }
  }),
});
