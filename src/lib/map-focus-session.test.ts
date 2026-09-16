import { describe, expect, it } from "vitest";
import {
  clearMapFocusSession,
  insightsNavHrefFromFocusSession,
  mapNavHrefFromFocusSession,
  parseMapFocusSession,
  readMapFocusSession,
  writeMapFocusSession,
  type MapFocusSessionStorage,
} from "./map-focus-session";

function memoryStorage(): MapFocusSessionStorage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
  };
}

describe("parseMapFocusSession", () => {
  it("accepts entity focus", () => {
    expect(parseMapFocusSession({ kind: "crisis", id: "c1", label: "Flood" })).toEqual({
      kind: "crisis",
      id: "c1",
      label: "Flood",
    });
  });

  it("accepts place focus", () => {
    expect(
      parseMapFocusSession({
        kind: "place",
        id: "p1",
        label: "Khartoum",
        center: [32.5, 15.5],
        zoom: 11,
      }),
    ).toEqual({
      kind: "place",
      id: "p1",
      label: "Khartoum",
      center: [32.5, 15.5],
      zoom: 11,
    });
  });

  it("rejects invalid payloads", () => {
    expect(parseMapFocusSession(null)).toBeNull();
    expect(parseMapFocusSession({ kind: "crisis" })).toBeNull();
    expect(parseMapFocusSession({ kind: "place", id: "x", label: "y" })).toBeNull();
  });
});

describe("map focus session storage", () => {
  it("round-trips and clears", () => {
    const storage = memoryStorage();
    writeMapFocusSession({ kind: "event", id: "e1" }, storage);
    expect(readMapFocusSession(storage)).toEqual({ kind: "event", id: "e1" });
    clearMapFocusSession(storage);
    expect(readMapFocusSession(storage)).toBeNull();
  });
});

describe("nav hrefs from focus session", () => {
  it("keeps Map tab on entity focus query", () => {
    expect(mapNavHrefFromFocusSession({ kind: "crisis", id: "c1" })).toBe(
      "/map?crisis=c1",
    );
    expect(mapNavHrefFromFocusSession({ kind: "place", id: "p", label: "X", center: [1, 2], zoom: 10 })).toBe(
      "/map",
    );
    expect(mapNavHrefFromFocusSession(null)).toBe("/map");
  });

  it("routes Insights to crisis detail when crisis focus is active", () => {
    expect(insightsNavHrefFromFocusSession({ kind: "crisis", id: "c1" })).toBe(
      "/crisis/c1",
    );
    expect(insightsNavHrefFromFocusSession({ kind: "event", id: "e1" })).toBe(
      "/insights",
    );
    expect(insightsNavHrefFromFocusSession(null)).toBe("/insights");
  });
});
