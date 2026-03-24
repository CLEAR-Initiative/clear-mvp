import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";

// ─── GraphQL Queries ────────────────────────────────────────────────────────

const INVITATION_BY_TOKEN_QUERY = `
  query InvitationByToken($token: String!) {
    invitationByToken(token: $token) {
      id
      email
      organisationName
      teamName
      role
      teamRole
      expiresAt
      status
    }
  }
`;

const PENDING_INVITES_QUERY = `
  query PendingInvites($organisationId: String!) {
    pendingInvites(organisationId: $organisationId) {
      id
      email
      role
      teamRole
      expiresAt
      createdAt
      status
      organisation { id name }
      team { id name }
      invitedBy { id name }
    }
  }
`;

// ─── GraphQL Mutations ──────────────────────────────────────────────────────

const INVITE_USER_MUTATION = `
  mutation InviteUser($input: InviteUserInput!) {
    inviteUser(input: $input) {
      id
      email
      role
      teamRole
      expiresAt
      status
    }
  }
`;

const ACCEPT_INVITE_MUTATION = `
  mutation AcceptInvite($input: AcceptInviteInput!) {
    acceptInvite(input: $input)
  }
`;

const CANCEL_INVITE_MUTATION = `
  mutation CancelInvite($id: String!) {
    cancelInvite(id: $id)
  }
`;

const RESEND_INVITE_MUTATION = `
  mutation ResendInvite($id: String!) {
    resendInvite(id: $id) {
      id
      email
      expiresAt
      status
    }
  }
`;

const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

const RESET_PASSWORD_MUTATION = `
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }
`;

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvitationInfo {
  id: string;
  email: string;
  organisationName: string;
  teamName: string | null;
  role: string;
  teamRole: string | null;
  expiresAt: string;
  status: "pending" | "accepted" | "expired";
}

interface InvitationFull {
  id: string;
  email: string;
  role: string;
  teamRole: string | null;
  expiresAt: string;
  createdAt: string;
  status: string;
  organisation: { id: string; name: string };
  team: { id: string; name: string } | null;
  invitedBy: { id: string; name: string };
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const invitationsRouter = createTRPCRouter({
  /** Look up an invitation by token (public — no auth needed) */
  byToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const data = await graphqlFetch<{ invitationByToken: InvitationInfo | null }>(
        INVITATION_BY_TOKEN_QUERY,
        { token: input.token },
      );
      return data.invitationByToken;
    }),

  /** List pending invitations for an organisation */
  pending: protectedProcedure
    .input(z.object({ organisationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ pendingInvites: InvitationFull[] }>(
        PENDING_INVITES_QUERY,
        { organisationId: input.organisationId },
        cookieHeaders(ctx),
      );
      return data.pendingInvites;
    }),

  /** Invite a user to an org (+ optional team) */
  invite: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        organisationId: z.string(),
        teamId: z.string().optional(),
        role: z.string().optional(),
        teamRole: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ inviteUser: InvitationInfo }>(
        INVITE_USER_MUTATION,
        { input },
        cookieHeaders(ctx),
      );
      return data.inviteUser;
    }),

  /** Accept an invitation (public — no auth needed) */
  accept: publicProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ input }) => {
      const data = await graphqlFetch<{ acceptInvite: boolean }>(
        ACCEPT_INVITE_MUTATION,
        { input },
      );
      return data.acceptInvite;
    }),

  /** Cancel a pending invitation */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ cancelInvite: boolean }>(
        CANCEL_INVITE_MUTATION,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.cancelInvite;
    }),

  /** Resend an invitation email */
  resend: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{ resendInvite: InvitationInfo }>(
        RESEND_INVITE_MUTATION,
        { id: input.id },
        cookieHeaders(ctx),
      );
      return data.resendInvite;
    }),

  /** Request a password reset email (public) */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const data = await graphqlFetch<{ requestPasswordReset: boolean }>(
        REQUEST_PASSWORD_RESET_MUTATION,
        { email: input.email },
      );
      return data.requestPasswordReset;
    }),

  /** Reset password with token (public) */
  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const data = await graphqlFetch<{ resetPassword: boolean }>(
        RESET_PASSWORD_MUTATION,
        { token: input.token, newPassword: input.newPassword },
      );
      return data.resetPassword;
    }),
});
