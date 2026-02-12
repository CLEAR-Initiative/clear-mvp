import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { djangoFetch } from "~/server/api/django";

interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  email_verified?: boolean;
  email_notifications_enabled?: boolean;
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

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ input }) => {
      return djangoFetch<LoginResponse>("/users/api/auth/login/", {
        method: "POST",
        body: JSON.stringify(input),
      });
    }),

  logout: publicProcedure.mutation(async () => {
    return djangoFetch<{ success: boolean }>("/users/api/auth/logout/", {
      method: "POST",
    });
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    const cookie = ctx.headers.get("cookie") ?? "";
    try {
      return await djangoFetch<MeResponse>("/users/api/auth/me/", {
        headers: { Cookie: cookie },
      });
    } catch {
      return { authenticated: false } as MeResponse;
    }
  }),

  changePassword: publicProcedure
    .input(
      z.object({
        old_password: z.string().min(1, "Current password is required"),
        new_password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cookie = ctx.headers.get("cookie") ?? "";
      return djangoFetch<ChangePasswordResponse>(
        "/users/api/auth/change-password/",
        {
          method: "POST",
          headers: { Cookie: cookie },
          body: JSON.stringify(input),
        },
      );
    }),
});
