import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cookieHeaders, graphqlFetch } from "~/server/api/graphql";
import { toTrpcError } from "~/server/api/routers/tasks";
import { isPlatformAdmin } from "~/lib/roles";
import type {
  Brief,
  BriefItem,
  BriefSendResult,
  BriefSummary,
  RecipientList,
  RecipientListMember,
} from "~/lib/brief/types";

/**
 * Briefs for the hidden admin page /brief: a thin proxy over clear-api's
 * Brief and Recipient-list operations, one procedure per GraphQL operation.
 * clear-api builds item snapshots, computes counts and sends every email;
 * nothing here decides anything. The admin check spares clear-api a call it
 * would refuse — its FORBIDDEN is the real gate.
 */

const BRIEF_SUMMARY_FIELDS = `
  id cadence status title locationId locationName windowStart windowEnd
  createdById sentAt sentById sentToListId sentCount failedCount createdAt updatedAt
`;

const ITEM_FIELDS = `
  id briefId kind entityId position note createdAt updatedAt
  snapshot { title severity locationName eventTypes occurredAt url }
`;

const COUNT_FIELDS = `total bySeverity { key count } byType { key count }`;

const BRIEF_FIELDS = `
  ${BRIEF_SUMMARY_FIELDS}
  summary closingNotes
  items { ${ITEM_FIELDS} }
  counts { signal { ${COUNT_FIELDS} } event { ${COUNT_FIELDS} } alert { ${COUNT_FIELDS} } }
`;

const MEMBER_FIELDS = `id listId email unsubscribedAt createdAt`;
const LIST_FIELDS = `id name recipientCount createdById createdAt updatedAt members { ${MEMBER_FIELDS} }`;

export const BRIEFS_QUERY = `
  query Briefs($limit: Int, $offset: Int) {
    briefs(limit: $limit, offset: $offset) { ${BRIEF_SUMMARY_FIELDS} }
  }
`;
export const BRIEF_QUERY = `
  query Brief($id: String!) { brief(id: $id) { ${BRIEF_FIELDS} } }
`;
export const RECIPIENT_LISTS_QUERY = `
  query RecipientLists { recipientLists { ${LIST_FIELDS} } }
`;
export const CREATE_BRIEF = `
  mutation CreateBrief($input: CreateBriefInput!) { createBrief(input: $input) { ${BRIEF_FIELDS} } }
`;
export const UPDATE_BRIEF = `
  mutation UpdateBrief($id: String!, $input: UpdateBriefInput!) { updateBrief(id: $id, input: $input) { ${BRIEF_SUMMARY_FIELDS} summary closingNotes } }
`;
export const REFRESH_BRIEF_WINDOW = `
  mutation RefreshBriefWindow($id: String!) { refreshBriefWindow(id: $id) { ${BRIEF_FIELDS} } }
`;
export const DELETE_BRIEF = `
  mutation DeleteBrief($id: String!) { deleteBrief(id: $id) }
`;
export const ADD_BRIEF_ITEM = `
  mutation AddBriefItem($briefId: String!, $kind: BriefItemKind!, $entityId: String!) {
    addBriefItem(briefId: $briefId, kind: $kind, entityId: $entityId) { ${ITEM_FIELDS} }
  }
`;
export const REMOVE_BRIEF_ITEM = `
  mutation RemoveBriefItem($itemId: String!) { removeBriefItem(itemId: $itemId) }
`;
export const UPDATE_BRIEF_ITEM_NOTE = `
  mutation UpdateBriefItemNote($itemId: String!, $note: String) {
    updateBriefItemNote(itemId: $itemId, note: $note) { ${ITEM_FIELDS} }
  }
`;
export const REORDER_BRIEF_ITEMS = `
  mutation ReorderBriefItems($briefId: String!, $kind: BriefItemKind!, $itemIds: [String!]!) {
    reorderBriefItems(briefId: $briefId, kind: $kind, itemIds: $itemIds) { ${ITEM_FIELDS} }
  }
`;
export const SEND_BRIEF_TEST = `
  mutation SendBriefTest($id: String!) { sendBriefTest(id: $id) }
`;
export const SEND_BRIEF = `
  mutation SendBrief($id: String!, $recipientListId: String!) {
    sendBrief(id: $id, recipientListId: $recipientListId) { sent failed }
  }
`;
export const CREATE_RECIPIENT_LIST = `
  mutation CreateRecipientList($name: String!) { createRecipientList(name: $name) { ${LIST_FIELDS} } }
`;
export const ADD_RECIPIENT_LIST_MEMBER = `
  mutation AddRecipientListMember($listId: String!, $email: String!) {
    addRecipientListMember(listId: $listId, email: $email) { ${MEMBER_FIELDS} }
  }
`;
export const REMOVE_RECIPIENT_LIST_MEMBER = `
  mutation RemoveRecipientListMember($memberId: String!) { removeRecipientListMember(memberId: $memberId) }
`;

/** Every procedure: signed in and a platform admin. */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isPlatformAdmin(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Briefs are for platform admins" });
  }
  return next();
});

