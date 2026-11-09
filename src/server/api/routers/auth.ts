import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import { API_URL } from "~/server/env";
import { locales } from "~/i18n/config";

const BetterAuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: z.string(),
  isActive: z.boolean(),
  /**
   * User's default team, used by mutations that need a team scope
   * without an explicit picker in the UI (e.g. the /observe field-
   * officer form). Sourced from Better Auth's `additionalFields`
   * config in clear-api (`user.defaultTeamId`). Nullable because a
   * newly-created user isn't yet a member of any team.
   */
  defaultTeamId: z.string().nullish(),
  organisations: z.array(z.object({
    id: z.string(),
    organisationId: z.string(),
    role: z.string(),
  })).optional(),
  teamMemberships: z.array(z.object({
    id: z.string(),
    role: z.string(),
  })).optional(),
});

const SessionResponseSchema = z.object({
  session: z
    .object({
      id: z.string(),
      userId: z.string(),
      expiresAt: z.string(),
    })
    .nullable(),
  user: BetterAuthUserSchema.nullable(),
});

const SESSION_TIMEOUT_MS = 5000;

/* ─── GraphQL mutations ─── */

const REQUEST_EMAIL_VERIFICATION = `
  mutation RequestEmailVerification {
    requestEmailVerification
  }
`;

const VERIFY_EMAIL = `
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`;

const UPDATE_PROFILE = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      enableEmailNotification
      enableSMSNotification
    }
  }
`;

const SET_ANALYTICS_OPT_OUT = `
  mutation SetAnalyticsOptOut($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      analyticsOptOut
    }
  }
`;

export const UPDATE_USER_ROLE = `
  mutation UpdateUserRole($userId: String!, $role: GlobalRole!) {
    updateUserRole(userId: $userId, role: $role) {
      id
      role
    }
  }
`;

export const APPROVE_USER = `
  mutation ApproveUser($userId: String!) {
    approveUser(userId: $userId) {
      user { id role isActive }
      crmMoved
      crmWarnings
    }
  }
`;

const GET_USER_DETAILS = `
  query GetUserDetails {
    me {
      enableEmailNotification
      phoneNumber
      language
    }
  }
`;

// Better Auth's `get-session` only returns the user's own columns + the
// additionalFields (role, isActive, defaultTeamId, language) — NOT the
// teamMembers relation. We fetch team memberships separately so the client
// can tell whether the signed-in user is an emergency_response_manager (the
// inbox nav + gating read `me.teamMemberships[].role`).
const ME_TEAM_MEMBERSHIPS = `
  query MeTeamMemberships {
    me {
      analyticsOptOut
      teamMemberships {
        id
        role
      }
    }
  }
`;

export const RECORD_ONBOARDING_COMPLETED = `
  mutation RecordOnboardingCompleted {
    recordOnboardingCompleted
  }
