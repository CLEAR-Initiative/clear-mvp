/**
 * tRPC server setup for CLEAR frontend.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { API_URL } from "~/server/env";
import { isPlatformAdmin } from "~/lib/roles";

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
 * Platform-admin procedure — requires the global `admin` role.
 *
 * Previously this middleware also accepted `role === "org_admin"`, treating
 * `org_admin` as a *global* role — but under the new taxonomy `org_admin` is
 * an organisation-level role (in `organisationUsers.role`), not a global one.
 * Actions that require org-scoped admin authority (invite user, change
 * member role) look up membership in the resolver via `requireOrgAdmin`;
 * the only remaining caller of this procedure is `createOrganisation`,
 * which correctly needs platform-level authority.
 *
 * Name kept for now to minimise call-site churn; will rename alongside the
 * global `admin` → `superadmin` rename in a follow-up.
 */
const enforceOrgAdmin = t.middleware(async ({ ctx, next }) => {
  const user = (ctx as { user?: SessionUser }).user;
  if (!user || !isPlatformAdmin(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You need platform admin privileges for this action",
    });
  }
  return next({ ctx });
});

export const orgAdminProcedure = t.procedure.use(enforceAuth).use(enforceOrgAdmin);
