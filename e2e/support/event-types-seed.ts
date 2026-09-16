// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-event-types-seed.ts), where "./src/lib/prisma.js"
// resolves against clear-api's source tree. It is never imported by the
// clear-mvp app or its tests, so clear-mvp's tsc must not try to resolve
// clear-api's modules here.
/**
 * Event-type fixture for the filter spec (case 6).
 *
 * clear-api's prisma/seed.ts gives its 4 events plain type slugs
 * ("conflict", "flood", ...). Production events carry GLIDE codes ("ba",
 * "fl", ...) — that is what the pipeline writes, what src/lib/disaster-types.ts
 * keys pill labels on, and what the Detection type filter sends (the
 * DisasterTypePicker expands a hierarchy selection to GLIDE codes). With the
 * slugs, any type filter matches nothing, so this rewrites the seeded events'
 * types to real codes that exist in the seeded disaster_types table.
 *
 * Runs INSIDE the clear-api seed image (docker-compose.e2e.yml service
 * `seed-event-types`), after `seed`. Idempotent: it sets types by title, so
 * re-running against a kept-up stack is safe.
 *
 * Titles mirror SEEDED_EVENTS in e2e/support/data.ts.
 */

import { prisma } from "./src/lib/prisma.js";

const TYPES_BY_TITLE: Record<string, string[]> = {
  "North Darfur Conflict Escalation": ["ba"], // battles → "conflict and violence"
  "South Darfur Displacement Crisis": ["ce"], // complex emergency
  "Khartoum Flood Emergency": ["fl"], // flood
  "North Darfur Food Security Emergency": ["fa"], // famine
};

async function main() {
  for (const [title, types] of Object.entries(TYPES_BY_TITLE)) {
    const { count } = await prisma.events.updateMany({ where: { title }, data: { types } });
    if (count === 0) {
      throw new Error(`no seeded event titled "${title}" — did clear-api's seed change?`);
    }
    console.log(`[event-types-seed] ${title} → ${JSON.stringify(types)}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[event-types-seed] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
