import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphqlFetch } from "~/server/api/graphql";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const BetterAuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  role: z.string(),
  isActive: z.boolean(),
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
    const GRAPHQL_API_KEY = process.env.GRAPHQL_API_KEY ?? "";
    try {
      const data = await graphqlFetch<{ users: z.infer<typeof BetterAuthUserSchema>[] }>(
        `{ users { id email name role isActive emailVerified image } }`,
        undefined,
        { "x-api-key": GRAPHQL_API_KEY },
      );
      return { users: data.users ?? [], error: null as string | null };
    } catch {
      return { users: [] as z.infer<typeof BetterAuthUserSchema>[], error: "Failed to fetch users" as string | null };
    }
  }),
});
