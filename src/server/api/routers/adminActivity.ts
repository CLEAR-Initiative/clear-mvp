import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch } from "~/server/api/graphql";
import { isGraphqlSchemaUnavailable } from "~/server/api/graphql-schema-unavailable";
import { toTrpcError } from "~/server/api/routers/tasks";
import { isPlatformAdmin } from "~/lib/roles";

/**
 * Usage activity for the admin /admin/activity page: a thin proxy over
 * clear-api's `activityStats`, `agentUsageStats` and `nrcActivityExport`.
 * clear-api's FORBIDDEN is the real gate; the admin check here only spares
 * it a call it would refuse.
 */

export const ACTIVITY_OVERVIEW_QUERY = `
  query AdminActivityOverview($from: DateTime, $to: DateTime) {
    activityStats(from: $from, to: $to) {
      from
      to
      totals { total actions { action count } }
    }
    agentUsageStats(from: $from, to: $to) {
      from
      to
      turns
      answers
      distinctUsers
      costUsd
      inputTokens
      outputTokens
      byRoute { route turns distinctUsers }
      byDay { date turns distinctUsers costUsd }
    }
  }
`;

export const NRC_EXPORT_QUERY = `
  query NrcActivityExport($from: DateTime, $to: DateTime) {
    nrcActivityExport(from: $from, to: $to)
  }
`;

export type ActivityStats = {
  from: string;
  to: string;
  totals: { total: number; actions: Array<{ action: string; count: number }> };
};

export type AgentUsageStats = {
  from: string;
  to: string;
  turns: number;
  answers: number;
  distinctUsers: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  byRoute: Array<{ route: string; turns: number; distinctUsers: number }>;
  byDay: Array<{ date: string; turns: number; distinctUsers: number; costUsd: number }>;
};

export type ActivityOverview = { activity: ActivityStats; agent: AgentUsageStats };

export type ActivityOverviewResult = { status: "ok"; overview: ActivityOverview } | { status: "unavailable" };

const rangeInput = z
  .object({
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
  })
  .optional();

function assertAdmin(role: string | null | undefined) {
  if (!isPlatformAdmin(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Activity is for platform admins" });
  }
}

function rangeVariables(input: z.infer<typeof rangeInput>) {
  const variables: Record<string, string> = {};
  if (input?.from) variables.from = input.from;
  if (input?.to) variables.to = input.to;
  return variables;
}

export const adminActivityRouter = createTRPCRouter({
  /** Generic action counts plus agent usage over a range (clear-api's
   * default when omitted). `unavailable` while clear-api lacks the fields. */
  overview: protectedProcedure
    .input(rangeInput)
    .query(async ({ ctx, input }): Promise<ActivityOverviewResult> => {
      assertAdmin(ctx.user.role);
      try {
        const data = await graphqlFetch<{ activityStats: ActivityStats; agentUsageStats: AgentUsageStats }>(
          ACTIVITY_OVERVIEW_QUERY,
          rangeVariables(input),
          cookieHeaders(ctx),
        );
        return { status: "ok", overview: { activity: data.activityStats, agent: data.agentUsageStats } };
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return { status: "unavailable" };
        toTrpcError(err);
      }
    }),

  /** The NRC aggregate CSV (monthly, by organisation/team/role; clear-api
   * hides groups under five people and excludes admins). Default window:
   * the last 12 months. */
  nrcExport: protectedProcedure.input(rangeInput).mutation(async ({ ctx, input }): Promise<{ csv: string }> => {
    assertAdmin(ctx.user.role);
    const variables = rangeVariables(input);
    if (!variables.from) {
      const from = variables.to ? new Date(variables.to) : new Date();
      from.setUTCMonth(from.getUTCMonth() - 12);
      variables.from = from.toISOString();
    }
    try {
      const data = await graphqlFetch<{ nrcActivityExport: string }>(NRC_EXPORT_QUERY, variables, cookieHeaders(ctx));
      return { csv: data.nrcActivityExport };
    } catch (err) {
      toTrpcError(err);
    }
  }),
});
