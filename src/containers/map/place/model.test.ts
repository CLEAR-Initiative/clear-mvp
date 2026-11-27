import { describe, expect, it } from "vitest";
import { resolvePlace, type PlaceTree } from "./model";

const tree: PlaceTree = [
  {
    id: "sd",
    name: "Sudan",
    states: [{ id: "sd-kh", name: "Khartoum", districts: [{ id: "sd-kh-1", name: "Bahri" }] }],
  },
  { id: "af", name: "Afghanistan", states: [{ id: "af-ka", name: "Kabul", districts: [] }] },
];

const sudan = { kind: "country", id: "sd", name: "Sudan" };
const scope = ["sd"];

describe("resolvePlace", () => {
  it("reads global", () => {
    expect(resolvePlace("global", tree, scope, "sd")).toEqual({ place: { kind: "global" }, invalid: false });
  });

  it("reads a country in scope", () => {
    expect(resolvePlace("sd", tree, scope, null)).toEqual({ place: sudan, invalid: false });
  });

  it("attaches the country to a state", () => {
    expect(resolvePlace("sd-kh", tree, scope, null)).toEqual({
      place: { kind: "state", id: "sd-kh", name: "Khartoum", country: { id: "sd", name: "Sudan" } },
      invalid: false,
    });
  });

  it("resolves a district to its state", () => {
    expect(resolvePlace("sd-kh-1", tree, scope, null).place).toMatchObject({ kind: "state", id: "sd-kh" });
  });

  it("falls back to the Working country for an unknown id and flags it", () => {
    expect(resolvePlace("nowhere", tree, scope, "sd")).toEqual({ place: sudan, invalid: true });
  });

  it("rejects a country outside the scope, and its states", () => {
    expect(resolvePlace("af", tree, scope, "sd")).toEqual({ place: sudan, invalid: true });
    expect(resolvePlace("af-ka", tree, scope, "sd")).toEqual({ place: sudan, invalid: true });
  });

  it("follows the Working country without a param", () => {
    expect(resolvePlace(null, tree, scope, "sd")).toEqual({ place: sudan, invalid: false });
  });

  it("is global without a param or a Working country", () => {
    expect(resolvePlace(null, tree, null, null)).toEqual({ place: { kind: "global" }, invalid: false });
  });

  it("accepts any country for an unscoped team", () => {
    expect(resolvePlace("af", tree, null, null).place).toEqual({ kind: "country", id: "af", name: "Afghanistan" });
  });
});
