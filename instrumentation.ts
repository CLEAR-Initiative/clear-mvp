// Next.js instrumentation hook — runs once on server startup.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Routes to the right Sentry init based on runtime so server/edge are both
// covered with one entry point.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Re-export the request-error capture hook so unhandled errors in server
// components / API routes get auto-reported to Sentry. Required by
// @sentry/nextjs to wire into Next 15's onRequestError lifecycle.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
