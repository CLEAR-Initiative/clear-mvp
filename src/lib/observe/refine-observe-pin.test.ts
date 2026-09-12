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
});

describe("pickPreciseGeocodeHit", () => {
  it("ignores bare city place hits so we keep catalog centroids", () => {
    expect(
      pickPreciseGeocodeHit([
        hit({
          id: "place.1",
          label: "Khartoum, Sudan",
          center: [32.5, 15.5],
          placeTypes: ["place"],
        }),
      ]),
    ).toBeNull();
  });

  it("selects Mapbox POI / address hits", () => {
    const museum = hit({
      id: "poi.1",
      label: "National Museum of Sudan, Khartoum",
      center: [32.514, 15.606],
      placeTypes: ["poi"],
    });
    expect(
      pickPreciseGeocodeHit([
        hit({
          id: "place.1",
          label: "Khartoum, Sudan",
          center: [32.5, 15.5],
          placeTypes: ["place"],
        }),
        museum,
      ]),
    ).toEqual(museum);
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
      }),
      hit({
        id: "poi.museum",
        label: "National Museum of Sudan, Khartoum",
        center: [32.5142, 15.6061],
        placeTypes: ["poi"],
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

  it("falls back to catalog locationId when Mapbox has no POI", async () => {
    const geocode = vi.fn().mockResolvedValue([
      hit({
        id: "place.1",
        label: "Khartoum, Sudan",
        center: [32.5, 15.5],
        placeTypes: ["place"],
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
});
