import { describe, expect, it } from "vitest";
import {
  flattenLocationTree,
  resolveLocationName,
  resolveNameFromAncestorIds,
} from "./location";
import type { GqlLocation } from "~/lib/types/graphql";

describe("flattenLocationTree", () => {
  it("flattens a tree into id→{name,level} map", () => {
    const tree = [
      {
        id: "country-1",
        name: "Sudan",
        states: [
          {
            id: "state-1",
            name: "Khartoum",
            districts: [
              { id: "district-1", name: "Khartoum North" },
              { id: "district-2", name: "Omdurman" },
            ],
          },
          {
            id: "state-2",
            name: "West Darfur",
            districts: [{ id: "district-3", name: "El Geneina" }],
          },
        ],
      },
    ];

    const map = flattenLocationTree(tree);

    expect(map.get("country-1")).toEqual({ name: "Sudan", level: 0 });
    expect(map.get("state-1")).toEqual({ name: "Khartoum", level: 1 });
    expect(map.get("state-2")).toEqual({ name: "West Darfur", level: 1 });
    expect(map.get("district-1")).toEqual({ name: "Khartoum North", level: 2 });
    expect(map.get("district-2")).toEqual({ name: "Omdurman", level: 2 });
    expect(map.get("district-3")).toEqual({ name: "El Geneina", level: 2 });
    expect(map.size).toBe(6);
  });

  it("handles empty tree", () => {
    const map = flattenLocationTree([]);
    expect(map.size).toBe(0);
  });
});

describe("resolveNameFromAncestorIds", () => {
  const locationById = new Map([
    ["country-1", { name: "Sudan", level: 0 }],
    ["state-1", { name: "Khartoum", level: 1 }],
    ["district-1", { name: "Omdurman", level: 2 }],
    ["point-1", { name: "Some Point", level: 4 }],
  ]);

  it("returns most specific admin (A2 > A1 > A0)", () => {
    // Has A2, A1, A0 — should pick A2
    expect(
      resolveNameFromAncestorIds(["country-1", "state-1", "district-1"], locationById),
    ).toBe("Omdurman");

    // Has only A1, A0 — should pick A1
    expect(resolveNameFromAncestorIds(["country-1", "state-1"], locationById)).toBe(
      "Khartoum",
    );

    // Has only A0 — should pick A0
    expect(resolveNameFromAncestorIds(["country-1"], locationById)).toBe("Sudan");
  });

  it("skips levels > 2 and picks best remaining", () => {
    // Has L4 point and A1 — should skip L4, pick A1
    expect(resolveNameFromAncestorIds(["state-1", "point-1"], locationById)).toBe(
      "Khartoum",
    );
  });

  it("returns null when no ancestors ≤ 2", () => {
    expect(resolveNameFromAncestorIds(["point-1"], locationById)).toBeNull();
  });

  it("returns null when ancestorIds is empty", () => {
    expect(resolveNameFromAncestorIds([], locationById)).toBeNull();
  });

  it("returns null when ancestorIds is null/undefined", () => {
    expect(resolveNameFromAncestorIds(null, locationById)).toBeNull();
    expect(resolveNameFromAncestorIds(undefined, locationById)).toBeNull();
  });

  it("returns null when no ids found in map", () => {
    expect(resolveNameFromAncestorIds(["unknown-id"], locationById)).toBeNull();
  });
});

describe("resolveLocationName with locationById fallback", () => {
  const locationById = new Map([
    ["country-1", { name: "Sudan", level: 0 }],
    ["state-1", { name: "Khartoum", level: 1 }],
    ["district-1", { name: "Omdurman", level: 2 }],
  ]);

  it("returns name directly for L≤2", () => {
    const loc: GqlLocation = {
      id: "loc-1",
      name: "West Darfur",
      level: 1,
      ancestorIds: ["country-1"],
      geometry: null,
    };
    expect(resolveLocationName(loc, { locationById })).toBe("West Darfur");
  });

  it("prefers ancestors array when available", () => {
    const loc: GqlLocation = {
      id: "loc-1",
      name: "Point Name",
      level: 4,
      ancestorIds: ["country-1", "state-1", "district-1"],
      geometry: null,
      ancestors: [
        { id: "state-1", name: "Khartoum State", level: 1 },
        { id: "district-1", name: "Omdurman District", level: 2 },
      ],
    };
    // Should use ancestors array, not ancestorIds
    expect(resolveLocationName(loc, { locationById })).toBe("Omdurman District");
  });

  it("falls back to ancestorIds when ancestors array is missing", () => {
    const loc: GqlLocation = {
      id: "loc-1",
      name: "Point Name",
      level: 4,
      ancestorIds: ["country-1", "state-1", "district-1"],
      geometry: null,
    };
    // ancestors array missing → should use ancestorIds + locationById
    expect(resolveLocationName(loc, { locationById })).toBe("Omdurman");
  });

  it("returns null when L>2, no ancestors, no ancestorIds", () => {
    const loc: GqlLocation = {
      id: "loc-1",
      name: "Point Name",
      level: 4,
      ancestorIds: [],
      geometry: null,
    };
    expect(resolveLocationName(loc, { locationById })).toBeNull();
  });

  it("returns null when L>2, no ancestors, no locationById provided", () => {
    const loc: GqlLocation = {
      id: "loc-1",
      name: "Point Name",
      level: 4,
      ancestorIds: ["state-1"],
      geometry: null,
    };
    // No locationById option → can't resolve
    expect(resolveLocationName(loc)).toBeNull();
  });

  it("landmark-geocoded bypasses all fallbacks", () => {
    const loc: GqlLocation = {
      id: "loc-1",
      name: "Nyala Airport",
      level: 4,
      pointType: "landmark-geocoded",
      ancestorIds: ["country-1"],
      geometry: null,
    };
    expect(resolveLocationName(loc, { locationById })).toBe("Nyala Airport");
  });
});
