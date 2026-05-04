import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch, cookieHeaders } from "~/server/api/graphql";
import { API_URL, GRAPHQL_API_KEY } from "~/server/env";

const BetterAuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: z.string(),
  isActive: z.boolean(),
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

const MY_NOTIFICATION_PREFS = `
  query {
    me {
      enableEmailNotification
    }
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
      return { authenticated: true, user: data.user };
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

  myNotificationPrefs: publicProcedure.query(async ({ ctx }) => {
    const cookie = ctx.headers.get("cookie") ?? "";
    const data = await graphqlFetch<{ me: { enableEmailNotification: boolean } | null }>(
      MY_NOTIFICATION_PREFS,
      undefined,
      { Cookie: cookie },
    );
    return {
      emailEnabled: data.me?.enableEmailNotification ?? false,
    };
  }),

  updateNotificationPrefs: publicProcedure
    .input(
      z.object({
        enableEmailNotification: z.boolean().optional(),
        enableSMSNotification: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cookie = ctx.headers.get("cookie") ?? "";
      const data = await graphqlFetch<{
        updateProfile: {
          id: string;
          enableEmailNotification: boolean;
          enableSMSNotification: boolean;
        };
      }>(UPDATE_PROFILE, { input }, { Cookie: cookie });
      return data.updateProfile;
    }),

  updateProfile: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phoneNumber: z.string().optional(),
        image: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cookie = ctx.headers.get("cookie") ?? "";
      const data = await graphqlFetch<{
        updateProfile: {
          id: string;
          name: string;
        };
      }>(UPDATE_PROFILE, { input }, { Cookie: cookie });
      return data.updateProfile;
    }),

  listUsers: publicProcedure.query(async () => {
    try {
      const data = await graphqlFetch<{ users: z.infer<typeof BetterAuthUserSchema>[] }>(
        `{ users { id email name role isActive emailVerified image organisations { id organisationId role } teamMemberships { id role } } }`,
        undefined,
        { "x-api-key": GRAPHQL_API_KEY },
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
});
