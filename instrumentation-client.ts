// Sentry init for the browser (client components, browser-side bundle).
// Next.js 15.4+ auto-loads this file on the client; older patterns used
// sentry.client.config.ts in the same role.
//
// IMPORTANT: NEXT_PUBLIC_SENTRY_DSN is inlined into the client bundle at
// BUILD time. Runtime env_file doesn't reach client code — the DSN must be
// passed via `docker build --build-arg NEXT_PUBLIC_SENTRY_DSN=...` (handled
// in the CI workflow + clear-mvp/Dockerfile).

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? "development",
  tracesSampleRate: 0.2,

  // Capture browser session replays at low rate for hard-to-reproduce bugs.
  // 0 means off entirely; uncomment if you want it.
  // replaysSessionSampleRate: 0,
  // replaysOnErrorSampleRate: 0,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

// Capture errors from React's error boundary chain on the client side.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
