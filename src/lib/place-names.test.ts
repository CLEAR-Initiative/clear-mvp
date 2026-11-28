import { describe, expect, it } from "vitest";
import {
  aliasCountries,
  aliasErrorKey,
  aliasTargetPath,
  placeErrorKey,
  placeLookupLinks,
  placeLookupQuery,
  placeLookupView,
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

describe("aliasCountries", () => {
  const data = {
    pipelineCountries: [
      { name: "Sudan", pcode: "SD" },
      { name: "Venezuela", pcode: "VE" },
      { name: "Afghanistan", pcode: "AF" },
    ],
    countries: [
      { id: "C-SD", name: "Sudan", pCode: "sd" },
      // No P-Code, and the long official name: matched by name.
      { id: "C-VE", name: "Venezuela (Bolivarian Republic of)", pCode: null },
    ],
    states: [
      { id: "S2", name: "White Nile", parent: { id: "C-SD" } },
      { id: "S1", name: "South Kordofan", parent: { id: "C-SD" } },
      { id: "S3", name: "Zulia", parent: { id: "C-VE" } },
      { id: "S4", name: "Orphan", parent: null },
    ],
  };

  it("matches each pipeline country to its location by P-Code, else by name, and lists its states by name", () => {
    expect(aliasCountries(data)).toEqual([
      {
        countryCode: "SD",
        name: "Sudan",
        countryLocationId: "C-SD",
        states: [{ id: "S1", name: "South Kordofan" }, { id: "S2", name: "White Nile" }],
      },
      { countryCode: "VE", name: "Venezuela", countryLocationId: "C-VE", states: [{ id: "S3", name: "Zulia" }] },
      // No location: still listed, for a country-wide alias, with no states.
      { countryCode: "AF", name: "Afghanistan", countryLocationId: null, states: [] },
    ]);
  });
});

describe("aliasTargetPath and aliasErrorKey", () => {
  it("reads a target finest first, without the country", () => {
    expect(
      aliasTargetPath({
        location: {
          id: "L4",
          name: "Um Dabakir",
          level: 4,
          ancestors: [
            { id: "C1", name: "Sudan", level: 0 },
            { id: "S1", name: "South Kordofan", level: 1 },
            { id: "D1", name: "Kadugli", level: 2 },
          ],
        },
      }),
    ).toBe("Um Dabakir, Kadugli, South Kordofan");
    expect(aliasTargetPath({ location: { id: "D1", name: "Kadugli", level: 2, ancestors: [] } })).toBe("Kadugli");
    expect(aliasTargetPath({ location: null })).toBeNull();
  });

  it("maps clear-api's refusal of an alias write to a message", () => {
    expect(aliasErrorKey("FORBIDDEN")).toBe("aliases.errors.forbidden");
    expect(aliasErrorKey("BAD_REQUEST")).toBe("aliases.errors.badInput");
    expect(aliasErrorKey("CONFLICT")).toBe("aliases.errors.conflict");
    expect(aliasErrorKey("NOT_FOUND")).toBe("aliases.errors.gone");
    expect(aliasErrorKey(null)).toBe("aliases.errors.failed");
  });
});

describe("placeLookupQuery", () => {
  it("searches the Arabic spelling when the row has one, with the area", () => {
    expect(placeLookupQuery({ nameAsWritten: "Bakouri", nameAr: "بكوري" }, "Blue Nile")).toBe("بكوري, Blue Nile");
  });

  it("searches the name as written for a row with no Arabic spelling", () => {
    expect(placeLookupQuery({ nameAsWritten: " Bakouri ", nameAr: null }, "Blue Nile")).toBe("Bakouri, Blue Nile");
    expect(placeLookupQuery({ nameAsWritten: "Bakouri", nameAr: "  " }, "Sudan")).toBe("Bakouri, Sudan");
  });
});

describe("placeLookupView", () => {
  const box = (west: number, south: number, east: number, north: number) => ({
    type: "Polygon",
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  });

  it("is the middle of the area, at a zoom that shows it", () => {
    // About the size of Blue Nile state.
    expect(placeLookupView(box(33.1, 9.5, 35.1, 12.7))).toEqual({ lat: 11.1, lng: 34.1, zoom: 6 });
  });

  it("reads every part of a MultiPolygon", () => {
    const parts = { type: "MultiPolygon", coordinates: [box(33, 10, 34, 11).coordinates, box(35, 12, 36, 13).coordinates] };
    expect(placeLookupView(parts)).toEqual({ lat: 11.5, lng: 34.5, zoom: 6 });
  });

  it("zooms out for a country and stops at a town's zoom for a small area", () => {
    expect(placeLookupView(box(21.8, 8.7, 38.6, 22.2))?.zoom).toBe(4);
    expect(placeLookupView({ coordinates: [34.36, 11.78] })).toEqual({ lat: 11.78, lng: 34.36, zoom: 12 });
  });

  it("is null with no usable position", () => {
    expect(placeLookupView(null)).toBeNull();
    expect(placeLookupView({ coordinates: [] })).toBeNull();
    expect(placeLookupView({ coordinates: [[NaN, 1]] })).toBeNull();
  });
});

describe("placeLookupLinks", () => {
  const view = { lat: 11.1, lng: 34.1, zoom: 6 };

  it("opens the two maps on the area and searches the web", () => {
    expect(placeLookupLinks("Bakouri, Blue Nile", view)).toEqual([
      { provider: "google_maps", href: "https://www.google.com/maps/search/Bakouri%2C%20Blue%20Nile/@11.1,34.1,6z" },
      {
        provider: "openstreetmap",
        href: "https://www.openstreetmap.org/search?query=Bakouri%2C%20Blue%20Nile#map=6/11.1/34.1",
      },
      { provider: "web_search", href: "https://www.google.com/search?q=Bakouri%2C%20Blue%20Nile" },
    ]);
  });

  it("searches without a view until the area is known", () => {
    const links = placeLookupLinks("Bakouri, Sudan", null);
    expect(links.map((l) => l.href)).toEqual([
      "https://www.google.com/maps/search/?api=1&query=Bakouri%2C%20Sudan",
      "https://www.openstreetmap.org/search?query=Bakouri%2C%20Sudan",
      "https://www.google.com/search?q=Bakouri%2C%20Sudan",
    ]);
  });

  it("encodes the name, so it cannot change the link", () => {
    const [google, osm, web] = placeLookupLinks("بكوري/../?x=1&y#z, Blue Nile", view);
    for (const link of [google!, osm!, web!]) {
      const url = new URL(link.href);
      expect(url.hostname).toMatch(/^www\.(google\.com|openstreetmap\.org)$/);
      expect(link.href).toContain(encodeURIComponent("بكوري/../?x=1&y#z, Blue Nile"));
    }
    expect(new URL(google!.href).pathname.split("/")).toHaveLength(5);
    expect(new URL(osm!.href).searchParams.get("query")).toBe("بكوري/../?x=1&y#z, Blue Nile");
    expect(new URL(osm!.href).hash).toBe("#map=6/11.1/34.1");
    expect(new URL(web!.href).searchParams.get("q")).toBe("بكوري/../?x=1&y#z, Blue Nile");
  });
});
