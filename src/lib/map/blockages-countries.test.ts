import { describe, expect, it } from "vitest";
import {
  BLOCKAGES_SHIPPED_ISO3,
  blockagesIso3ForMapScope,
  countryNameToBlockagesIso3,
  normalizeBlockagesIso3,
} from "./blockages-countries";

describe("countryNameToBlockagesIso3", () => {
  it("maps Sudan, Afghanistan, and Venezuela (incl. COD alias)", () => {
    expect(countryNameToBlockagesIso3("Sudan")).toBe("SDN");
    expect(countryNameToBlockagesIso3("Afghanistan")).toBe("AFG");
    expect(countryNameToBlockagesIso3("Venezuela")).toBe("VEN");
    expect(
      countryNameToBlockagesIso3("Venezuela (Bolivarian Republic of)"),
    ).toBe("VEN");
  });

  it("does not invent SDN for unknown or All Countries", () => {
    expect(countryNameToBlockagesIso3("All Countries")).toBeNull();
    expect(countryNameToBlockagesIso3("Atlantis")).toBeNull();
    expect(countryNameToBlockagesIso3(null)).toBeNull();
  });
});

describe("blockagesIso3ForMapScope", () => {
  it("returns one ISO3 for a focused country", () => {
    expect(
      blockagesIso3ForMapScope({
        selectedCountry: "Afghanistan",
        teamCountryNames: ["Sudan", "Afghanistan", "Venezuela"],
      }),
    ).toEqual(["AFG"]);
  });

  it("merges unique team ISO3 codes on All Countries", () => {
    expect(
      blockagesIso3ForMapScope({
        selectedCountry: "All Countries",
        teamCountryNames: [
          "Sudan",
          "Afghanistan",
          "Venezuela (Bolivarian Republic of)",
          "Sudan",
        ],
      }),
    ).toEqual(["SDN", "AFG", "VEN"]);
  });

  it("ships the three CLEAR deployment countries", () => {
    expect(BLOCKAGES_SHIPPED_ISO3).toEqual(["SDN", "AFG", "VEN"]);
  });
});

describe("normalizeBlockagesIso3", () => {
  it("uppercases and rejects junk", () => {
    expect(normalizeBlockagesIso3("afg")).toBe("AFG");
    expect(normalizeBlockagesIso3("SDN")).toBe("SDN");
    expect(normalizeBlockagesIso3("SD")).toBeNull();
    expect(normalizeBlockagesIso3("")).toBeNull();
  });
});
