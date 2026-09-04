import { describe, expect, it } from "vitest";
import {
  parseWorkingCountryCookie,
  resolveWorkingCountry,
  serializeWorkingCountryCookie,
  storedWorkingCountry,
  type WorkingCountryMap,
} from "./working-country-cookie";

const AF = { id: "af", name: "Afghanistan" };
const SD = { id: "sd", name: "Sudan" };
const VE = { id: "ve", name: "Venezuela (Bolivarian Republic of)" };
const MULTI = [AF, SD, VE];

describe("parseWorkingCountryCookie", () => {
  it("reads the { id, name } shape", () => {
    expect(
      parseWorkingCountryCookie(JSON.stringify({ team1: { id: "sd", name: "Sudan" } })),
    ).toEqual({ team1: { id: "sd", name: "Sudan" } });
  });

  it("reads an encodeURIComponent cookie (how we write document.cookie)", () => {
    const raw = JSON.stringify({ team1: { id: "ve", name: VE.name } });
    expect(parseWorkingCountryCookie(encodeURIComponent(raw))).toEqual({
      team1: { id: "ve", name: VE.name },
    });
  });

  it("accepts a legacy team→locationId string", () => {
    expect(parseWorkingCountryCookie(JSON.stringify({ team1: "sd" }))).toEqual({
      team1: { id: "sd", name: "" },
    });
  });

  it("returns empty object for missing or junk", () => {
    expect(parseWorkingCountryCookie(undefined)).toEqual({});
    expect(parseWorkingCountryCookie("")).toEqual({});
    expect(parseWorkingCountryCookie("not-json")).toEqual({});
    expect(parseWorkingCountryCookie("[]")).toEqual({});
    expect(parseWorkingCountryCookie(JSON.stringify(null))).toEqual({});
  });

  it("drops entries that are not a location id or { id, name }", () => {
    const value = JSON.stringify({ "team-1": "loc-a", "team-2": 123 });
    expect(parseWorkingCountryCookie(value)).toEqual({
      "team-1": { id: "loc-a", name: "" },
    });
  });
});

describe("serializeWorkingCountryCookie", () => {
  it("round-trips a valid map", () => {
    const original: WorkingCountryMap = {
      "team-1": { id: "sd", name: "Sudan" },
    };
    expect(parseWorkingCountryCookie(serializeWorkingCountryCookie(original))).toEqual(
      original,
    );
  });

  it("serializes an empty map", () => {
    expect(serializeWorkingCountryCookie({})).toBe("{}");
  });
});

describe("storedWorkingCountry", () => {
  const map = { team1: SD };

  it("returns the entry for the active team", () => {
    expect(storedWorkingCountry(map, "team1")).toEqual(SD);
  });

  it("uses the only entry while the team id has not hydrated", () => {
    expect(storedWorkingCountry(map, null)).toEqual(SD);
  });

  it("does not guess when several teams are stored and none is active", () => {
    expect(storedWorkingCountry({ team1: SD, team2: VE }, null)).toBeNull();
  });
});

describe("resolveWorkingCountry", () => {
  it("holds the cookie country while scope is still loading", () => {
    expect(resolveWorkingCountry([], VE, false)).toEqual(VE);
  });

  it("honours a stored id that is still in scope", () => {
    expect(resolveWorkingCountry(MULTI, VE, true)).toEqual(VE);
  });

  it("honours a stored name when the id is a leftover", () => {
    expect(resolveWorkingCountry(MULTI, { id: "stale", name: "Sudan" }, true)).toEqual(SD);
  });

  it("defaults to the first scoped country when the store is empty or out of scope", () => {
    expect(resolveWorkingCountry(MULTI, null, true)).toEqual(AF);
    expect(resolveWorkingCountry(MULTI, { id: "xx", name: "Chad" }, true)).toEqual(AF);
  });

  it("holds an unscoped pick after scope is ready", () => {
    expect(resolveWorkingCountry([], VE, true)).toEqual(VE);
  });

  it("does not hold All Countries as an unscoped pick", () => {
    expect(
      resolveWorkingCountry([], { id: "", name: "All Countries" }, true),
    ).toBeNull();
  });
});
