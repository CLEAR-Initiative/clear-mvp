// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-ground-seed.ts), where "./src/lib/prisma.js"
// resolves against clear-api's source tree. It is never imported by the
// clear-mvp app or its tests, so clear-mvp's tsc must not try to resolve
// clear-api's modules here.
/**
 * Ground-intel E2E fixture seed (synthetic).
 *
 * Runs INSIDE the clear-api seed image (docker-compose.e2e.yml service
 * `seed-ground`, which bind-mounts this file to /app/e2e-ground-seed.ts and
 * executes it with bun), so it can use clear-api's own Prisma client against
 * the ephemeral stack DB. Runs after `seed` (users + domain data).
 *
 * EVERYTHING here is synthetic: invented place names, invented sender
 * names, no phone numbers, no real chat content. It mirrors the SHAPES the
 * Ground Intel tab must render — a correction chain, a retraction, every
 * classification, an uncertainty marker, a caption-less media message —
 * without carrying any real-world data.
 *
 * Idempotent: deletes the fixture source (cascades threads + messages) and
 * recreates it, so re-running against a kept-up stack is safe.
 */

import { prisma } from "./src/lib/prisma.js";

const TRANSPORT_ID = "e2e-synthetic-group@g.us";

async function main() {
  await prisma.groundSources.deleteMany({ where: { transportId: TRANSPORT_ID } });

  const source = await prisma.groundSources.create({
    data: {
      name: "E2E Field Group (synthetic)",
      kind: "staff_group",
      transportId: TRANSPORT_ID,
      consentScope: "full message content (synthetic e2e fixture)",
      consentRecordedAt: new Date("2026-04-01T09:00:00Z"),
      consentRecordedBy: "E2E Seed",
      privacyDefault: "private",
      reviewerRoles: ["admin", "analyst"],
      retentionRule: "ephemeral e2e stack",
    },
  });

  // Thread A — correction chain: reported → updated → media → corrected.
  const corrected = await prisma.groundThreads.create({
    data: {
      groundSourceId: source.id,
      title: "Strike reported near Riverbend market (synthetic)",
      lifecycleState: "corrected",
      reviewState: "unverified",
    },
  });

  // Thread B — retraction ("misreporting") case, target of the review flow.
  const retracted = await prisma.groundThreads.create({
    data: {
      groundSourceId: source.id,
      title: "Convoy movement rumour (synthetic)",
      lifecycleState: "retracted",
      reviewState: "unverified",
    },
  });

  const msg = (
    n: number,
    sentAt: string,
    data: {
      senderRef: string;
      senderName: string;
      text: string;
      classification?: string | null;
      uncertainty?: string | null;
      isEdited?: boolean;
      omittedMediaCount?: number;
      mediaRefs?: string[];
      threadId?: string | null;
    },
  ) => ({
    groundSourceId: source.id,
    externalId: `whatsapp:${TRANSPORT_ID}:e2e-${String(n).padStart(4, "0")}`,
    sentAt: new Date(sentAt),
    senderRef: data.senderRef,
    senderName: data.senderName,
    text: data.text,
    mediaKeys: [],
    mediaRefs: data.mediaRefs ?? [],
    omittedMediaCount: data.omittedMediaCount ?? 0,
    classification: data.classification ?? null,
    uncertainty: data.uncertainty ?? null,
    isEdited: data.isEdited ?? false,
    threadId: data.threadId ?? null,
  });

  await prisma.groundMessages.createMany({
    data: [
      // ── Thread A: correction chain ────────────────────────────────────
      msg(1, "2026-04-12T07:10:00Z", {
        senderRef: "s_e2e0001",
        senderName: "Alpha Reporter",
        text: "Unconfirmed reports of a strike near Riverbend market this morning. Several stalls damaged.",
        classification: "field_report",
        uncertainty: "unconfirmed",
        threadId: corrected.id,
      }),
      msg(2, "2026-04-12T08:05:00Z", {
        senderRef: "s_e2e0001",
        senderName: "Alpha Reporter",
        text: "Update: two vehicles burned at the market entrance. Access road closed.",
        classification: "field_report",
        threadId: corrected.id,
      }),
      msg(3, "2026-04-12T08:20:00Z", {
        senderRef: "s_e2e0002",
        senderName: "Bravo Observer",
        text: "",
        classification: "field_report",
        omittedMediaCount: 1,
        mediaRefs: ["IMG-e2e-0001.jpg"],
        threadId: corrected.id,
      }),
      msg(4, "2026-04-12T11:45:00Z", {
        senderRef: "s_e2e0002",
        senderName: "Bravo Observer",
        text: "Correction: the strike hit the old depot north of Riverbend, not the market itself.",
        classification: "field_report",
        isEdited: true,
        threadId: corrected.id,
      }),
      // ── Thread B: retraction ──────────────────────────────────────────
      msg(5, "2026-04-13T19:00:00Z", {
        senderRef: "s_e2e0003",
        senderName: "Charlie Contact",
        text: "Rumour of a convoy moving towards Northgate bridge tonight.",
        classification: "field_report",
        uncertainty: "rumour",
        threadId: retracted.id,
      }),
      msg(6, "2026-04-14T06:30:00Z", {
        senderRef: "s_e2e0003",
        senderName: "Charlie Contact",
        text: "This turned out to be misreporting - no convoy movement at Northgate.",
        classification: "field_report",
        threadId: retracted.id,
      }),
      // ── Unthreaded classification variety for the filter chips ────────
      msg(7, "2026-04-14T09:00:00Z", {
        senderRef: "s_e2e0004",
        senderName: "Delta Curator",
        text: "Daily digest: three items on the regional situation (synthetic).",
        classification: "news_digest",
      }),
      msg(8, "2026-04-14T09:05:00Z", {
        senderRef: "s_e2e0005",
        senderName: "Echo Coordinator",
        text: "Team check-in at 09:00 confirmed.",
        classification: "operational",
      }),
      msg(9, "2026-04-14T09:10:00Z", {
        senderRef: "s_e2e0006",
        senderName: "Foxtrot Member",
        text: "Thanks everyone, noted.",
        classification: "chatter",
      }),
      msg(10, "2026-04-14T09:15:00Z", {
        senderRef: "s_e2e0007",
        senderName: "Golf Member",
        text: "New message awaiting classification (synthetic).",
        classification: null,
      }),
    ],
  });

  const counts = {
    threads: await prisma.groundThreads.count({ where: { groundSourceId: source.id } }),
    messages: await prisma.groundMessages.count({ where: { groundSourceId: source.id } }),
  };
  console.log(`[ground-seed] seeded source ${source.id}:`, counts);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[ground-seed] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
