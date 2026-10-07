// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-impact-prior-seed.ts), where "./src/..." resolves
// against clear-api's source tree. It is never imported by the clear-mvp app
// or its tests, so clear-mvp's tsc must not try to resolve clear-api's modules.
/**
 * Proposed ImpactPrior fixture for the review spec (case 17, clear-api
 * ADR-0010 V2), produced through clear-api's own Worker protocol.
 *
 * No Worker runs in the hermetic stack, so this script plays both parts over
 * GraphQL, as the real ones would:
 *
 *   1. the seeded analyst requests enrichment on each target Event
 *      (`requestEventEnrichment`), which fans out into one Task per source
 *      kind — `.clear` (CLEAR data) and `.web` (the web) by default,
 *   2. a `worker` identity claims each kind's Tasks (`claimTasks` matches
 *      kinds exactly) and completes each with a one-case ImpactPrior
 *      proposal (`completeTask`), whose basis tier matches the kind.
 *
 * So every target Event ends with two proposed ImpactPriors side by side,
 * one per source kind (V3, clear-api #727) — what the review spec decides
 * on and what the source labels are checked against.
 *
 * clear-api then writes the `proposed` ImpactPrior and fans out the Task
 * outcome notification ("Impact prior proposed — review it") to the
 * requester and the platform admins, so the spec exercises the bell too, and
 * clear-api validates the proposal (hazard among the Event's types, country
 * the level-0 ancestor of its location) exactly as it would a real Worker's.
 * Two Events, one per door the spec decides through (the Inbox, the Event
 * page). Run after `seed-event-types`: the hazard is the Event's GLIDE code.
 *
 * Prisma is used only for what the API has no door for: the two test-only
 * API keys (as `seed-agent-key` does), reading each Event's id, types and
 * country, and the reset that makes re-runs idempotent — the fixture
 * Events' Tasks, ImpactPriors and Task notifications are deleted first, so
 * re-running against a kept-up stack starts both priors at `proposed`.
 *
 * Titles mirror SEEDED_EVENTS / IMPACT_PRIORS in e2e/support/data.ts.
 */

import { prisma } from "./src/lib/prisma.js";
import { hashKey } from "./src/utils/api-key.js";

const API_URL = process.env.CLEAR_API_GRAPHQL_URL ?? "http://api:4000/graphql";
/** The source kinds clear-api fans a request out into (its TASK_IMPACT_PRIOR_KINDS default). */
const KINDS = ["event.impact_prior.clear", "event.impact_prior.web"] as const;
const KIND_FAMILY = "event.impact_prior";
const METHOD_VERSION = "e2e-impact-prior-seed@3";
const HORIZON_YEARS = 10;

/** Test-only keys, valid nowhere but this throwaway stack. */
const REQUESTER = { email: "analyst@clearinitiative.io", key: "sk_live_e2e_requester_0123456789abcdef", keyName: "e2e-requester" };
const WORKER = { email: "worker@clearinitiative.io", key: "sk_live_e2e_worker_0123456789abcdef", keyName: "e2e-worker" };

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

