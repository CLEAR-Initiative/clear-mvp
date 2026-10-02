import { describe, expect, it } from "vitest";
import { markerMatchesLocationScope } from "./marker-location-match";

const SUDAN_BBOX = [21.8, 8.7, 38.6, 23.2] as const;

describe("markerMatchesLocationScope", () => {
  it("keeps catalog descendants linked by ancestor id", () => {
    expect(
      markerMatchesLocationScope({
        locationId: "khartoum",
        ancestorIds: ["sudan-l0"],
        lng: 32.5,
        lat: 15.5,
        selectedLocationId: "sudan-l0",
        selectedLocationName: "Sudan",
      }),
    ).toBe(true);
  });

  it("keeps an orphan landmark point inside the selected country bbox", () => {
    expect(
      markerMatchesLocationScope({
        locationId: "point-museum",
        ancestorIds: [],
        region: "Point 15.60000, 32.53000",
        lng: 32.53,
        lat: 15.6,
        selectedLocationId: "sudan-l0",
        selectedLocationName: "Sudan",
        countryBbox: SUDAN_BBOX,
      }),
    ).toBe(true);
  });

  it("drops an orphan point outside the country", () => {
    expect(
      markerMatchesLocationScope({
        locationId: "point-chile",
        ancestorIds: [],
        lng: -70.6,
        lat: -33.4,
        selectedLocationId: "sudan-l0",
        selectedLocationName: "Sudan",
        countryBbox: SUDAN_BBOX,
      }),
    ).toBe(false);
  });
});
