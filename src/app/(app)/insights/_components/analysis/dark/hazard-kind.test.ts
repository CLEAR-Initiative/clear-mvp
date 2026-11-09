import { describe, expect, it } from "vitest";
import { hazardKind } from "./hazard-kind";

describe("hazardKind", () => {
  it.each([
    ["Armed conflict", "conflict"],
    ["Drone strikes and shelling", "conflict"],
    ["Attacks on healthcare", "conflict"],
    ["Explosive ordnance", "conflict"],
    ["Cholera", "health"],
    ["Hepatitis E and dengue", "health"],
    ["Famine risk", "food"],
    ["Desert locusts", "food"],
    ["El Niño drought", "drought"],
    ["Record low rainfall", "drought"],
    ["Flood risk", "water"],
    ["Severe storm", "water"],
    ["Fires in IDP sites", "fire"],
    ["Livestock losses", "food"],
  ] as const)("%s is %s", (label, kind) => {
    expect(hazardKind(label)).toBe(kind);
  });

  it("does not match inside other words", () => {
    expect(hazardKind("Shelter damage")).toBe("other");
    expect(hazardKind("Ceasefire talks stalled")).toBe("other");
    expect(hazardKind("Wheat prices")).toBe("other");
    expect(hazardKind("Training gaps")).toBe("other");
    // Access has its own section, so an access hazard gets the plain tile.
    expect(hazardKind("Access constraints")).toBe("other");
  });

  it("falls back to the detail when the label names no kind", () => {
    expect(hazardKind("El Obeid under threat", "About 500,000 civilians at risk from strikes")).toBe("conflict");
    expect(hazardKind("Khartoum State", "Severe drought killed up to 80% of herds")).toBe("drought");
    expect(hazardKind("Complex emergency", "600,000 people in camps")).toBe("other");
  });
});
