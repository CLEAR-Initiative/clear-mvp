import { describe, expect, it } from "vitest";
import { nrcLocations } from "./nrc-locations";
import { NRC_OPERATING_COUNTRIES, bboxPolygon, nrcOperatingCountry } from "./nrc-operating-countries";

describe("NRC_OPERATING_COUNTRIES", () => {
  it("lists each country once, by ISO 3166-1 alpha-2", () => {
    const isos = NRC_OPERATING_COUNTRIES.map((c) => c.iso2);
    expect(new Set(isos).size).toBe(isos.length);
    for (const iso of isos) expect(iso).toMatch(/^[A-Z]{2}$/);
    for (const c of NRC_OPERATING_COUNTRIES) expect(c.iso3, c.name).toMatch(/^[A-Z]{3}$/);
  });

  it("carries only public fields, never fact sheet figures", () => {
    for (const c of NRC_OPERATING_COUNTRIES) {
      expect(Object.keys(c).sort()).toEqual(["bbox", "iso2", "iso3", "name", "pinCity", "pinLngLat"]);
    }
  });

  it("pins every country inside its own frame", () => {
    for (const c of NRC_OPERATING_COUNTRIES) {
      const [w, s, e, n] = c.bbox;
      const [lng, lat] = c.pinLngLat;
      expect(w, c.name).toBeLessThan(e);
      expect(s, c.name).toBeLessThan(n);
      expect(lng, c.name).toBeGreaterThanOrEqual(w);
      expect(lng, c.name).toBeLessThanOrEqual(e);
      expect(lat, c.name).toBeGreaterThanOrEqual(s);
      expect(lat, c.name).toBeLessThanOrEqual(n);
    }
  });

  it("uses the names the Overview right panel looks up", () => {
    const known = new Set(nrcLocations.map((l) => l.country));
    for (const c of NRC_OPERATING_COUNTRIES) expect(known.has(c.name), c.name).toBe(true);
  });

  it("pins Sudan at Port Sudan, where the country office moved", () => {
    expect(nrcOperatingCountry("sd")?.pinCity).toBe("Port Sudan");
  });
});

describe("nrcOperatingCountry", () => {
  it("returns undefined for a missing or non-operating code", () => {
    expect(nrcOperatingCountry(null)).toBeUndefined();
    expect(nrcOperatingCountry("NO")).toBeUndefined();
  });
});

describe("bboxPolygon", () => {
  it("closes the rectangle", () => {
    expect(bboxPolygon([1, 2, 3, 4]).coordinates[0]).toEqual([[1, 2], [3, 2], [3, 4], [1, 4], [1, 2]]);
  });
});
