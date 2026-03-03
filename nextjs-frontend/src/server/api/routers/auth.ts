import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:4000";

interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  isActive: boolean;
}

interface SessionResponse {
  session: { id: string; userId: string; expiresAt: string } | null;
  user: BetterAuthUser | null;
}

export const authRouter = createTRPCRouter({
  me: publicProcedure.query(async ({ ctx }) => {
    try {
      const cookie = ctx.headers.get("cookie") ?? "";
      const res = await fetch(`${AUTH_API_URL}/api/auth/get-session`, {
        headers: { Cookie: cookie },
      });
      if (!res.ok) return { authenticated: false, user: null };
      const data = (await res.json()) as SessionResponse;
      if (!data.session || !data.user) return { authenticated: false, user: null };
      return { authenticated: true, user: data.user };
    } catch {
      return { authenticated: false, user: null };
    }
  }),
});
