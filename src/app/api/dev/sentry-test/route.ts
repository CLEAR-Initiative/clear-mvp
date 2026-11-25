import { NextResponse } from "next/server";
import { isDevToolingAllowed } from "~/lib/deploy-env";

/**
 * Throws on purpose, to check that server errors reach GlitchTip.
 *
 * `next dev` and the dev deploy only; the prod deploy answers 404. The error is
 * not caught here, so it takes the same path as any unhandled route error:
 * Next.js `onRequestError` (src/instrumentation.ts) → Sentry → GlitchTip.
 *
 *   curl -i https://dev.clearinitiative.io/api/dev/sentry-test
 *
 * Expect a 500, then an issue named `SentryServerTest` in the clear-mvp
 * project with the `release` tag of the running deploy.
 */

export const dynamic = "force-dynamic";

class SentryServerTest extends Error {
  override name = "SentryServerTest";
}

export function GET() {
  if (!isDevToolingAllowed()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  throw new SentryServerTest("Deliberate server error to check GlitchTip reporting");
}
