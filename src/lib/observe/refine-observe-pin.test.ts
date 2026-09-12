import { describe, expect, it, vi } from "vitest";
import {
  buildObserveGeocodeQuery,
  pickPreciseGeocodeHit,
  resolveObservePinFields,
} from "./refine-observe-pin";
import type { GeocodeHit } from "~/lib/map/geocode-lookup";

function hit(
  partial: Partial<GeocodeHit> & Pick<GeocodeHit, "id" | "label" | "center" | "placeTypes">,
): GeocodeHit {
  return partial;
}

describe("buildObserveGeocodeQuery", () => {
  it("combines draft body with catalog label for landmark context", () => {
    expect(
      buildObserveGeocodeQuery(
        "Crowd at the National Museum\n@Khartoum",
        "Khartoum, Sudan",
      ),
    ).toBe("Crowd at the National Museum, Khartoum, Sudan");
  });

  it("always keeps the catalog country even when the draft already says Khartoum", () => {
    // Regression: previously dropped ", Sudan" when body included "Khartoum",
    // so Mapbox could return National Museum (Beirut) in Lebanon.
    expect(
      buildObserveGeocodeQuery(
        "National Museum in Khartoum @Khartoum",
        "Khartoum, Sudan",
      ),
    ).toBe("National Museum in Khartoum, Sudan");
  });
});

describe("pickPreciseGeocodeHit", () => {
  it("ignores bare city place hits so we keep catalog centroids", () => {
    expect(
      pickPreciseGeocodeHit(
        [
          hit({
            id: "place.1",
            label: "Khartoum, Sudan",
            center: [32.5, 15.5],
            placeTypes: ["place"],
          }),
        ],
        "Khartoum, Sudan",
      ),
    ).toBeNull();
  });

  it("selects Mapbox POI / address hits in the catalog country", () => {
    const museum = hit({
      id: "poi.1",
      label: "National Museum of Sudan, Khartoum, Sudan",
      center: [32.514, 15.606],
      placeTypes: ["poi"],
      countryName: "Sudan",
      countryCode: "SD",
    });
    expect(
      pickPreciseGeocodeHit(
        [
          hit({
            id: "place.1",
            label: "Khartoum, Sudan",
            center: [32.5, 15.5],
            placeTypes: ["place"],
            countryName: "Sudan",
            countryCode: "SD",
          }),
          museum,
        ],
        "Khartoum, Sudan",
      ),
    ).toEqual(museum);
  });

  it("rejects a National Museum POI in the wrong country (Lebanon vs Sudan)", () => {
    expect(
      pickPreciseGeocodeHit(
        [
          hit({
            id: "poi.beirut",
            label: "National Museum of Beirut, Beirut, Lebanon",
            center: [35.513, 33.878],
            placeTypes: ["poi"],
            countryName: "Lebanon",
            countryCode: "LB",
          }),
          hit({
            id: "place.khartoum",
            label: "Khartoum, Sudan",
            center: [32.5, 15.5],
            placeTypes: ["place"],
            countryName: "Sudan",
            countryCode: "SD",
          }),
        ],
        "Khartoum, Sudan",
      ),
    ).toBeNull();
  });
});

describe("resolveObservePinFields", () => {
  it("keeps GPS exclusive", async () => {
    const geocode = vi.fn();
    await expect(
      resolveObservePinFields({
        draft: "National Museum",
        locationId: "loc-k",
        locationLabel: "Khartoum",
        gps: { lat: 15.5, lng: 32.5 },
        geocode,
      }),
    ).resolves.toEqual({
      lat: 15.5,
      lng: 32.5,
      pinSource: "gps",
    });
    expect(geocode).not.toHaveBeenCalled();
  });

  it("upgrades catalog Khartoum to National Museum POI coords", async () => {
    const geocode = vi.fn().mockResolvedValue([
      hit({
        id: "place.1",
        label: "Khartoum, Sudan",
        center: [32.5, 15.5],
        placeTypes: ["place"],
        countryName: "Sudan",
        countryCode: "SD",
      }),
      hit({
        id: "poi.museum",
        label: "National Museum of Sudan, Khartoum, Sudan",
        center: [32.5142, 15.6061],
        placeTypes: ["poi"],
        countryName: "Sudan",
        countryCode: "SD",
      }),
    ]);

    await expect(
      resolveObservePinFields({
        draft: "Gathering at the National Museum",
        locationId: "loc-khartoum",
        locationLabel: "Khartoum, Sudan",
        gps: null,
        geocode,
      }),
    ).resolves.toEqual({
      lat: 15.6061,
      lng: 32.5142,
      pinSource: "geocode",
    });
  });

  it("falls back to catalog when Mapbox only returns an out-of-country POI", async () => {
    const geocode = vi.fn().mockResolvedValue([
      hit({
        id: "poi.beirut",
        label: "National Museum of Beirut, Beirut, Lebanon",
        center: [35.513, 33.878],
        placeTypes: ["poi"],
        countryName: "Lebanon",
        countryCode: "LB",
      }),
    ]);

    await expect(
      resolveObservePinFields({
        draft: "National Museum in Khartoum",
        locationId: "loc-khartoum",
        locationLabel: "Khartoum, Sudan",
        gps: null,
        geocode,
      }),
    ).resolves.toEqual({
      locationId: "loc-khartoum",
      pinSource: "catalog",
    });
  });

  it("falls back to catalog locationId when Mapbox has no POI", async () => {
    const geocode = vi.fn().mockResolvedValue([
      hit({
        id: "place.1",
        label: "Khartoum, Sudan",
        center: [32.5, 15.5],
        placeTypes: ["place"],
        countryName: "Sudan",
        countryCode: "SD",
      }),
    ]);

    await expect(
      resolveObservePinFields({
        draft: "Flooding in Khartoum",
        locationId: "loc-khartoum",
        locationLabel: "Khartoum, Sudan",
        gps: null,
        geocode,
      }),
    ).resolves.toEqual({
      locationId: "loc-khartoum",
      pinSource: "catalog",
    });
  });

  it("passes country ISO to Mapbox when the catalog label resolves", async () => {
    const geocode = vi.fn().mockResolvedValue([]);
    await resolveObservePinFields({
      draft: "National Museum",
      locationId: "loc-khartoum",
      locationLabel: "Khartoum, Sudan",
      gps: null,
      geocode,
    });
    expect(geocode).toHaveBeenCalled();
    expect(geocode.mock.calls[0]?.[0]).toBe("National Museum, Khartoum, Sudan");
    expect(geocode.mock.calls[0]?.[1]).toEqual({ country: "sd" });
  });
});