`;

export const authRouter = createTRPCRouter({
  me: publicProcedure.query(async ({ ctx }) => {
    try {
      const cookie = ctx.headers.get("cookie") ?? "";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(`${API_URL}/api/auth/get-session`, {
          headers: { Cookie: cookie },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) return { authenticated: false, user: null };

      const raw: unknown = await res.json();

      // Apollo API returns null for unauthenticated requests
      if (raw === null) return { authenticated: false, user: null };

      const parsed = SessionResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.error("Invalid session response shape:", parsed.error.message);
        return { authenticated: false, user: null };
      }

      const data = parsed.data;
      if (!data.session || !data.user)
        return { authenticated: false, user: null };

      // get-session doesn't carry the teamMembers relation, so an ERM's
      // membership is invisible to the client without this. Bounded by its own
      // timeout — the session timer above is already cleared, and a stalled
      // lookup must never hold back the confirmed user (that would strand even
      // admins on the inbox loading screen). Non-fatal: on timeout or error
      // the user just isn't treated as an ERM this cycle.
      let teamMemberships = data.user.teamMemberships;
      // Account-wide usage-analytics opt-out. Stays null when the lookup
      // fails, which the tracker gate treats as "unknown — don't load".
      let analyticsOptOut: boolean | null = null;
      const tmController = new AbortController();
      const tmTimer = setTimeout(() => tmController.abort(), SESSION_TIMEOUT_MS);
      try {
        const tm = await graphqlFetch<{
          me: {
            analyticsOptOut: boolean | null;
            teamMemberships: { id: string; role: string }[];
          } | null;
        }>(ME_TEAM_MEMBERSHIPS, undefined, { Cookie: cookie }, tmController.signal);
        teamMemberships = tm.me?.teamMemberships ?? [];
        analyticsOptOut = tm.me?.analyticsOptOut ?? null;
      } catch (err) {
        console.error("Failed to load team memberships for me:", err);
      } finally {
        clearTimeout(tmTimer);
      }

      return { authenticated: true, user: { ...data.user, teamMemberships, analyticsOptOut } };
    } catch (err) {
      console.error("Auth session check failed:", err);
      return { authenticated: false, user: null };
    }
  }),

  requestEmailVerification: publicProcedure.mutation(async ({ ctx }) => {
    const cookie = ctx.headers.get("cookie") ?? "";
    await graphqlFetch<{ requestEmailVerification: boolean }>(
      REQUEST_EMAIL_VERIFICATION,
      undefined,
      { Cookie: cookie },
    );
    return { success: true };
  }),

  verifyEmailToken: publicProcedure
    .input(z.object({ token: z.string().min(1, "Token is required") }))
    .mutation(async ({ input }) => {
      const result = await graphqlFetch<{ verifyEmail: boolean }>(VERIFY_EMAIL, {
        token: input.token,
      });
      return { success: true, already_verified: !result.verifyEmail };
    }),

  /**
   * Records `user.onboarding_completed` in clear-api's activity log.
   * Best-effort: a failure (or an older clear-api) only loses the log entry.
   */
  recordOnboardingCompleted: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const data = await graphqlFetch<{ recordOnboardingCompleted: boolean }>(
        RECORD_ONBOARDING_COMPLETED,
        undefined,
        cookieHeaders(ctx),
      );
      return data.recordOnboardingCompleted === true;
    } catch (err) {
      console.error("recordOnboardingCompleted failed:", err);
      return false;
    }
  }),

  myUserDetails: protectedProcedure.query(async ({ ctx }) => {
    const data = await graphqlFetch<{
      me: {
        enableEmailNotification: boolean;
        phoneNumber: string | null;
        language: string;
      } | null;
    }>(GET_USER_DETAILS, undefined, cookieHeaders(ctx));
    return {
      emailEnabled: data.me?.enableEmailNotification ?? false,
      phoneNumber: data.me?.phoneNumber ?? null,
      language: data.me?.language ?? "en",
    };
  }),

  updateNotificationPrefs: protectedProcedure
    .input(
      z.object({
        enableEmailNotification: z.boolean().optional(),
        enableSMSNotification: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        updateProfile: {
          id: string;
          enableEmailNotification: boolean;
          enableSMSNotification: boolean;
        };
      }>(UPDATE_PROFILE, { input }, cookieHeaders(ctx));
      return data.updateProfile;
    }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phoneNumber: z.string().optional(),
        image: z.string().optional(),
        language: z.enum(locales).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        updateProfile: { id: string; name: string };
      }>(UPDATE_PROFILE, { input }, cookieHeaders(ctx));
      return data.updateProfile;
    }),

  /** Account-wide usage-analytics opt-out (clear-api `User.analyticsOptOut`). */
  setAnalyticsOptOut: protectedProcedure
    .input(z.object({ optedOut: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        updateProfile: { id: string; analyticsOptOut: boolean | null };
      }>(SET_ANALYTICS_OPT_OUT, { input: { analyticsOptOut: input.optedOut } }, cookieHeaders(ctx));
      return { optedOut: data.updateProfile.analyticsOptOut ?? input.optedOut };
    }),

  // Admin-only on the clear-api side. We forward both Cookie and Authorization
  // headers so the same endpoint works for browser admins (Better Auth session)
  // and for scripts calling with a personal API key (`Authorization: Bearer
  // sk_live_…`). clear-api resolves whichever credential is present and runs
  // its own `requireRole(["admin"])` gate; field-level PII resolvers
  // (email/phoneNumber/role/isActive) then surface real values via the
  // `context.user.role === "admin"` branch in canSeeUserPii.
  listUsers: publicProcedure.query(async ({ ctx }) => {
    try {
      const data = await graphqlFetch<{ users: z.infer<typeof BetterAuthUserSchema>[] }>(
        `{ users { id email name role isActive emailVerified image organisations { id organisationId role } teamMemberships { id role } } }`,
        undefined,
        cookieHeaders(ctx),
      );
      return { users: data.users ?? [], error: null as string | null };
    } catch {
      return { users: [] as z.infer<typeof BetterAuthUserSchema>[], error: "Failed to fetch users" as string | null };
    }
  }),

  listOrganisations: publicProcedure.query(async ({ ctx }) => {
    try {
      const data = await graphqlFetch<{
        myOrganisations: Array<{
          id: string;
          name: string;
          slug: string;
          teams: Array<{ id: string; name: string; members: Array<{ id: string }> }>;
        }>;
      }>(
        `{ myOrganisations { id name slug teams { id name members { id } } } }`,
        undefined,
        cookieHeaders(ctx),
      );
      return { organisations: data.myOrganisations ?? [], error: null as string | null };
    } catch {
      return {
        organisations: [] as Array<{
          id: string; name: string; slug: string;
          teams: Array<{ id: string; name: string; members: Array<{ id: string }> }>;
        }>,
        error: "Failed to fetch organisations" as string | null,
      };
    }
  }),

  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["member", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        updateUserRole: { id: string; role: string };
      }>(UPDATE_USER_ROLE, input, cookieHeaders(ctx));
      return data.updateUserRole;
    }),

  approveUser: protectedProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const data = await graphqlFetch<{
        approveUser: {
          user: { id: string; role: string | null; isActive: boolean | null };
          crmMoved: boolean;
          crmWarnings: string[];
        };
      }>(APPROVE_USER, input, cookieHeaders(ctx));
      return data.approveUser;
    }),
});
