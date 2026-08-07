import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import { isGraphqlSchemaUnavailable } from "~/server/api/graphql-schema-unavailable";
import type { GqlSignalLocationChallenge } from "~/lib/types/graphql";

const CHALLENGE_FIELDS = `
  id
  signalId
  status
  note
  proposedLng
  proposedLat
  proposedName
  createdBy
  createdAt
  updatedAt
  hasProposedPoint
`;

const GET_BY_SIGNAL_QUERY = `
  query SignalLocationChallenge($id: String!) {
    signal(id: $id) {
      id
      locationChallenge { ${CHALLENGE_FIELDS} }
    }
  }
`;

const LIST_FOR_MAP_QUERY = `
  query SignalLocationChallenges($teamId: String, $status: String) {
    signalLocationChallenges(teamId: $teamId, status: $status) {
      ${CHALLENGE_FIELDS}
    }
  }
`;

const SUBMIT_MUTATION = `
  mutation SubmitSignalLocationChallenge($input: SubmitSignalLocationChallengeInput!) {
    submitSignalLocationChallenge(input: $input) {
      ${CHALLENGE_FIELDS}
    }
  }
`;

const proposedPointPair = z
  .object({
    proposedLng: z.number().min(-180).max(180).optional(),
    proposedLat: z.number().min(-90).max(90).optional(),
    proposedName: z.string().trim().max(500).optional(),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    const hasLng = val.proposedLng != null;
    const hasLat = val.proposedLat != null;
    if (hasLng !== hasLat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "proposedLng and proposedLat must both be set, or both omitted",
        path: hasLng ? ["proposedLat"] : ["proposedLng"],
      });
    }
  });

export const locationChallengeRouter = createTRPCRouter({
  getBySignal: protectedProcedure
    .input(z.object({ signalId: z.string().min(1) }))
    .query(async ({ ctx, input }): Promise<GqlSignalLocationChallenge | null> => {
      try {
        const data = await graphqlFetch<{
          signal: { id: string; locationChallenge: GqlSignalLocationChallenge | null } | null;
        }>(GET_BY_SIGNAL_QUERY, { id: input.signalId }, cookieHeaders(ctx));
        return data.signal?.locationChallenge ?? null;
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return null;
        throw err;
      }
    }),

  listForMap: protectedProcedure
    .input(
      z.object({
        teamId: z.string().optional(),
        status: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }): Promise<GqlSignalLocationChallenge[]> => {
      try {
        const data = await graphqlFetch<{
          signalLocationChallenges: GqlSignalLocationChallenge[];
        }>(
          LIST_FOR_MAP_QUERY,
          {
            teamId: input?.teamId,
            status: input?.status ?? "consideration",
          },
          cookieHeaders(ctx),
        );
        return data.signalLocationChallenges ?? [];
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) return [];
        throw err;
      }
    }),

  submit: protectedProcedure
    .input(
      z
        .object({ signalId: z.string().min(1) })
        .and(proposedPointPair),
    )
    .mutation(async ({ ctx, input }): Promise<GqlSignalLocationChallenge> => {
      const gqlInput = {
        signalId: input.signalId,
        note: input.note || undefined,
        proposedLng: input.proposedLng,
        proposedLat: input.proposedLat,
        proposedName: input.proposedName || undefined,
      };
      try {
        const data = await graphqlFetch<{
          submitSignalLocationChallenge: GqlSignalLocationChallenge;
        }>(SUBMIT_MUTATION, { input: gqlInput }, cookieHeaders(ctx));
        return data.submitSignalLocationChallenge;
      } catch (err) {
        if (isGraphqlSchemaUnavailable(err)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "LOCATION_CHALLENGE_BACKEND_UNAVAILABLE",
          });
        }
        throw err;
      }
    }),
});
