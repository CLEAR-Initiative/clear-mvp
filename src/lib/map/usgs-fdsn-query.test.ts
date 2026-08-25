import { describe, expect, it } from "vitest";
import { countryConfig } from "~/lib/constants/country-config";
import {
  buildUsgsFdsnUrl,
  formatBboxParam,
  minMagnitudeForBbox,
  parseBboxParam,
  padBbox,
  seismicQueryBboxForCountry,
  seismicQueryWindow,
} from "./usgs-fdsn-query";

function contains(
  bbox: [number, number, number, number],
  lng: number,
  lat: number,
): boolean {
  return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

describe("seismicQueryBboxForCountry", () => {
  it("covers Kabul for Afghanistan (not the old Venezuela test bbox)", () => {
    const bbox = seismicQueryBboxForCountry("Afghanistan");
    expect(bbox).not.toBeNull();
    expect(contains(bbox!, 69.2, 34.5)).toBe(true);
    expect(contains(bbox!, -66.9, 10.5)).toBe(false);
  });

  it("covers Caracas for Venezuela", () => {
    const bbox = seismicQueryBboxForCountry("Venezuela");
    expect(bbox).not.toBeNull();
    expect(contains(bbox!, -66.9, 10.5)).toBe(true);
    expect(contains(bbox!, 69.2, 34.5)).toBe(false);
  });

  it("pads past the static country border so adjacent-plate events stay in", () => {
    const raw = countryConfig.Afghanistan.bbox;
    const padded = seismicQueryBboxForCountry("Afghanistan")!;
    expect(padded[0]).toBeLessThan(raw[0]);
    expect(padded[1]).toBeLessThan(raw[1]);
    expect(padded[2]).toBeGreaterThan(raw[2]);
    expect(padded[3]).toBeGreaterThan(raw[3]);
  });

  it("returns null for All Countries (global query)", () => {
    expect(seismicQueryBboxForCountry("All Countries")).toBeNull();
    expect(seismicQueryBboxForCountry(undefined)).toBeNull();
  });

  it("wires every map country to a bbox that contains its center", () => {
    for (const [name, cfg] of Object.entries(countryConfig)) {
      const bbox = seismicQueryBboxForCountry(name);
      expect(bbox, name).not.toBeNull();
      expect(contains(bbox!, cfg.center[0], cfg.center[1]), name).toBe(true);
    }
  });
});

describe("parseBboxParam / padBbox", () => {
  it("parses minLng,minLat,maxLng,maxLat", () => {
    expect(parseBboxParam("60.5,29.4,74.9,38.5")).toEqual([60.5, 29.4, 74.9, 38.5]);
  });

  it("rejects inverted or junk values", () => {
    expect(parseBboxParam("74.9,29.4,60.5,38.5")).toBeNull();
    expect(parseBboxParam("nope")).toBeNull();
    expect(parseBboxParam("")).toBeNull();
  });

  it("clamps pad to the world", () => {
    expect(padBbox([-179, -89, 179, 89], 5)).toEqual([-180, -90, 180, 90]);
  });
});

describe("buildUsgsFdsnUrl", () => {
  const start = new Date("2026-07-26T00:00:00.000Z");

  it("omits lat/lng filters for a global query", () => {
    const url = buildUsgsFdsnUrl({
      minMagnitude: 5.5,
      startTime: start,
      bbox: null,
    });
    expect(url.searchParams.get("minmagnitude")).toBe("5.5");
    expect(url.searchParams.has("minlatitude")).toBe(false);
    expect(url.searchParams.has("minlongitude")).toBe(false);
  });

  it("applies Afghanistan bbox to USGS FDSN params", () => {
    const bbox = seismicQueryBboxForCountry("Afghanistan")!;
    const url = buildUsgsFdsnUrl({
      minMagnitude: minMagnitudeForBbox(bbox),
      startTime: start,
      bbox,
    });
    expect(url.searchParams.get("minmagnitude")).toBe("4");
    expect(Number(url.searchParams.get("minlongitude"))).toBe(bbox[0]);
    expect(Number(url.searchParams.get("maxlatitude"))).toBe(bbox[3]);
    expect(formatBboxParam(bbox)).toBe(bbox.join(","));
  });

  it("sets optional endtime", () => {
    const url = buildUsgsFdsnUrl({
      minMagnitude: 5.5,
      startTime: start,
      endTime: new Date("2026-08-25T00:00:00.000Z"),
      bbox: null,
    });
    expect(url.searchParams.get("endtime")).toBe("2026-08-25T00:00:00.000Z");
  });
});

describe("seismicQueryWindow", () => {
  const now = new Date("2026-08-25T12:00:00.000Z");

  it("defaults to 30 days when start is omitted", () => {
    const w = seismicQueryWindow({ now });
    expect(w.windowDays).toBe(30);
    expect(w.endTime).toBeNull();
    expect(w.startTime.toISOString()).toBe("2026-07-26T12:00:00.000Z");
  });

  it("uses the map timeframe start/end", () => {
    const w = seismicQueryWindow({
      start: "2026-05-27T12:00:00.000Z",
      end: "2026-08-25T12:00:00.000Z",
      now,
    });
    expect(w.windowDays).toBe(90);
    expect(w.startTime.toISOString()).toBe("2026-05-27T12:00:00.000Z");
    expect(w.endTime?.toISOString()).toBe("2026-08-25T12:00:00.000Z");
  });

  it("clamps start older than 365 days", () => {
    const w = seismicQueryWindow({
      start: "2020-01-01T00:00:00.000Z",
      end: "2026-08-25T12:00:00.000Z",
      now,
    });
    expect(w.windowDays).toBe(365);
    expect(w.startTime.toISOString()).toBe("2025-08-25T12:00:00.000Z");
  });
});
