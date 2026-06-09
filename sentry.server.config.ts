// Sentry init for Node.js runtime (API routes, server components, RSC).
// Loaded by instrumentation.ts when NEXT_RUNTIME === "nodejs".

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENV ?? "development",

  // Sample rates — tune down in prod if event volume gets noisy.
  // 0.2 = 20% of transactions sent. Errors are always sent regardless.
  tracesSampleRate: 0.2,

  // Skip the SDK entirely if no DSN — avoids overhead on local dev where
  // the env var is empty.
  enabled: !!process.env.SENTRY_DSN,
});
