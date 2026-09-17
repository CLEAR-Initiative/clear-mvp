import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeBlockagesIso3 } from "~/lib/map/blockages-countries";
import {
  toBlockagesMapCollection,
  type LogieAccessCollection,
} from "~/lib/map/logie-blockages";

/**
 * DEV-ONLY Blockages smoke feed.
 *
 * Reads `scripts/logie/out/{iso3}_access_blocked.geojson` (default SDN),
 * applies the same slim/simplify transform prod ingest should expose, and
 * returns map-ready GeoJSON.
 *
 * Generate dumps:
 *   npx tsx scripts/logie/cli.ts --iso3 SDN
 *   npx tsx scripts/logie/cli.ts --iso3 AFG
 *   npx tsx scripts/logie/cli.ts --iso3 VEN
 *
 * Prod path: clear-api LogIE ingest → BFF proxy → same `BlockagesMapCollection`
 * shape. This route must never ship as the production data path.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "LogIE blockages smoke is disabled in production" },
      { status: 404 },
    );
  }

  const iso3 =
    normalizeBlockagesIso3(request.nextUrl.searchParams.get("iso3")) ?? "SDN";
  const fileName = `${iso3.toLowerCase()}_access_blocked.geojson`;
  const filePath = path.join(process.cwd(), "scripts/logie/out", fileName);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return NextResponse.json(
      {
        error: `Spike GeoJSON missing for ${iso3}. Run \`npx tsx scripts/logie/cli.ts --iso3 ${iso3}\` then retry.`,
        path: `scripts/logie/out/${fileName}`,
        iso3,
      },
      { status: 404 },
    );
  }

  let parsed: LogieAccessCollection;
  try {
    parsed = JSON.parse(raw) as LogieAccessCollection;
  } catch {
    return NextResponse.json(
      { error: "Spike GeoJSON is invalid JSON (re-run logie:spike with tsx)", iso3 },
      { status: 500 },
    );
  }

  const collection = toBlockagesMapCollection(parsed, {
    source: "logie-spike-smoke",
  });
  collection.meta.iso3 = iso3;

  return NextResponse.json(collection, {
    headers: {
      "Cache-Control": "no-store",
      "X-Logie-Blockages-Source": "spike-smoke",
      "X-Logie-Blockages-Iso3": iso3,
      "X-Logie-Bytes-In": String(collection.meta.bytes_in),
      "X-Logie-Bytes-Out": String(collection.meta.bytes_out),
    },
  });
}
