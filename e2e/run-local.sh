#!/usr/bin/env bash
#
# Local one-command E2E: bring up the hermetic stack, seed it, run the Playwright
# smoke suite, then tear everything down. Wired to `bun run e2e`.
#
# Pass extra args straight to Playwright, e.g.:
#   bun run e2e -- e2e/tests/08-login-logout.spec.ts
#   bun run e2e -- --headed
#
# For a faster inner loop, keep the stack up across runs instead:
#   bun run e2e:up && bun run e2e:seed     # once
#   bun run test:e2e -- e2e/tests/04-comment.spec.ts   # repeat
#   bun run e2e:down                        # when done
set -euo pipefail

cd "$(dirname "$0")/.."   # repo root

COMPOSE=(docker compose -f docker-compose.e2e.yml)

cleanup() {
  echo "── tearing down stack ──"
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "── ensuring Playwright Chromium is installed ──"
bunx playwright install chromium >/dev/null

echo "── building + starting db, redis, api, web (first run builds images) ──"
"${COMPOSE[@]}" up -d --build --wait db redis api web

echo "── seeding database (prisma/seed.ts) ──"
"${COMPOSE[@]}" run --rm seed

echo "── running Playwright smoke suite ──"
bunx playwright test "$@"
