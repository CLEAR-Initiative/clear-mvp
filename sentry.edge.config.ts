// Sentry init for the Edge runtime (middleware.ts, edge API routes).
// Loaded by src/instrumentation.ts when NEXT_RUNTIME === "edge".
// Even if you don't currently use edge runtime, this prevents a startup
// warning when Next.js auto-loads the instrumentation hook.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENV ?? "development",
  // Which deploy this is (clear-mvp@MAJOR.MINOR.PATCH), inlined at build time.
  // GlitchTip then shows the release an error first appeared in.
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
  tracesSampleRate: 0.2,
  enabled: !!process.env.SENTRY_DSN,
});
