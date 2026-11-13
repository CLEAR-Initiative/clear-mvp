import { describe, expect, it } from "vitest";
import { getHazardName, getTypeChips } from "./disaster-types";

describe("getHazardName", () => {
  it("names a GLIDE code by its short name, whatever its case", () => {
    expect(getHazardName("fl")).toBe("Flood");
    expect(getHazardName("FL")).toBe("Flood");
    expect(getHazardName("ec")).toBe("Extratropical cyclone");
    expect(getHazardName("ba")).toBe("Armed clash");
    expect(getHazardName("rm")).toBe("Shelling or missiles");
  });

  it("shows an unknown code as the fallback, else as is, uppercased", () => {
    expect(getHazardName("zz", "New type")).toBe("New type");
    expect(getHazardName("zz")).toBe("ZZ");
  });
});

describe("getTypeChips", () => {
  const labels = (types: string[]) => getTypeChips(types).map((c) => c.label);

  it("gives a type its short name, its map glyph and its pill colours", () => {
    expect(getTypeChips(["RS"])).toEqual([
      {
        key: "explosive-hazard",
        label: "Air or drone strike",
        icon: "/images/ui-kit/signals/icons/explosive-hazard.svg",
        color: "var(--color-critical)",
        bg: "var(--color-critical-light)",
        codes: ["rs"],
      },
    ]);
    expect(getTypeChips(["ep"])[0]).toMatchObject({ key: "disease", label: "Epidemic", color: "var(--color-success)" });
  });

  it("puts types that share a glyph on one chip", () => {
    expect(getTypeChips(["rs", "pw"])).toMatchObject([{ key: "explosive-hazard", label: "Air or drone strike, Disrupted weapons use", codes: ["rs", "pw"] }]);
    // The leftover duplicate code reads once.
    expect(getTypeChips(["vc", "vd"])).toMatchObject([{ label: "Abduction", codes: ["vc", "vd"] }]);
  });

  it("gives each glyph its own chip, in the event's order", () => {
    expect(labels(["fa", "fc"])).toEqual(["Famine", "Economic crisis"]);
    expect(labels(["fr", "va"])).toEqual(["Fire", "Attack"]);
  });

  it("leaves out hidden types and repeats", () => {
    expect(labels(["ce", "fa", "FA"])).toEqual(["Famine"]);
    expect(getTypeChips(["ce"])).toEqual([]);
  });

  it("drops a catch-all type next to a specific one, and names it by its top-level type alone", () => {
    expect(labels(["ac", "ot"])).toEqual(["Technological disaster"]);
    expect(labels(["ba", "po"])).toEqual(["Armed clash"]);
    expect(getTypeChips(["ot"])).toMatchObject([{ label: "Natural hazard", key: "cat-natural-disasters" }]);
    expect(getTypeChips(["ce", "ot", "po"])).toMatchObject([
      { label: "Natural hazard", key: "cat-natural-disasters" },
      { label: "Conflict", key: "conflict" },
    ]);
  });

  it("shows an unknown code as is, with the catch-all glyph", () => {
    expect(getTypeChips(["zz"])).toMatchObject([{ label: "ZZ", key: "cat-other-operations", color: "var(--color-text-secondary)" }]);
  });
});