/** One GraphQL call with the caller's session; clear-api errors become tRPC codes. */
async function call<T>(ctx: { headers: Headers }, query: string, variables: Record<string, unknown>): Promise<T> {
  try {
    return await graphqlFetch<T>(query, variables, cookieHeaders(ctx));
  } catch (err) {
    toTrpcError(err);
  }
}

const id = z.string().min(1);
const kind = z.enum(["alert", "event", "signal"]);

export const briefsRouter = createTRPCRouter({
  /** Past Briefs, newest first. */
  list: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).optional(), offset: z.number().int().min(0).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const data = await call<{ briefs: BriefSummary[] }>(ctx, BRIEFS_QUERY, {
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      });
      return data.briefs;
    }),

  /** One Brief with its items and counts, or null. */
  get: adminProcedure.input(z.object({ id })).query(async ({ ctx, input }) => {
    const data = await call<{ brief: Brief | null }>(ctx, BRIEF_QUERY, { id: input.id });
    return data.brief;
  }),

  create: adminProcedure
    .input(
      z.object({
        cadence: z.enum(["daily", "weekly", "monthly"]),
        locationId: id,
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await call<{ createBrief: Brief }>(ctx, CREATE_BRIEF, { input });
      return data.createBrief;
    }),

  /** Title, summary and closing notes of a draft; omitted fields are kept. */
  update: adminProcedure
    .input(
      z.object({
        id,
        title: z.string().optional(),
        summary: z.string().optional(),
        closingNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id: briefId, ...fields } = input;
      const data = await call<{ updateBrief: Omit<Brief, "items" | "counts"> }>(ctx, UPDATE_BRIEF, {
        id: briefId,
        input: fields,
      });
      return data.updateBrief;
    }),

  /** Refresh to now: the window ends now and starts one cadence earlier. */
  refreshWindow: adminProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const data = await call<{ refreshBriefWindow: Brief }>(ctx, REFRESH_BRIEF_WINDOW, { id: input.id });
    return data.refreshBriefWindow;
  }),

  delete: adminProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const data = await call<{ deleteBrief: boolean }>(ctx, DELETE_BRIEF, { id: input.id });
    return data.deleteBrief;
  }),

  /** Pick an Alert, Event or Signal; clear-api builds its snapshot. Idempotent. */
  addItem: adminProcedure
    .input(z.object({ briefId: id, kind, entityId: id }))
    .mutation(async ({ ctx, input }) => {
      const data = await call<{ addBriefItem: BriefItem }>(ctx, ADD_BRIEF_ITEM, input);
      return data.addBriefItem;
    }),

  removeItem: adminProcedure.input(z.object({ itemId: id })).mutation(async ({ ctx, input }) => {
    const data = await call<{ removeBriefItem: boolean }>(ctx, REMOVE_BRIEF_ITEM, input);
    return data.removeBriefItem;
  }),

  /** A blank or null note clears it. */
  updateItemNote: adminProcedure
    .input(z.object({ itemId: id, note: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const data = await call<{ updateBriefItemNote: BriefItem }>(ctx, UPDATE_BRIEF_ITEM_NOTE, input);
      return data.updateBriefItemNote;
    }),

  /** The whole kind group, each item once, in the new order. */
  reorderItems: adminProcedure
    .input(z.object({ briefId: id, kind, itemIds: z.array(id) }))
    .mutation(async ({ ctx, input }) => {
      const data = await call<{ reorderBriefItems: BriefItem[] }>(ctx, REORDER_BRIEF_ITEMS, input);
      return data.reorderBriefItems;
    }),

  /** Emails the Brief to the caller only. False when the provider refused it. */
  sendTest: adminProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const data = await call<{ sendBriefTest: boolean }>(ctx, SEND_BRIEF_TEST, { id: input.id });
    return data.sendBriefTest;
  }),

  /** Freezes the Brief and emails the list; failures are reported, not retried. */
  send: adminProcedure
    .input(z.object({ id, recipientListId: id }))
    .mutation(async ({ ctx, input }) => {
      const data = await call<{ sendBrief: BriefSendResult }>(ctx, SEND_BRIEF, input);
      return data.sendBrief;
    }),

  recipientLists: adminProcedure.query(async ({ ctx }) => {
    const data = await call<{ recipientLists: RecipientList[] }>(ctx, RECIPIENT_LISTS_QUERY, {});
    return data.recipientLists;
  }),

  createRecipientList: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const data = await call<{ createRecipientList: RecipientList }>(ctx, CREATE_RECIPIENT_LIST, input);
      return data.createRecipientList;
    }),

  addRecipientListMember: adminProcedure
    .input(z.object({ listId: id, email: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const data = await call<{ addRecipientListMember: RecipientListMember }>(ctx, ADD_RECIPIENT_LIST_MEMBER, input);
      return data.addRecipientListMember;
    }),

  removeRecipientListMember: adminProcedure
    .input(z.object({ memberId: id }))
    .mutation(async ({ ctx, input }) => {
      const data = await call<{ removeRecipientListMember: boolean }>(ctx, REMOVE_RECIPIENT_LIST_MEMBER, input);
      return data.removeRecipientListMember;
    }),
});
