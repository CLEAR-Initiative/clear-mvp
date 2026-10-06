import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch } from "~/server/api/graphql";
import { toTrpcError } from "~/server/api/routers/tasks";
import { bellRows, bellUnreadCount } from "~/lib/notifications";
import type { GqlNotification } from "~/lib/types/graphql";

/**
 * In-app notifications: thin proxies over clear-api's `notifications` and
 * `markNotificationRead`, which are scoped to the signed-in user server-
 * side. The minimum the V2 Review flow needs (clear-api ADR-0010): the
 * bell's rows and mark one read when it is opened. clear-api writes them
 * (Task outcomes as `notificationType: "task"`); nothing in clear-mvp sends
 * mail.
 *
 * clear-api's `notifications` has no limit or type filter yet, so it
 * returns the user's whole history (alert fan-out included). The bell's cut
 * — its types, newest first, BELL_MAX_ROWS, and the unread count — is taken
 * here, so the browser gets a bounded payload; the API-side cost stays
 * until clear-api grows those arguments.
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

export const NOTIFICATIONS_QUERY = `
  query Notifications {
    notifications {
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
  /** What the bell shows of the signed-in user's notifications: its rows
   * (its types, newest first, capped) and every unread one of those types. */
  bell: protectedProcedure.query(async ({ ctx }) => {
    try {
      const data = await graphqlFetch<{ notifications: GqlNotification[] }>(
        NOTIFICATIONS_QUERY,
        {},
        cookieHeaders(ctx),
      );
      return { rows: bellRows(data.notifications), unread: bellUnreadCount(data.notifications) };
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
