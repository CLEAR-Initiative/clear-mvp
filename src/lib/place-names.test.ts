import { describe, expect, it } from "vitest";
import {
  placeErrorKey,
  placeNameHomeArea,
  placeResolvedToastKey,
  resolutionForSuggestion,
  signalExcerpt,
  suggestionKey,
} from "./place-names";
import type { GqlPlaceNameSuggestion } from "./types/graphql";

const suggestion = (over: Partial<GqlPlaceNameSuggestion>): GqlPlaceNameSuggestion => ({
  kind: "GEONAMES", geonamesId: 7, locationId: null, name: "Kamo", level: null, featureClass: "P",
  featureCode: "PPL", latitude: 1, longitude: 2, score: 1, insideArea: true, distanceKm: 0, ...over,
});

describe("resolutionForSuggestion", () => {
  it("answers with a GeoNames place by its GeoNames id, a CLEAR place by its id", () => {
    expect(resolutionForSuggestion(suggestion({}))).toEqual({ kind: "GEONAMES", geonamesId: 7 });
    expect(resolutionForSuggestion(suggestion({ kind: "LOCATION", geonamesId: null, locationId: "L1" }))).toEqual({
      kind: "LOCATION",
      locationId: "L1",
    });
  });

  it("is null for a suggestion with no id to answer with", () => {
    expect(resolutionForSuggestion(suggestion({ geonamesId: null }))).toBeNull();
    expect(resolutionForSuggestion(suggestion({ kind: "LOCATION", locationId: null }))).toBeNull();
  });

  it("keys a suggestion by its kind and id", () => {
    expect(suggestionKey(suggestion({}))).toBe("g:7");
    expect(suggestionKey(suggestion({ kind: "LOCATION", locationId: "L1" }))).toBe("l:L1");
  });
});

describe("placeNameHomeArea", () => {
  it("is the state, else the country, else nothing", () => {
    expect(placeNameHomeArea({ stateLocationId: "S1", countryLocationId: "C1" })).toEqual([{ id: "S1" }]);
    expect(placeNameHomeArea({ stateLocationId: null, countryLocationId: "C1" })).toEqual([{ id: "C1" }]);
    expect(placeNameHomeArea({ stateLocationId: null, countryLocationId: null })).toEqual([]);
  });
});

describe("messages", () => {
  it("picks the toast by kind", () => {
    for (const kind of ["LOCATION", "GEONAMES", "POINT"] as const) {
      expect(placeResolvedToastKey(kind)).toBe("place.toast.resolved");
    }
    expect(placeResolvedToastKey("NOT_A_PLACE")).toBe("place.toast.notAPlace");
    expect(placeResolvedToastKey("AMBIGUOUS")).toBe("place.toast.ambiguous");
  });

  it("maps clear-api's refusal to a message", () => {
    expect(placeErrorKey("FORBIDDEN")).toBe("place.errors.forbidden");
    expect(placeErrorKey("BAD_REQUEST")).toBe("place.errors.badPlace");
    expect(placeErrorKey("CONFLICT")).toBe("place.errors.conflict");
    expect(placeErrorKey("NOT_FOUND")).toBe("place.errors.conflict");
    expect(placeErrorKey(undefined)).toBe("place.errors.failed");
  });
});

describe("signalExcerpt", () => {
  it("prefers the description, falls back to the title, and is null without either", () => {
    expect(signalExcerpt({ title: "Title", description: " Body\n text " })).toBe("Body text");
    expect(signalExcerpt({ title: " Title ", description: " " })).toBe("Title");
    expect(signalExcerpt({ title: null, description: null })).toBeNull();
    expect(signalExcerpt(null)).toBeNull();
  });

  it("cuts a long post", () => {
    const cut = signalExcerpt({ title: null, description: "x".repeat(400) }, 50)!;
    expect(cut).toHaveLength(50);
    expect(cut.endsWith("…")).toBe(true);
  });
});
