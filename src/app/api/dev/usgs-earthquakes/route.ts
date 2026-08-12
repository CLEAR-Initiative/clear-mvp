import { NextResponse } from "next/server";
import {
  toSeismicMapCollection,
  type UsgsFdsnCollection,
} from "~/lib/map/usgs-earthquakes";

/**
 * DEV-ONLY USGS earthquakes spike feed.
 *
 * Fetches live USGS FDSN Event GeoJSON, applies the slim transform, and returns
 * map-ready SeismicMapCollection. This is the smoke path while clear-api ingest
 * is being built.
 *
 * Prod path: clear-api USGS scheduled ingest → BFF proxy → same contract.
 */

const USGS_FDSN_BASE = "https://earthquake.usgs.gov/fdsnws/event/1/query";
const MIN_MAGNITUDE = 5.5;
const WINDOW_DAYS = 30;

// Venezuela bbox for testing (active seismic region)
const DEFAULT_BBOX: [number, number, number, number] = [-73, 0, -59, 13]; // [minLng, minLat, maxLng, maxLat]

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "USGS earthquakes spike is disabled in production" },
      { status: 404 },
    );
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const url = new URL(USGS_FDSN_BASE);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("eventtype", "earthquake");
  url.searchParams.set("minmagnitude", String(MIN_MAGNITUDE));
  url.searchParams.set("starttime", startTime.toISOString());
  url.searchParams.set("minlatitude", String(DEFAULT_BBOX[1]));
  url.searchParams.set("maxlatitude", String(DEFAULT_BBOX[3]));
  url.searchParams.set("minlongitude", String(DEFAULT_BBOX[0]));
  url.searchParams.set("maxlongitude", String(DEFAULT_BBOX[2]));
  url.searchParams.set("orderby", "time");
  url.searchParams.set("limit", "20000");

  let upstream: UsgsFdsnCollection;
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[usgs-spike]", res.status, text.slice(0, 500));
      return NextResponse.json(
        {
          error: `USGS FDSN query failed (HTTP ${res.status})`,
          detail: text.slice(0, 200),
        },
        { status: 502 },
      );
    }

    upstream = (await res.json()) as UsgsFdsnCollection;
  } catch (err) {
    console.error("[usgs-spike]", err);
    return NextResponse.json(
      { error: "Failed to fetch USGS FDSN Event data" },
      { status: 502 },
    );
  }

  if (upstream.type !== "FeatureCollection" || !Array.isArray(upstream.features)) {
    return NextResponse.json(
      { error: "USGS response is not a valid FeatureCollection" },
      { status: 500 },
    );
  }

  const collection = toSeismicMapCollection(upstream, {
    source: "usgs-spike",
    minMagnitude: MIN_MAGNITUDE,
    windowDays: WINDOW_DAYS,
    bbox: DEFAULT_BBOX,
  });

  return NextResponse.json(collection, {
    headers: {
      "Cache-Control": "no-store",
      "X-Usgs-Source": "spike",
      "X-Usgs-Bytes-In": String(collection.meta.bytes_in),
      "X-Usgs-Bytes-Out": String(collection.meta.bytes_out),
    },
  });
}
