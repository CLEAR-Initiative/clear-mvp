// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-impact-prior-seed.ts), where "./src/lib/prisma.js"
// resolves against clear-api's source tree. It is never imported by the
// clear-mvp app or its tests, so clear-mvp's tsc must not try to resolve
// clear-api's modules here.
/**
 * Proposed ImpactPrior fixture for the review spec (case 17, clear-api
 * ADR-0010 V2).
 *
 * No Worker runs in the hermetic stack, so nothing would ever propose an
 * ImpactPrior; this writes what a Worker's `completeTask` would have: one
 * COMPLETED `event.impact_prior` Task per target Event, requested by the
 * seeded analyst, and one `proposed` ImpactPrior on it with a one-case
 * basis. Two Events, one per door the spec decides through (the Inbox, the
 * Event page). The hazard is the Event's first GLIDE code (so run after
 * `seed-event-types`) and the country is the level-0 ancestor of the
 * Event's location, as clear-api validates on a real completion.
 *
 * Runs INSIDE the clear-api seed image (docker-compose.e2e.yml service
 * `seed-impact-prior`), after `seed` and `seed-event-types`. Idempotent:
 * the fixture rows are tagged (`methodVersion`, the Task's payload) and
 * deleted before being recreated, so re-running against a kept-up stack
 * resets both priors to `proposed`.
 *
 * Titles mirror SEEDED_EVENTS / IMPACT_PRIORS in e2e/support/data.ts.
 */

import { prisma } from "./src/lib/prisma.js";

const METHOD_VERSION = "e2e-impact-prior-seed@1";
const REQUESTER_EMAIL = "analyst@clear.dev";

/** Event title → the synthetic case the basis cites. */
const FIXTURES: Record<string, { quote: string; occurredAt: string; locationLabel: string }> = {
  "North Darfur Food Security Emergency": {
    quote: "Synthetic prior case: acute food insecurity reported across North Darfur localities.",
    occurredAt: "2024-06-01T00:00:00Z",
    locationLabel: "North Darfur",
  },
  "Khartoum Flood Emergency": {
    quote: "Synthetic prior case: seasonal Nile flooding displaced households in Khartoum State.",
    occurredAt: "2022-08-15T00:00:00Z",
    locationLabel: "Khartoum",
  },
};

async function countryFor(locationId: string | null): Promise<string> {
  if (locationId) {
    const location = await prisma.locations.findUnique({
      where: { id: locationId },
      select: { id: true, level: true, ancestorIds: true },
    });
    if (location?.level === 0) return location.id;
    if (location && location.ancestorIds.length > 0) {
      const country = await prisma.locations.findFirst({
        where: { id: { in: location.ancestorIds }, level: 0 },
        select: { id: true },
      });
      if (country) return country.id;
    }
  }
  const sudan = await prisma.locations.findFirst({ where: { level: 0, name: "Sudan" }, select: { id: true } });
  if (!sudan) throw new Error("no level-0 Sudan location — did clear-api's seed change?");
  return sudan.id;
}

async function main() {
  const requester = await prisma.user.findUnique({ where: { email: REQUESTER_EMAIL }, select: { id: true } });
  if (!requester) throw new Error(`no seeded user ${REQUESTER_EMAIL} — did clear-api's seed change?`);

  // Reset: priors first (they reference the Tasks), then the fixture Tasks.
  const removedPriors = await prisma.impactPrior.deleteMany({ where: { methodVersion: METHOD_VERSION } });
  const removedTasks = await prisma.task.deleteMany({
    where: { kind: "event.impact_prior", payload: { path: ["e2eFixture"], equals: true } },
  });
  console.log(`[impact-prior-seed] reset ${removedPriors.count} priors, ${removedTasks.count} tasks`);

  for (const [title, fixture] of Object.entries(FIXTURES)) {
    const event = await prisma.events.findFirst({
      where: { title },
      select: { id: true, types: true, locationId: true },
    });
    if (!event) throw new Error(`no seeded event titled "${title}" — did clear-api's seed change?`);
    const hazardType = event.types[0];
    if (!hazardType) throw new Error(`event "${title}" has no types — run seed-event-types first`);
    const countryLocationId = await countryFor(event.locationId);
    const completedAt = new Date();

    const task = await prisma.task.create({
      data: {
        kind: "event.impact_prior",
        subjectType: "event",
        subjectId: event.id,
        payload: { horizonYears: 10, e2eFixture: true },
        status: "COMPLETED",
        origin: "user",
        requesterId: requester.id,
        attempts: 1,
        outcome: "produced",
        result: { e2eFixture: true, cases: 1 },
        model: "e2e-fixture",
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        completedAt,
      },
    });
    const prior = await prisma.impactPrior.create({
      data: {
        eventId: event.id,
        taskId: task.id,
        state: "proposed",
        hazardType,
        countryLocationId,
        geographicScope: "country",
        horizonYears: 10,
        numberOfCases: 1,
        basis: [
          {
            tier: "web",
            sourceUrl: "https://example.test/e2e-prior-case",
            quote: fixture.quote,
            occurredAt: fixture.occurredAt,
            locationLabel: fixture.locationLabel,
            scope: "country",
          },
        ],
        methodVersion: METHOD_VERSION,
      },
    });
    console.log(`[impact-prior-seed] ${title} → proposed ImpactPrior ${prior.id} (hazard ${hazardType}, task ${task.id})`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[impact-prior-seed] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
