// Sentry init for the Edge runtime (middleware.ts, edge API routes).
// Loaded by instrumentation.ts when NEXT_RUNTIME === "edge".
// Even if you don't currently use edge runtime, this prevents a startup
// warning when Next.js auto-loads the instrumentation hook.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENV ?? "development",
  tracesSampleRate: 0.2,
  enabled: !!process.env.SENTRY_DSN,
});
