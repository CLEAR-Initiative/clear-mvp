import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";

const ADD_FEEDBACK_MUTATION = `
  mutation AddFeedback($input: AddFeedbackInput!) {
    addFeedback(input: $input) {
      id
      rating
      text
      createdAt
    }
  }
`;

const DELETE_FEEDBACK_MUTATION = `
  mutation DeleteFeedback($id: String!) {
    deleteFeedback(id: $id)
  }
`;

export const feedbackRouter = createTRPCRouter({
  add: protectedProcedure
    .input(z.object({
      entityId: z.string(),
      entityType: z.enum(["event", "signal"]),
      rating: z.number().int(),
      text: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const gqlInput = {
        rating: input.rating,
        text: input.text,
        ...(input.entityType === "event"
          ? { eventId: input.entityId }
          : { signalId: input.entityId }),
      };
      const data = await graphqlFetch<{ addFeedback: { id: string; rating: number; text: string | null; createdAt: string } }>(
        ADD_FEEDBACK_MUTATION,
        { input: gqlInput },
        cookieHeaders(ctx),
      );
      return data.addFeedback;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await graphqlFetch<{ deleteFeedback: boolean }>(
        DELETE_FEEDBACK_MUTATION,
        { id: input.id },
        cookieHeaders(ctx),
      );
    }),
});
