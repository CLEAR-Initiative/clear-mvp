#!/usr/bin/env npx tsx
/**
 * LogIE spike CLI — pull Sudan (or other ISO3) access issues + write reports.
 *
 * Usage:
 *   npx tsx scripts/logie/cli.ts
 *   npx tsx scripts/logie/cli.ts --iso3 SDN --full
 *   npm run logie:spike
 *
 * Note: system Bun 1.0.x was writing 0-byte GeoJSON; use tsx/Node.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  accessIssues,
  fclassCoverage,
  openVsBlockedCounts,
  save,
  statusDomains,
  type AccessIssuesCollection,
} from "./logie";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(ROOT, "out");

function parseArgs(argv: string[]) {
  let iso3 = "SDN";
  let full = false;
  let outDir = OUT_DIR;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--iso3" && argv[i + 1]) {
      iso3 = argv[++i]!.toUpperCase();
    } else if (a === "--full") {
      full = true;
    } else if (a === "--out" && argv[i + 1]) {
      outDir = argv[++i]!;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: npx tsx scripts/logie/cli.ts [--iso3 SDN] [--full] [--out DIR]

Writes (gitignored under scripts/logie/out/ by default):
  {iso3}_access_blocked.geojson   — only_blocked=true (default access_issues)
  {iso3}_access_full.geojson      — only if --full
  {iso3}_status_domains.json      — live coded domains + blocked codes
  {iso3}_spike_report.json        — counts, open-vs-blocked, fclass coverage
`);
      process.exit(0);
    }
  }
  return { iso3, full, outDir };
}

async function main() {
  const { iso3, full, outDir } = parseArgs(process.argv.slice(2));
  const prefix = join(outDir, iso3.toLowerCase());

  console.log(`Pulling LogIE access_issues iso3=${iso3} (blocked-only)…`);
  const blocked = await accessIssues({
    iso3,
    onlyBlocked: true,
    includePac: true,
  });
  const blockedPath = await save(
    blocked,
    `${prefix}_access_blocked.geojson`,
  );
  console.log(
    `  → ${blockedPath} (${blocked.features.length} features)`,
    blocked.metadata.counts_by_type,
  );
  if (Object.keys(blocked.metadata.errors).length) {
    console.warn("  errors:", blocked.metadata.errors);
  }

  let fullFc: AccessIssuesCollection | null = null;
  if (full) {
    console.log(`Pulling full (only_blocked=false)…`);
    fullFc = await accessIssues({
      iso3,
      onlyBlocked: false,
      includePac: true,
    });
    const fullPath = await save(fullFc, `${prefix}_access_full.geojson`);
    console.log(
      `  → ${fullPath} (${fullFc.features.length} features)`,
      fullFc.metadata.counts_by_type,
    );
  }

  console.log("Fetching status domains…");
  const domains = await statusDomains();
  const domainsPath = await save(domains, `${prefix}_status_domains.json`);
  console.log(`  → ${domainsPath}`);

  console.log("Computing open-vs-blocked counts (per layer)…");
  const openVsBlocked = await openVsBlockedCounts(iso3);

  const fclass = fclassCoverage(blocked.features);
  const report = {
    source: "WFP Logistics Cluster LogIE",
    iso3,
    pulled_at: blocked.metadata.pulled_at,
    gist:
      "https://gist.github.com/eoglethorpe/90f2b9e645d43fe8d74c7b442d7e9ce9",
    blocked_counts_by_type: blocked.metadata.counts_by_type,
    blocked_errors: blocked.metadata.errors,
    open_vs_blocked: openVsBlocked,
    fclass_coverage_on_blocked: fclass,
    full_counts_by_type: fullFc?.metadata.counts_by_type ?? null,
    working_hypothesis_blockages: "roads + bridges (defer final mapping to findings)",
    follow_ups: [
      "download_icons / LogIE sprite symbology",
      "Overpass surface if fclass is thin",
      "clear-api LogIE ingest ticket (see docs/clear-api-logie-ingest.md)",
    ],
  };
  const reportPath = await save(report, `${prefix}_spike_report.json`);
  console.log(`  → ${reportPath}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