async function gql<T>(key: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors?.length) {
    throw new Error(`clear-api answered ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data as T;
}

async function upsertKey(userId: string, key: string, name: string) {
  const keyHash = hashKey(key);
  await prisma.apiKeys.upsert({
    where: { keyHash },
    update: { userId, revokedAt: null, expiresAt: null },
    create: { userId, name, prefix: key.slice(0, 16), keyHash },
  });
}

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
  // ── Identities: the seeded analyst (requester) and a `worker` service user ──
  const requester = await prisma.user.findUnique({ where: { email: REQUESTER.email }, select: { id: true } });
  if (!requester) throw new Error(`no seeded user ${REQUESTER.email} — did clear-api's seed change?`);
  const worker = await prisma.user.upsert({
    where: { email: WORKER.email },
    update: { role: "worker", isActive: true },
    create: { name: "CLEAR Worker (e2e)", email: WORKER.email, role: "worker", emailVerified: true, isActive: true },
  });
  await upsertKey(requester.id, REQUESTER.key, REQUESTER.keyName);
  await upsertKey(worker.id, WORKER.key, WORKER.keyName);

  // ── The target Events ──
  const targets = [];
  for (const [title, fixture] of Object.entries(FIXTURES)) {
    const event = await prisma.events.findFirst({
      where: { title },
      select: { id: true, types: true, locationId: true, originId: true, destinationId: true },
    });
    if (!event) throw new Error(`no seeded event titled "${title}" — did clear-api's seed change?`);
    const hazardType = event.types[0];
    if (!hazardType) throw new Error(`event "${title}" has no types — run seed-event-types first`);
    // clear-api's primary location: location, else origin, else destination.
    const primaryId = event.locationId ?? event.originId ?? event.destinationId;
    targets.push({ title, fixture, eventId: event.id, hazardType, countryLocationId: await countryFor(primaryId) });
  }
  const eventIds = targets.map((t) => t.eventId);
  // The CLEAR-data case cites an earlier CLEAR Event, never the Event under
  // review (that would be circular evidence): the oldest other seeded Event.
  const priorCase = await prisma.events.findFirst({
    where: { id: { notIn: eventIds } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!priorCase) throw new Error("no other seeded Event to cite as a CLEAR-data prior case — did clear-api's seed change?");

  // ── Reset (idempotent re-runs): priors reference Tasks, so they go first ──
  const removedPriors = await prisma.impactPrior.deleteMany({ where: { eventId: { in: eventIds } } });
  const removedTasks = await prisma.task.deleteMany({
    where: { kind: { startsWith: KIND_FAMILY }, subjectType: "event", subjectId: { in: eventIds } },
  });
  const removedNotes = await prisma.notifications.deleteMany({
    where: { notificationType: "task", actionUrl: { in: eventIds.map((id) => `/event/${id}`) } },
  });
  console.log(
    `[impact-prior-seed] reset ${removedPriors.count} priors, ${removedTasks.count} tasks, ${removedNotes.count} notifications`,
  );

  // ── 1. The analyst requests enrichment on each Event: one Task per kind ──
  const taskToTarget = new Map<string, { target: (typeof targets)[number]; kind: string }>();
  for (const target of targets) {
    const { requestEventEnrichment: tasks } = await gql<{ requestEventEnrichment: { id: string; kind: string; status: string }[] }>(
      REQUESTER.key,
      `mutation Request($eventId: String!, $horizonYears: Int) {
        requestEventEnrichment(eventId: $eventId, horizonYears: $horizonYears) { id kind status }
      }`,
      { eventId: target.eventId, horizonYears: HORIZON_YEARS },
    );
    const kinds = tasks.map((task) => task.kind).sort();
    if (kinds.join(",") !== [...KINDS].sort().join(",")) {
      throw new Error(`"${target.title}" fanned out into [${kinds.join(", ")}], expected [${KINDS.join(", ")}] — did clear-api's TASK_IMPACT_PRIOR_KINDS change?`);
    }
    for (const task of tasks) {
      if (task.status !== "PENDING") throw new Error(`Task ${task.id} (${task.kind}) for "${target.title}" is ${task.status}, not PENDING`);
      taskToTarget.set(task.id, { target, kind: task.kind });
    }
  }

  // ── 2. The worker claims each kind and completes each Task with a proposal ──
  // claimTasks matches kinds exactly and leases the oldest claimable Tasks,
  // so on a kept-up stack it can hand back another spec's leftover; give
  // those up again (failTask returns them to PENDING) and keep claiming
  // until ours are held.
  const leases = new Map<string, string>();
  for (const kind of KINDS) {
    const wanted = [...taskToTarget.entries()].filter(([, v]) => v.kind === kind).length;
    let held = 0;
    for (let round = 0; round < 10 && held < wanted; round++) {
      const { claimTasks } = await gql<{ claimTasks: { id: string; leaseToken: string }[] }>(
        WORKER.key,
        `mutation Claim($kind: String!, $limit: Int) { claimTasks(kind: $kind, limit: $limit) { id leaseToken } }`,
        { kind, limit: 10 },
      );
      if (claimTasks.length === 0) break;
      for (const claimed of claimTasks) {
        if (taskToTarget.has(claimed.id)) {
          leases.set(claimed.id, claimed.leaseToken);
          held++;
        } else {
          await gql(
            WORKER.key,
            `mutation Release($id: String!, $leaseToken: String!, $error: String!) {
              failTask(id: $id, leaseToken: $leaseToken, error: $error) { id }
            }`,
            { id: claimed.id, leaseToken: claimed.leaseToken, error: "e2e seed: not a fixture Task, released" },
          );
        }
      }
    }
  }
  if (leases.size !== taskToTarget.size) {
    throw new Error(`claimed ${leases.size} of ${taskToTarget.size} fixture Tasks`);
  }

  for (const [taskId, leaseToken] of leases) {
    const { target, kind } = taskToTarget.get(taskId)!;
    // The basis tier matches the source: the CLEAR drain cites an earlier
    // CLEAR Event, the web Worker a URL.
    const tier = kind.endsWith(".clear") ? "clear" : "web";
    const { completeTask } = await gql<{ completeTask: { id: string; status: string; outcome: string | null } }>(
      WORKER.key,
      `mutation Complete($id: String!, $leaseToken: String!, $result: JSON!, $impactPrior: ImpactPriorInput) {
        completeTask(id: $id, leaseToken: $leaseToken, result: $result, impactPrior: $impactPrior) { id status outcome }
      }`,
      {
        id: taskId,
        leaseToken,
        result: { e2eFixture: true, cases: 1 },
        impactPrior: {
          hazardType: target.hazardType,
          countryLocationId: target.countryLocationId,
          geographicScope: "country",
          horizonYears: HORIZON_YEARS,
          numberOfCases: 1,
          basis: [
            tier === "web"
              ? {
                  tier,
                  sourceUrl: "https://example.test/e2e-prior-case",
                  quote: target.fixture.quote,
                  occurredAt: target.fixture.occurredAt,
                  locationLabel: target.fixture.locationLabel,
                  scope: "country",
                }
              : {
                  tier,
                  eventId: priorCase.id,
                  quote: target.fixture.quote,
                  occurredAt: target.fixture.occurredAt,
                  locationLabel: target.fixture.locationLabel,
                  scope: "country",
                },
          ],
          methodVersion: `${METHOD_VERSION}-${tier}`,
        },
      },
    );
    if (completeTask.status !== "COMPLETED" || completeTask.outcome !== "produced") {
      throw new Error(`Task ${taskId} ended ${completeTask.status} / ${completeTask.outcome}, not COMPLETED / produced`);
    }
    console.log(`[impact-prior-seed] ${target.title} → proposed ImpactPrior (${kind}) via Task ${taskId} (hazard ${target.hazardType})`);
  }

  // The fan-out is fire-and-forget after completeTask answers; wait for the
  // requester's rows (one per completed Task) so the spec never races it.
  const expectedUrls = eventIds.map((id) => `/event/${id}`);
  for (let i = 0; i < 50; i++) {
    const count = await prisma.notifications.count({
      where: { userId: requester.id, notificationType: "task", actionUrl: { in: expectedUrls } },
    });
    if (count >= leases.size) {
      console.log(`[impact-prior-seed] ${count} Task notifications fanned out to ${REQUESTER.email}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("the Task outcome notifications never reached the requester");
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
