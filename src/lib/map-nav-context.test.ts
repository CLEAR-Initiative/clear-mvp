import { afterEach, describe, expect, it } from "vitest";
import {
  ALL_COUNTRIES,
  getDefaultMapNavContext,
  isMapNavQueryReady,
  isMapNavScoped,
  readMapNavContext,
  readMapNavEventIds,
  readMapNavSignalIds,
  resolveMapNavContext,
  writeMapNavContext,
  writeMapNavEventIds,
  writeMapNavSignalIds,
  type MapNavContext,
} from "~/lib/map-nav-context";

const LOCATION_IDS: Record<string, string> = {
  Sudan: "loc-sudan",
  Venezuela: "loc-venezuela",
  Khartoum: "loc-khartoum",
};

function getLocationId(name: string): string | null {
  return LOCATION_IDS[name] ?? null;
}

function emptyGetLocationId(): null {
  return null;
}

afterEach(() => {
  sessionStorage.clear();
});

describe("resolveMapNavContext", () => {
  it("keeps a stored locationId so arrow nav stays country-scoped", () => {
    const stored: MapNavContext = {
      teamId: "team-1",
      locationId: "loc-sudan",
      country: "Sudan",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
    };
    writeMapNavContext(stored);

    expect(resolveMapNavContext(getLocationId, "team-1")).toMatchObject({
      locationId: "loc-sudan",
      country: "Sudan",
    });
  });

  it("recovers locationId from stored country when locationId was null", () => {
    writeMapNavContext({
      teamId: "team-1",
      locationId: null,
      country: "Sudan",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
    });

    expect(resolveMapNavContext(getLocationId, "team-1").locationId).toBe(
      "loc-sudan",
    );
  });

  it("recovers region locationId when a region filter was active", () => {
    writeMapNavContext({
      teamId: "team-1",
      locationId: null,
      country: "Sudan",
      region: "Khartoum",
    });

    expect(resolveMapNavContext(getLocationId, "team-1").locationId).toBe(
      "loc-khartoum",
    );
  });

  it("leaves locationId null until the locations tree can resolve a scoped country", () => {
    writeMapNavContext({
      teamId: "team-1",
      locationId: null,
      country: "Sudan",
    });

    expect(resolveMapNavContext(emptyGetLocationId, "team-1").locationId).toBeNull();
    expect(isMapNavQueryReady(resolveMapNavContext(emptyGetLocationId, "team-1"))).toBe(
      false,
    );
  });

  it("allows an unscoped All Countries query immediately", () => {
    writeMapNavContext({
      teamId: "team-1",
      locationId: null,
      country: ALL_COUNTRIES,
    });

    const ctx = resolveMapNavContext(getLocationId, "team-1");
    expect(ctx.locationId).toBeNull();
    expect(isMapNavQueryReady(ctx)).toBe(true);
    expect(isMapNavScoped(ctx)).toBe(false);
  });

  it("defaults to All Countries when nothing is stored", () => {
    const ctx = resolveMapNavContext(getLocationId, "team-1");
    expect(ctx.country).toBe(ALL_COUNTRIES);
    expect(ctx.locationId).toBeNull();
    expect(isMapNavQueryReady(ctx)).toBe(true);
  });
});

describe("getDefaultMapNavContext", () => {
  it("seeds a 30d window with All Countries", () => {
    const ctx = getDefaultMapNavContext(null);
    expect(ctx.country).toBe(ALL_COUNTRIES);
    expect(ctx.locationId).toBeNull();
    expect(ctx.from).toBeTruthy();
    expect(ctx.to).toBeTruthy();
  });
});

describe("writeMapNavContext / readMapNavContext", () => {
  it("round-trips country with the rest of the context", () => {
    const ctx: MapNavContext = {
      teamId: null,
      locationId: "loc-venezuela",
      country: "Venezuela",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
    };
    writeMapNavContext(ctx);
    expect(readMapNavContext()).toEqual(ctx);
  });
});

describe("map nav id lists", () => {
  it("round-trips event and signal ids", () => {
    writeMapNavEventIds(["e1", "e2", "e3"]);
    writeMapNavSignalIds(["s1", "s2"]);
    expect(readMapNavEventIds()).toEqual(["e1", "e2", "e3"]);
    expect(readMapNavSignalIds()).toEqual(["s1", "s2"]);
  });

  it("returns null for empty or invalid payloads", () => {
    writeMapNavEventIds([]);
    expect(readMapNavEventIds()).toBeNull();
    sessionStorage.setItem("map-nav-event-ids", "{not-json");
    expect(readMapNavEventIds()).toBeNull();
  });
});
