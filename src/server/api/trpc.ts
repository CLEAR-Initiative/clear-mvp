/**
 * tRPC server setup for CLEAR frontend.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { API_URL } from "~/server/env";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Context available in all tRPC procedures.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

/**
 * Public procedure — no auth required.
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure — validates session against the auth backend.
 * Adds `user` and `session` to the context.
 */
const enforceAuth = t.middleware(async ({ ctx, next }) => {
  const cookie = ctx.headers.get("cookie") ?? "";
  if (!cookie) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { Cookie: cookie },
    });
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Auth service unavailable",
    });
  }

  if (!res.ok) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid session" });
  }

  const data = (await res.json()) as {
    session?: { id: string; userId: string; expiresAt: string } | null;
    user?: SessionUser | null;
  } | null;

  if (!data?.session || !data?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  return next({ ctx: { ...ctx, user: data.user, session: data.session } });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

/**
 * Org-admin procedure — requires admin or org_admin role.
 * Use for actions like creating organisations.
 */
const enforceOrgAdmin = t.middleware(async ({ ctx, next }) => {
  const user = (ctx as { user?: SessionUser }).user;
  if (!user || (user.role !== "admin" && user.role !== "org_admin")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You need Organisation Admin privileges for this action",
    });
  }
  return next({ ctx });
});

export const orgAdminProcedure = t.procedure.use(enforceAuth).use(enforceOrgAdmin);
