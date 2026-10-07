// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-impact-prior-seed.ts), where "./src/..." resolves
// against clear-api's source tree. It is never imported by the clear-mvp app
// or its tests, so clear-mvp's tsc must not try to resolve clear-api's modules.
/**
 * Enrichment fixture for the review spec (case 17, clear-api ADR-0010 V2–V4),
 * produced through clear-api's own Worker protocol.
 *
 * No Worker runs in the hermetic stack, so this script plays both parts over
 * GraphQL, as the real ones would:
 *
 *   1. the seeded analyst requests enrichment on each target Event
 *      (`requestEventEnrichment`), which fans out into one Task per source
 *      kind — `.clear` (CLEAR data) and `.web` (the web) by default,
 *   2. a `worker` identity claims each kind's Tasks (`claimTasks` matches
 *      kinds exactly) and completes each (`completeTask`): the `.clear` Task
 *      with a one-case ImpactPrior citing an earlier CLEAR Event, the `.web`
 *      Task with two cases (V4, `cases`), each its own CaseProposal.
 *
 * So every target Event ends with a proposed ImpactPrior from CLEAR data and
 * two proposed web cases beside it — what the review spec decides on, the
 * prior as a whole and the cases one by one.
 *
 * clear-api then writes the `proposed` rows and fans out the Task outcome
 * notification ("… proposed — review it", "…: cases proposed — review
 * them") to the requester and the platform admins, so the spec exercises the
 * bell too, and clear-api validates each proposal (hazard among the Event's
 * types, country the level-0 ancestor of its location, a case's date within
 * the horizon) exactly as it would a real Worker's.
 * Two Events, one per door the spec decides through (the Inbox, the Event
 * page). Run after `seed-event-types`: the hazard is the Event's GLIDE code.
 *
 * Prisma is used only for what the API has no door for: the two test-only
 * API keys (as `seed-agent-key` does), reading each Event's id, types and
 * country, and the reset that makes re-runs idempotent — the fixture
 * Events' Tasks, ImpactPriors, CaseProposals and Task notifications are
 * deleted first, so re-running against a kept-up stack starts everything at
 * `proposed`. (What accepting a case wrote — a Signal, maybe a historical
 * Event — stays; it is CLEAR history now and no spec counts it.)
 *
 * Titles mirror SEEDED_EVENTS / IMPACT_PRIORS in e2e/support/data.ts.
 */

import { prisma } from "./src/lib/prisma.js";
import { hashKey } from "./src/utils/api-key.js";

const API_URL = process.env.CLEAR_API_GRAPHQL_URL ?? "http://api:4000/graphql";
/** The source kinds clear-api fans a request out into (its TASK_IMPACT_PRIOR_KINDS default). */
const KINDS = ["event.impact_prior.clear", "event.impact_prior.web"] as const;
const KIND_FAMILY = "event.impact_prior";
const METHOD_VERSION = "e2e-impact-prior-seed@4";
const HORIZON_YEARS = 10;

/** Test-only keys, valid nowhere but this throwaway stack. */
const REQUESTER = { email: "analyst@clearinitiative.io", key: "sk_live_e2e_requester_0123456789abcdef", keyName: "e2e-requester" };
const WORKER = { email: "worker@clearinitiative.io", key: "sk_live_e2e_worker_0123456789abcdef", keyName: "e2e-worker" };

interface Fixture {
  /** The CLEAR-data prior's one case. */
  quote: string;
  occurredAt: string;
  locationLabel: string;
  /** The web Worker's two cases; URLs mirror IMPACT_PRIORS.webCases. The
   * first gives a figure, the second none. */
  webCases: [WebCase, WebCase];
}
interface WebCase {
  sourceUrl: string;
  quote: string;
  occurredAt: string;
  figures?: { metric: string; value: number; lowerBound?: number; upperBound?: number }[];
}

