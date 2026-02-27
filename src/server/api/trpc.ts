/**
 * tRPC server setup for CLEAR frontend.
 * Procedures proxy to the Django backend API.
 */

import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

const DJANGO_API_URL =
  process.env.DJANGO_API_URL ?? "http://localhost:8000";

/**
 * Context available in all tRPC procedures.
 * Includes the Django API base URL and request headers.
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    djangoApiUrl: DJANGO_API_URL,
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
