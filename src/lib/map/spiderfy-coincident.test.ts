import { describe, expect, it } from "vitest";
import { spiderfyCoincidentLngLats } from "./spiderfy-coincident";

describe("spiderfyCoincidentLngLats", () => {
  it("leaves solitary pins unmoved", () => {
    const out = spiderfyCoincidentLngLats([
      { id: 1, lng: 30, lat: 14 },
      { id: 2, lng: 31, lat: 15 },
    ]);
    expect(out.get(1)).toEqual([30, 14]);
    expect(out.get(2)).toEqual([31, 15]);
  });

  it("fans out pins that share a grid cell so badge count can match visible dots", () => {
    // Matches the local QA log: badge 3 / uniquePositions 2.
    const out = spiderfyCoincidentLngLats([
      { id: "a", lng: 30.0, lat: 14.0 },
      { id: "b", lng: 30.0, lat: 14.0 }, // stacked on a
      { id: "c", lng: 30.01, lat: 14.01 },
    ]);
    expect(out.size).toBe(3);
    expect(out.get("c")).toEqual([30.01, 14.01]);

    const a = out.get("a")!;
    const b = out.get("b")!;
    expect(a).not.toEqual(b);
    // Still near the shared anchor.
    expect(Math.hypot(a[0] - 30, a[1] - 14)).toBeLessThan(0.01);
    expect(Math.hypot(b[0] - 30, b[1] - 14)).toBeLessThan(0.01);
  });

  it("treats near-identical coordinates (same 4-decimal grid) as coincident", () => {
    const out = spiderfyCoincidentLngLats([
      { id: 1, lng: 30.00001, lat: 14.00001 },
      { id: 2, lng: 30.00002, lat: 14.00002 },
    ]);
    const p1 = out.get(1)!;
    const p2 = out.get(2)!;
    expect(p1).not.toEqual(p2);
    expect(Math.abs(p1[0] - p2[0])).toBeGreaterThan(0.001);
  });
});
