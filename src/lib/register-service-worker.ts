import { reportHandledError } from "~/lib/report-handled-error";

/**
 * The part of workbox-window's `Workbox` we use. next-pwa builds one in its
 * injected entry and leaves it on `window.workbox`.
 */
export interface ServiceWorkerRegistrar {
  register(): Promise<unknown>;
}

/**
 * Registration failures that come from the browser or the page, not from us.
 *
 * - `SecurityError` "The document is in an invalid state": Chromium refuses
 *   registration from a document that cannot use service workers. In GlitchTip
 *   every one came from a headless link scanner opening an invite or alert
 *   email link (timezone UTC, no breadcrumbs, a Firefox or iOS user agent
 *   reporting a Chromium-only message). Private windows and blocked site
 *   data fail the same way.
 * - `InvalidStateError` / `AbortError`: the page was unloaded or navigated
 *   away while registration was in flight.
 * - A network failure fetching `sw.js` ("An unknown error occurred when
 *   fetching the script"): the connection dropped, or the page went away.
 *   The service worker is a cache. Without it the app still works online.
 *
 * A bad HTTP status for `sw.js` (404 after a deploy) or a script that throws
 * while installing is ours, so it is not listed here.
 */
export function isBenignRegistrationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (["SecurityError", "InvalidStateError", "AbortError"].includes(error.name)) {
    return true;
  }
  if (error.name === "TypeError") {
    return /unknown error occurred when fetching the script|network error|NetworkError|^Load failed$/i.test(
      error.message,
    );
  }
  return false;
}

/**
 * Register the PWA service worker and handle a failure.
 *
 * next-pwa's own auto-register calls `window.workbox.register()` without a
 * `catch`, so every failure became an unhandled rejection in Sentry. We turn
 * that off (`register: false` in next.config.js) and call it here instead.
 */
export async function registerServiceWorker(
  workbox: ServiceWorkerRegistrar | undefined,
  report: typeof reportHandledError = reportHandledError,
): Promise<void> {
  if (!workbox) return;
  try {
    await workbox.register();
  } catch (error) {
    if (isBenignRegistrationError(error)) {
      console.warn("[pwa] service worker not registered:", error);
      return;
    }
    report(error, { feature: "pwa", stage: "register" });
  }
}
