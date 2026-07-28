import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  toBlockagesMapCollection,
  type LogieAccessCollection,
} from "~/lib/map/logie-blockages";

/**
 * DEV-ONLY Blockages smoke feed.
 *
 * Reads the LogIE spike dump (`scripts/logie/out/sdn_access_blocked.geojson`),
 * applies the same slim/simplify transform prod ingest should expose, and
 * returns map-ready GeoJSON.
 *
 * Prod path: clear-api LogIE ingest → BFF proxy / tRPC → same `BlockagesMapCollection`
 * shape. This route must never ship as the production data path.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "LogIE blockages smoke is disabled in production" },
      { status: 404 },
    );
  }

  const filePath = path.join(
    process.cwd(),
    "scripts/logie/out/sdn_access_blocked.geojson",
  );

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return NextResponse.json(
      {
        error:
          "Spike GeoJSON missing. Run `npm run logie:spike` then retry.",
        path: "scripts/logie/out/sdn_access_blocked.geojson",
      },
      { status: 404 },
    );
  }

  let parsed: LogieAccessCollection;
  try {
    parsed = JSON.parse(raw) as LogieAccessCollection;
  } catch {
    return NextResponse.json(
      { error: "Spike GeoJSON is invalid JSON (re-run logie:spike with tsx)" },
      { status: 500 },
    );
  }

  const collection = toBlockagesMapCollection(parsed, {
    source: "logie-spike-smoke",
  });

  return NextResponse.json(collection, {
    headers: {
      "Cache-Control": "no-store",
      "X-Logie-Blockages-Source": "spike-smoke",
      "X-Logie-Bytes-In": String(collection.meta.bytes_in),
      "X-Logie-Bytes-Out": String(collection.meta.bytes_out),
    },
  });
}