/** Event title → the synthetic cases. */
const FIXTURES: Record<string, Fixture> = {
  "North Darfur Food Security Emergency": {
    quote: "Synthetic prior case: acute food insecurity reported across North Darfur localities.",
    occurredAt: "2024-06-01T00:00:00Z",
    locationLabel: "North Darfur",
    webCases: [
      {
        sourceUrl: "https://example.test/e2e-case/north-darfur-food-1",
        quote: "Synthetic web case: some 240,000 people faced emergency food insecurity in North Darfur.",
        occurredAt: "2024-07-01T00:00:00Z",
        figures: [{ metric: "people_affected", value: 240000, lowerBound: 200000, upperBound: 260000 }],
      },
      {
        sourceUrl: "https://example.test/e2e-case/north-darfur-food-2",
        quote: "Synthetic web case: markets in El Fasher closed as staple prices doubled.",
        occurredAt: "2023-11-15T00:00:00Z",
      },
    ],
  },
  "Khartoum Flood Emergency": {
    quote: "Synthetic prior case: seasonal Nile flooding displaced households in Khartoum State.",
    occurredAt: "2022-08-15T00:00:00Z",
    locationLabel: "Khartoum",
    webCases: [
      {
        sourceUrl: "https://example.test/e2e-case/khartoum-flood-1",
        quote: "Synthetic web case: Nile floods damaged 12,000 homes across Khartoum State.",
        occurredAt: "2020-09-05T00:00:00Z",
        figures: [{ metric: "households_affected", value: 12000 }],
      },
      {
        sourceUrl: "https://example.test/e2e-case/khartoum-flood-2",
        quote: "Synthetic web case: flash floods cut roads south of Khartoum.",
        occurredAt: "2021-08-20T00:00:00Z",
      },
    ],
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
    // Events have no createdAt; the first Signal's time is when one began.
    orderBy: { firstSignalCreatedAt: "asc" },
    select: { id: true },
  });
  if (!priorCase) throw new Error("no other seeded Event to cite as a CLEAR-data prior case — did clear-api's seed change?");

  // ── Reset (idempotent re-runs): priors and cases reference Tasks, so they go first ──
  const removedCases = await prisma.caseProposal.deleteMany({ where: { eventId: { in: eventIds } } });
  const removedPriors = await prisma.impactPrior.deleteMany({ where: { eventId: { in: eventIds } } });
  const removedTasks = await prisma.task.deleteMany({
    where: { kind: { startsWith: KIND_FAMILY }, subjectType: "event", subjectId: { in: eventIds } },
  });
  const removedNotes = await prisma.notifications.deleteMany({
    where: { notificationType: "task", actionUrl: { in: eventIds.map((id) => `/event/${id}`) } },
  });
  console.log(
    `[impact-prior-seed] reset ${removedCases.count} cases, ${removedPriors.count} priors, ${removedTasks.count} tasks, ${removedNotes.count} notifications`,
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
    const web = kind.endsWith(".web");
    // The CLEAR drain proposes a whole prior citing an earlier CLEAR Event;
    // the web Worker proposes cases, one CaseProposal each (V4).
    const { completeTask } = web
      ? await gql<{ completeTask: { id: string; status: string; outcome: string | null } }>(
          WORKER.key,
          `mutation CompleteWeb($id: String!, $leaseToken: String!, $result: JSON!, $cases: [CaseProposalInput!], $methodVersion: String) {
            completeTask(id: $id, leaseToken: $leaseToken, result: $result, cases: $cases, methodVersion: $methodVersion) { id status outcome }
          }`,
          {
            id: taskId,
            leaseToken,
            result: { e2eFixture: true, cases: target.fixture.webCases.length },
            cases: target.fixture.webCases.map((c) => ({
              sourceUrl: c.sourceUrl,
              quote: c.quote,
              occurredAt: c.occurredAt,
              locationLabel: target.fixture.locationLabel,
              hazardType: target.hazardType,
              geographicScope: "country",
              figures: c.figures ?? [],
            })),
            methodVersion: `${METHOD_VERSION}-web`,
          },
        )
      : await gql<{ completeTask: { id: string; status: string; outcome: string | null } }>(
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
                {
                  tier: "clear",
                  eventId: priorCase.id,
                  quote: target.fixture.quote,
                  occurredAt: target.fixture.occurredAt,
                  locationLabel: target.fixture.locationLabel,
                  scope: "country",
                },
              ],
              methodVersion: `${METHOD_VERSION}-clear`,
            },
          },
        );
    if (completeTask.status !== "COMPLETED" || completeTask.outcome !== "produced") {
      throw new Error(`Task ${taskId} ended ${completeTask.status} / ${completeTask.outcome}, not COMPLETED / produced`);
    }
    console.log(
      `[impact-prior-seed] ${target.title} → ${web ? `${target.fixture.webCases.length} proposed web cases` : "proposed ImpactPrior"} (${kind}) via Task ${taskId} (hazard ${target.hazardType})`,
    );
  }

  const cases = await prisma.caseProposal.count({ where: { eventId: { in: eventIds }, state: "proposed" } });
  const expectedCases = targets.reduce((n, t) => n + t.fixture.webCases.length, 0);
  if (cases !== expectedCases) throw new Error(`expected ${expectedCases} proposed web cases, found ${cases}`);

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
