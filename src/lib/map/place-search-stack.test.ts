import { describe, expect, it } from "vitest";
import type { GeocodeHit } from "./geocode-lookup";
import {
  composeStackedPlaceQuery,
  decideStack,
  pickStackedPlaceHit,
  rankStackedPlaceHits,
  recommendationScope,
  searchBiasFromFilters,
  type PlaceSearchFilter,
} from "./place-search-stack";

function hit(partial: Partial<GeocodeHit> & Pick<GeocodeHit, "id" | "label" | "center">): GeocodeHit {
  return {
    placeTypes: ["poi"],
    ...partial,
  };
}

const sudan = hit({
  id: "country.sd",
  label: "Sudan",
  center: [30, 15],
  placeTypes: ["country"],
  countryName: "Sudan",
  countryCode: "SD",
});

describe("composeStackedPlaceQuery", () => {
  it("joins committed tokens", () => {
    expect(composeStackedPlaceQuery(["sudan", " national museum "])).toBe(
      "sudan national museum",
    );
  });
});

describe("pickStackedPlaceHit", () => {
  it("keeps the first hit when nothing is stacked yet", () => {
    const beirut = hit({
      id: "poi.beirut",
      label: "National Museum, Beirut, Lebanon",
      center: [35.5, 33.9],
      countryCode: "LB",
      countryName: "Lebanon",
    });
    expect(pickStackedPlaceHit([beirut], null)?.id).toBe("poi.beirut");
  });

  it("pins the closest in-country landmark, not another country's museum", () => {
    const beirut = hit({
      id: "poi.beirut",
      label: "National Museum, Beirut, Lebanon",
      center: [35.5, 33.9],
      countryCode: "LB",
      countryName: "Lebanon",
    });
    const khartoum = hit({
      id: "poi.khartoum",
      label: "Sudan National Museum, Khartoum, Sudan",
      center: [32.55, 15.6],
      countryCode: "SD",
      countryName: "Sudan",
    });
    const farSudan = hit({
      id: "poi.nyala",
      label: "National Museum, Nyala, Sudan",
      center: [24.88, 12.05],
      countryCode: "SD",
      countryName: "Sudan",
    });

    const ranked = rankStackedPlaceHits([beirut, farSudan, khartoum], {
      center: sudan.center,
      countryCode: "SD",
      countryName: "Sudan",
    });
    expect(ranked.map((h) => h.id)).toEqual(["poi.khartoum", "poi.nyala"]);
    expect(pickStackedPlaceHit([beirut, farSudan, khartoum], sudan)?.id).toBe(
      "poi.khartoum",
    );
  });

  it("returns null when every hit is outside the committed country", () => {
    const beirut = hit({
      id: "poi.beirut",
      label: "National Museum, Beirut, Lebanon",
      center: [35.5, 33.9],
      countryCode: "LB",
      countryName: "Lebanon",
    });
    expect(pickStackedPlaceHit([beirut], sudan)).toBeNull();
  });
});

describe("decideStack", () => {
  const sudanPill: PlaceSearchFilter = { id: "1", text: "sudan", hit: sudan };
  const france = hit({
    id: "country.fr",
    label: "France",
    center: [2.3, 46.2],
    placeTypes: ["country"],
    countryName: "France",
    countryCode: "FR",
  });
  const khartoum = hit({
    id: "place.krt",
    label: "Khartoum, Sudan",
    center: [32.53, 15.5],
    placeTypes: ["place"],
    countryName: "Sudan",
    countryCode: "SD",
  });
  const museum = hit({
    id: "poi.museum",
    label: "Sudan National Museum, Khartoum, Sudan",
    center: [32.51, 15.6],
    placeTypes: ["poi"],
    countryName: "Sudan",
    countryCode: "SD",
  });

  it("blocks a second country instead of stacking it", () => {
    expect(decideStack([sudanPill], france)).toBe("conflict-country");
    expect(decideStack([sudanPill], sudan)).toBe("reject");
  });

  it("allows a city or landmark inside the committed country", () => {
    expect(decideStack([sudanPill], khartoum)).toBe("allow");
    expect(decideStack([sudanPill], museum)).toBe("allow");
  });

  it("rejects a landmark in a different country", () => {
    const beirut = hit({
      id: "poi.beirut",
      label: "National Museum, Beirut, Lebanon",
      center: [35.5, 33.9],
      placeTypes: ["poi"],
      countryCode: "LB",
      countryName: "Lebanon",
    });
    expect(decideStack([sudanPill], beirut)).toBe("reject");
  });
});

describe("recommendationScope", () => {
  const sudanPill: PlaceSearchFilter = { id: "1", text: "sudan", hit: sudan };
  const khartoum = hit({
    id: "place.krt",
    label: "Khartoum, Sudan",
    center: [32.53, 15.5],
    placeTypes: ["place"],
    countryName: "Sudan",
    countryCode: "SD",
    bbox: [32.4, 15.4, 32.7, 15.7],
  });

  it("scopes a typed query to cities and landmarks in the committed country", () => {
    expect(recommendationScope([sudanPill])).toEqual({
      country: "sd",
      proximity: [30, 15],
      types: "place,locality,district,neighborhood,poi,address",
    });
  });

  it("scopes a typed query to landmarks inside the committed city", () => {
    expect(
      recommendationScope([sudanPill, { id: "2", text: "khartoum", hit: khartoum }]),
    ).toEqual({
      country: "sd",
      proximity: [32.53, 15.5],
      types: "poi,address,neighborhood",
      bbox: [32.4, 15.4, 32.7, 15.7],
    });
  });
});

describe("searchBiasFromFilters", () => {
  it("biases the next query to the last pill's country and center", () => {
    expect(
      searchBiasFromFilters([{ id: "1", text: "sudan", hit: sudan }]),
    ).toEqual({ country: "sd", proximity: [30, 15] });
  });
});
