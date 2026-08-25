import { type NextRequest, NextResponse } from "next/server";
import { isUsgsSpikeAllowed } from "~/lib/map/fetch-usgs-earthquakes";
import {
  buildUsgsFdsnUrl,
  minMagnitudeForBbox,
  parseBboxParam,
} from "~/lib/map/usgs-fdsn-query";
import {
  toSeismicMapCollection,
  type ShakeMapContours,
  type UsgsFdsnCollection,
} from "~/lib/map/usgs-earthquakes";

/**
 * DEV/preview USGS earthquakes spike feed.
 *
 * Fetches live USGS FDSN Event GeoJSON, applies the slim transform, and returns
 * map-ready SeismicMapCollection. Geography follows the map country toggle
 * (`bbox=minLng,minLat,maxLng,maxLat`); omit bbox for global M5.5+.
 *
 * Prod path: clear-api USGS scheduled ingest → BFF proxy → same contract.
 */

const WINDOW_DAYS = 30;
const MAX_SHAKEMAP_FETCHES = 20;

export async function GET(request: NextRequest) {
  if (!isUsgsSpikeAllowed()) {
    return NextResponse.json(
      { error: "USGS earthquakes spike is disabled in production" },
      { status: 404 },
    );
  }

  const bbox = parseBboxParam(request.nextUrl.searchParams.get("bbox"));
  const minMagnitude = minMagnitudeForBbox(bbox);
  const now = new Date();
  const startTime = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const url = buildUsgsFdsnUrl({ minMagnitude, startTime, bbox });

  console.log("[usgs-spike] Fetching:", url.toString());

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
          url: url.toString(),
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
    minMagnitude,
    windowDays: WINDOW_DAYS,
    bbox,
  });

  // Fetch ShakeMap contours for events that have them (highest mag first, capped).
  const shakemapPromises = collection.features
    .filter((f) => f.properties.has_shakemap)
    .sort((a, b) => (b.properties.mag ?? 0) - (a.properties.mag ?? 0))
    .slice(0, MAX_SHAKEMAP_FETCHES)
    .map(async (f) => {
      try {
        const eventId = f.properties.id;
        const detailUrl = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${eventId}.geojson`;
        const detailRes = await fetch(detailUrl, { cache: "no-store" });
        if (!detailRes.ok) return null;

        const detail = (await detailRes.json()) as {
          properties?: {
            products?: {
              shakemap?: Array<{
                contents?: Record<string, { url?: string }>;
              }>;
            };
          };
        };
        const shakemapProduct = detail.properties?.products?.shakemap?.[0];
        if (!shakemapProduct) return null;

        const contourUrl = shakemapProduct.contents?.["download/cont_mmi.json"]?.url;
        if (!contourUrl) return null;

        const contourRes = await fetch(contourUrl, { cache: "no-store" });
        if (!contourRes.ok) return null;

        const contours = (await contourRes.json()) as ShakeMapContours;
        return {
          eventId,
          type: "FeatureCollection" as const,
          features: contours.features || [],
        };
      } catch (err) {
        console.error(`[usgs-spike] Failed to fetch ShakeMap for ${f.properties.id}:`, err);
        return null;
      }
    });

  const shakemaps = (await Promise.all(shakemapPromises)).filter(
    (s): s is NonNullable<typeof s> => s !== null,
  );

  if (shakemaps.length > 0) {
    collection.shakemaps = shakemaps;
  }

  console.log(
    `[usgs-spike] Returned ${collection.meta.feature_count} earthquakes, ${shakemaps.length} with ShakeMaps`,
  );

  return NextResponse.json(collection, {
    headers: {
      "Cache-Control": "no-store",
      "X-Usgs-Source": "spike",
      "X-Usgs-Bytes-In": String(collection.meta.bytes_in),
      "X-Usgs-Bytes-Out": String(collection.meta.bytes_out),
    },
  });
}
