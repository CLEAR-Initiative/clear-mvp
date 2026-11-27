import { describe, expect, it } from "vitest";
import type { HierarchyLevel1 } from "~/components/disaster-type-picker";
import { NO_FILTERS, resolveMapFilters } from "./model";

const hierarchy: HierarchyLevel1[] = [
  {
    name: "natural hazard",
    groups: [
      { name: "flood", codes: ["fl", "ff"] },
      { name: "drought", codes: ["dr"] },
    ],
  },
  {
    name: "conflict",
    groups: [
      { name: "battles", codes: ["ba", "bg", "bo"] },
      { name: "riots", codes: ["rd", "ri"] },
    ],
  },
];

describe("resolveMapFilters", () => {
  it("fills in the category of a crisis type", () => {
    expect(resolveMapFilters({ category: null, crisisType: "battles" }, hierarchy)).toEqual({
      filters: { category: "conflict", crisisType: "battles" },
      changed: true,
    });
  });

  it("drops a crisis type outside the category", () => {
    expect(resolveMapFilters({ category: "natural hazard", crisisType: "battles" }, hierarchy)).toEqual({
      filters: { category: "natural hazard", crisisType: null },
      changed: true,
    });
  });

  it("drops unknown names", () => {
    expect(resolveMapFilters({ category: "weather", crisisType: "hail" }, hierarchy)).toEqual({
      filters: NO_FILTERS,
      changed: true,
    });
  });

  it("keeps a valid pair unchanged", () => {
    expect(resolveMapFilters({ category: "conflict", crisisType: "riots" }, hierarchy).changed).toBe(false);
  });
});
