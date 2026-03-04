import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch, extractCookieHeader } from "~/server/api/django";

interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  email_verified?: boolean;
  email_notifications_enabled?: boolean;
  sms_notifications_enabled?: boolean;
  mobile_number?: string;
  preferred_language?: string;
  timezone?: string;
}

interface LoginResponse {
  success: boolean;
  user?: DjangoUser;
  error?: string;
}

interface MeResponse {
  authenticated: boolean;
  user?: DjangoUser;
}

interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

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

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return djangoFetch<LoginResponse>("/users/api/auth/login/", {
        method: "POST",
        headers: extractCookieHeader(ctx.headers),
        body: JSON.stringify(input),
      });
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    return djangoFetch<{ success: boolean }>("/users/api/auth/logout/", {
      method: "POST",
      headers: extractCookieHeader(ctx.headers),
    });
  }),

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

  changePassword: publicProcedure
    .input(
      z.object({
        old_password: z.string().min(1, "Current password is required"),
        new_password: z
          .string()
          .min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return djangoFetch<ChangePasswordResponse>(
        "/users/api/auth/change-password/",
        {
          method: "POST",
          headers: extractCookieHeader(ctx.headers),
          body: JSON.stringify(input),
        },
      );
    }),

  requestEmailVerification: publicProcedure.mutation(async ({ ctx }) => {
    return djangoFetch<{ success: boolean; message?: string; error?: string }>(
      "/users/api/auth/request-verification/",
      {
        method: "POST",
        headers: extractCookieHeader(ctx.headers),
      },
    );
  }),

  verifyEmailToken: publicProcedure
    .input(z.object({ token: z.string().min(1, "Token is required") }))
    .mutation(async ({ ctx, input }) => {
      return djangoFetch<{
        success: boolean;
        message?: string;
        error?: string;
        already_verified?: boolean;
      }>("/users/api/auth/verify-email/", {
        method: "POST",
        headers: extractCookieHeader(ctx.headers),
        body: JSON.stringify({ token: input.token }),
      });
    }),
});
