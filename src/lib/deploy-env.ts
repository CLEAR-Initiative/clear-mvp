/**
 * Which deployment a build is for — the switch for dev-only tools (USGS spike,
 * Observe QA overrides).
 *
 * clear-mvp ships as one Docker image per environment
 * (`.github/actions/build-image`), built with `NEXT_PUBLIC_SENTRY_ENV` set to
 * `dev` (dev.clearinitiative.io) or `prod` (app.clearinitiative.io). Next.js
 * inlines it into client and server bundles at build time. Images built by
 * hand or for the e2e stack keep the Dockerfile default `development`, so they
 * behave like prod. Every image runs with `NODE_ENV=production`, so NODE_ENV
 * alone only identifies local `next dev`.
 */

export const DEV_DEPLOY_ENV = "dev";

export type DeployEnvInput = {
  nodeEnv?: string;
  deployEnv?: string;
};

/** `next dev`, or an image built for the dev deploy. Never true for prod. */
export function isDevToolingAllowed(
  env: DeployEnvInput = {
    nodeEnv: process.env.NODE_ENV,
    deployEnv: process.env.NEXT_PUBLIC_SENTRY_ENV,
  },
): boolean {
  if (env.nodeEnv === "development") return true;
  return env.deployEnv === DEV_DEPLOY_ENV;
}
