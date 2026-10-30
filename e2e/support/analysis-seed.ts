// @ts-nocheck — this script executes inside the clear-api seed image
// (bind-mounted to /app/e2e-analysis-seed.ts), where "./src/lib/prisma.js"
// resolves against clear-api's source tree. It is never imported by the
// clear-mvp app or its tests, so clear-mvp's tsc must not try to resolve
// clear-api's modules here.
/**
 * One Sudan analysis for the Analysis page smoke.
 *
 * The hermetic seed has a level-0 location named Sudan (its id is a UUID; the
 * seed key "sudan" is not the row id) and four events, and no analysis
 * document, so the page cannot open. This inserts the current-year country
 * frame plus the all-time stock figures the needs rows read.
 *
 * Strings mirror SEEDED_ANALYSIS in e2e/support/data.ts.
 *
 * Runs INSIDE the clear-api seed image, after `seed`. Idempotent.
 */

import { prisma } from "./src/lib/prisma.js";

const COUNTRY_NAME = "Sudan";
const ANALYSIS_ID = "e2e-sudan-analysis";
const FIGURES_ID = "e2e-sudan-figures";
const SOURCE_TITLE = "OCHA Sudan humanitarian update";
const EVENT_CITATION = "event:e2e-cited";
const RANGE = "2\u20133 million people remain displaced from the fighting.";

async function main() {
  const country = await prisma.locations.findFirst({
    where: { name: COUNTRY_NAME, level: 0 },
  });
  if (!country) {
    throw new Error(`[analysis-seed] expected a level-0 location named "${COUNTRY_NAME}" from the main seed`);
  }
  const countryId = country.id;

  const year = new Date().getUTCFullYear();
  const windowStart = new Date(Date.UTC(year, 0, 1));
  const windowEnd = new Date(`${year}-12-31T23:59:59Z`);
  const figuresStart = new Date("1970-01-01T00:00:00Z");
  const now = new Date();

  await prisma.analysis.deleteMany({
    where: {
      OR: [{ id: ANALYSIS_ID }, { locationIds: { equals: [countryId] }, windowStart, windowEnd }],
    },
  });
  await prisma.analysis.create({
    data: {
      id: ANALYSIS_ID,
      locationIds: [countryId],
      eventTypes: [],
      needSectors: [],
      windowStart,
      windowEnd,
      data: {
        ai_summary: {
          text: "Fighting continues across Darfur.",
          source_report_ids: ["report:ocha-sudan"],
        },
        sources: {
          reports: [
            { report_id: "report:ocha-sudan", report_title: SOURCE_TITLE, publisher: "OCHA" },
            { report_id: EVENT_CITATION, report_title: EVENT_CITATION },
          ],
        },
        context_risks: {
          security: { bullets: [RANGE] },
        },
        sectors: {
          wash: { severity: "high", top_needs: ["Safe water"] },
        },
        datapoints: { envelope: { report_count: 1 } },
      },
      sourceReportIds: ["report:ocha-sudan", EVENT_CITATION],
      generatedByModel: "e2e",
      generatedAt: now,
      schemaVersion: "e2e",
      validFrom: now,
    },
  });

  await prisma.aggregatedDatapoint.deleteMany({
    where: {
      OR: [
        { id: FIGURES_ID },
        { locationId: countryId, windowKind: "all", windowStart: figuresStart, schemaVersion: "v5" },
      ],
    },
  });
  await prisma.aggregatedDatapoint.create({
    data: {
      id: FIGURES_ID,
      windowStart: figuresStart,
      windowEnd: now,
      windowKind: "all",
      locationId: countryId,
      data: { pin_wash: { value: 25_000_000 } },
      contributingReportIds: [],
      newestSourceAt: now,
      oldestSourceAt: now,
      dataQualityScore: 0,
      reportCount: 1,
      schemaVersion: "v5",
      computedAt: now,
      validFrom: now,
    },
  });

  console.log(`[analysis-seed] Sudan ${year} analysis and WASH stock figure ready`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[analysis-seed] failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
