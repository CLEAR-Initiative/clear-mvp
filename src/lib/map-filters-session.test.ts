import { afterEach, describe, expect, it } from "vitest";
import {
  MAP_FILTERS_SESSION_STORAGE_KEY,
  readMapFiltersSession,
  writeMapFiltersSession,
} from "~/lib/map-filters-session";

afterEach(() => sessionStorage.clear());

describe("Map filters session", () => {
  it("round-trips region and timeframe for their country", () => {
    writeMapFiltersSession({ country: "Sudan", region: "North Darfur", timeframe: "90d" });
    expect(readMapFiltersSession()).toEqual({ country: "Sudan", region: "North Darfur", timeframe: "90d" });
  });

  it("leaves All Regions out", () => {
    writeMapFiltersSession({ country: "Sudan", region: "All Regions", timeframe: "30d" });
    expect(readMapFiltersSession()).toEqual({ country: "Sudan", timeframe: "30d" });
  });

  it("ignores anything malformed", () => {
    sessionStorage.setItem(MAP_FILTERS_SESSION_STORAGE_KEY, '{"country":"Sudan","timeframe":"forever"}');
    expect(readMapFiltersSession()).toBeNull();
    sessionStorage.setItem(MAP_FILTERS_SESSION_STORAGE_KEY, "not json");
    expect(readMapFiltersSession()).toBeNull();
  });
});
