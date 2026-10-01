// Next.js instrumentation hook — runs once on server startup.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Routes to the right Sentry init based on runtime so server/edge are both
// covered with one entry point.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    // Refuse to start with a CLEAR Agent model that has no price: the
    // daily Agent budget would silently stop counting.
    const { assertClearAgentModelPriced } = await import("./src/server/agent/pricing");
    assertClearAgentModelPriced();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Re-export the request-error capture hook so unhandled errors in server
// components / API routes get auto-reported to Sentry. Required by
// @sentry/nextjs to wire into Next 15's onRequestError lifecycle.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
