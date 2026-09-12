import { describe, expect, it, vi, afterEach } from "vitest";
import {
  countryFromMapboxFeature,
  geocodePlaceQuery,
  matchPickerCountry,
  normalizeCountryCode,
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

  it("parses Observe GPS chip format with degree marks and hemispheres", () => {
    // Santiago, Chile — same string formatCoords() shows after Capture location.
    const hit = parseCoordinateQuery("33.4445°S 70.6452°W");
    expect(hit?.center[0]).toBeCloseTo(-70.6452, 4);
    expect(hit?.center[1]).toBeCloseTo(-33.4445, 4);
  });

  it("applies N/S/E/W without degree marks", () => {
    expect(parseCoordinateQuery("15.5 N, 32.5 E")?.center).toEqual([32.5, 15.5]);
    expect(parseCoordinateQuery("33.4445S 70.6452W")?.center?.[0]).toBeCloseTo(-70.6452, 4);
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

describe("normalizeCountryCode", () => {
  it("uppercases ISO alpha-2", () => {
    expect(normalizeCountryCode("sd")).toBe("SD");
    expect(normalizeCountryCode("VE")).toBe("VE");
  });
});

describe("countryFromMapboxFeature", () => {
  it("reads country features and context entries", () => {
    expect(
      countryFromMapboxFeature({
        text: "Sudan",
        place_name: "Sudan",
        place_type: ["country"],
        properties: { short_code: "sd" },
        center: [30, 15],
      }),
    ).toEqual({ countryName: "Sudan", countryCode: "SD" });

    expect(
      countryFromMapboxFeature({
        place_name: "Khartoum, Sudan",
        place_type: ["place"],
        center: [32.5, 15.5],
        context: [
          { id: "region.1", text: "Khartoum" },
          { id: "country.2", text: "Sudan", short_code: "sd" },
        ],
      }),
    ).toEqual({ countryName: "Sudan", countryCode: "SD" });
  });
});

describe("matchPickerCountry", () => {
  const options = [
    "All Countries",
    "Sudan",
    "Venezuela (Bolivarian Republic of)",
    "Afghanistan",
  ];

  it("matches by ISO code onto the picker label", () => {
    expect(matchPickerCountry(options, { countryCode: "sd" })).toBe("Sudan");
    expect(
      matchPickerCountry(options, {
        countryCode: "ve",
        countryName: "Venezuela",
      }),
    ).toBe("Venezuela (Bolivarian Republic of)");
  });

  it("returns null when the country is outside the picker", () => {
    expect(
      matchPickerCountry(options, { countryCode: "fr", countryName: "France" }),
    ).toBeNull();
  });
});

describe("geocodePlaceQuery", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("short-circuits hemisphere coordinates without fetching", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const hits = await geocodePlaceQuery("33.4445°S 70.6452°W", "tok");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.center[0]).toBeCloseTo(-70.6452, 4);
    expect(hits[0]?.center[1]).toBeCloseTo(-33.4445, 4);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short-circuits coordinates without fetching", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const hits = await geocodePlaceQuery("15.5, 32.5", "tok");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.center).toEqual([32.5, 15.5]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps Mapbox features to hits including country context", async () => {
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
            context: [{ id: "country.x", text: "Sudan", short_code: "sd" }],
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
        countryName: "Sudan",
        countryCode: "SD",
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
