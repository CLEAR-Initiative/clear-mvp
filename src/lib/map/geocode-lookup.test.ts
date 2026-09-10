import { describe, expect, it, vi, afterEach } from "vitest";
import {
  geocodePlaceQuery,
  parseCoordinateQuery,
  zoomForPlaceTypes,
} from "./geocode-lookup";

describe("parseCoordinateQuery", () => {
  it("parses lat,lng with comma", () => {
    const hit = parseCoordinateQuery("15.5, 32.5");
    expect(hit?.center).toEqual([32.5, 15.5]);
    expect(hit?.placeTypes).toEqual(["coordinate"]);
  });

  it("parses lng,lat when first value is outside latitude range", () => {
    const hit = parseCoordinateQuery("120.5, 15.25");
    expect(hit?.center).toEqual([120.5, 15.25]);
  });

  it("accepts semicolon separator", () => {
    expect(parseCoordinateQuery("-1.28; 36.82")?.center).toEqual([36.82, -1.28]);
  });

  it("returns null for garbage", () => {
    expect(parseCoordinateQuery("Khartoum")).toBeNull();
    expect(parseCoordinateQuery("")).toBeNull();
    expect(parseCoordinateQuery("999, 999")).toBeNull();
  });
});

describe("zoomForPlaceTypes", () => {
  it("frames countries wide and addresses tight", () => {
    expect(zoomForPlaceTypes(["country"])).toBe(5);
    expect(zoomForPlaceTypes(["address"])).toBe(14);
    expect(zoomForPlaceTypes(["coordinate"])).toBe(14);
  });
});

describe("geocodePlaceQuery", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("short-circuits coordinates without fetching", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const hits = await geocodePlaceQuery("15.5, 32.5", "tok");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.center).toEqual([32.5, 15.5]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Mapbox features to hits", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            id: "place.1",
            place_name: "Khartoum, Sudan",
            center: [32.53, 15.5],
            place_type: ["place"],
            bbox: [32.4, 15.4, 32.6, 15.6],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const hits = await geocodePlaceQuery("Khartoum", "tok");
    expect(hits).toEqual([
      {
        id: "place.1",
        label: "Khartoum, Sudan",
        center: [32.53, 15.5],
        bbox: [32.4, 15.4, 32.6, 15.6],
        placeTypes: ["place"],
      },
    ]);
  });

  it("returns [] when token missing or request fails", async () => {
    expect(await geocodePlaceQuery("x", "")).toEqual([]);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as unknown as typeof fetch;
    expect(await geocodePlaceQuery("x", "tok")).toEqual([]);
  });
});
