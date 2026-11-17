import * as Sentry from "@sentry/nextjs";

/**
 * Report an error we caught and turned into an error state on screen.
 *
 * Sentry only sees what throws past us. Once a `catch` sets state and renders
 * "something went wrong", the failure is gone unless it is reported here.
 * Call this from every such catch.
 *
 * `feature` and `stage` become tags, so one GlitchTip issue groups one kind of
 * failure: `map` / `script` and `map` / `webgl` are different problems with
 * different fixes.
 */
export function reportHandledError(
  error: unknown,
  context: { feature: string; stage: string; extra?: Record<string, unknown> },
): void {
  const { feature, stage, extra } = context;
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, {
    level: "error",
    tags: { feature, stage, handled: "true" },
    extra: {
      online: typeof navigator === "undefined" ? undefined : navigator.onLine,
      ...extra,
    },
    fingerprint: ["handled-error", feature, stage],
  });
}
