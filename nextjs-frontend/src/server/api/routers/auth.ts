import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_AUTH_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_AUTH_URL environment variable. This is required in production."
  );
}

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
  me: publicProcedure.query(async ({ ctx }) => {
    try {
      const cookie = ctx.headers.get("cookie") ?? "";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(`${AUTH_API_URL}/api/auth/get-session`, {
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
      if (!data.session || !data.user) return { authenticated: false, user: null };
      return { authenticated: true, user: data.user };
    } catch (err) {
      console.error("Auth session check failed:", err);
      return { authenticated: false, user: null };
    }
  }),
});
