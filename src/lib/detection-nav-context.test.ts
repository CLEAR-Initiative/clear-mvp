import { afterEach, describe, expect, it } from "vitest";
import {
  defaultMapNavTimeWindow,
  getDefaultDetectionNavContext,
  readDetectionNavContext,
  readDetectionNavEventIds,
  readDetectionNavSignalIds,
  resolveDetailNavIds,
  resolveDetectionNavContext,
  writeDetectionNavContext,
  writeDetectionNavEventIds,
  writeDetectionNavSignalIds,
  type DetectionNavContext,
} from "~/lib/detection-nav-context";

const LOCATION_IDS: Record<string, string> = {
  Sudan: "loc-sudan",
  Venezuela: "loc-venezuela",
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

describe("resolveDetectionNavContext", () => {
  it("keeps a stored locationId so arrow nav stays country-scoped", () => {
    const stored: DetectionNavContext = {
      teamId: "team-1",
      locationId: "loc-venezuela",
      country: "Venezuela",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
      orderBy: "LAST_SIGNAL_DESC",
    };
    writeDetectionNavContext(stored);

    expect(resolveDetectionNavContext(getLocationId, "team-1")).toMatchObject({
      locationId: "loc-venezuela",
      country: "Venezuela",
    });
  });

  it("recovers locationId from stored country when locationId was null", () => {
    writeDetectionNavContext({
      teamId: "team-1",
      locationId: null,
      country: "Venezuela",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
      orderBy: "LAST_SIGNAL_DESC",
    });

    expect(resolveDetectionNavContext(getLocationId, "team-1").locationId).toBe(
      "loc-venezuela",
    );
  });

  it("recovers locationId from detection-filters country as a fallback", () => {
    sessionStorage.setItem(
      "detection-filters",
      JSON.stringify({ country: "Venezuela" }),
    );
    writeDetectionNavContext({
      teamId: "team-1",
      locationId: null,
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
      orderBy: "LAST_SIGNAL_DESC",
    });

    expect(resolveDetectionNavContext(getLocationId, "team-1").locationId).toBe(
      "loc-venezuela",
    );
  });

  it("leaves locationId null until the locations tree can resolve it", () => {
    writeDetectionNavContext({
      teamId: "team-1",
      locationId: null,
      country: "Venezuela",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
      orderBy: "LAST_SIGNAL_DESC",
    });

    expect(resolveDetectionNavContext(emptyGetLocationId, "team-1").locationId).toBeNull();
  });

  it("defaults to Sudan when nothing is stored", () => {
    const ctx = resolveDetectionNavContext(getLocationId, "team-1");
    expect(ctx.locationId).toBe("loc-sudan");
    expect(ctx.country).toBe("Sudan");
  });
});

describe("getDefaultDetectionNavContext", () => {
  it("includes country so locationId can be resolved later", () => {
    const ctx = getDefaultDetectionNavContext(emptyGetLocationId, null);
    expect(ctx.country).toBe("Sudan");
    expect(ctx.locationId).toBeNull();
  });
});

describe("writeDetectionNavContext / readDetectionNavContext", () => {
  it("round-trips country with the rest of the context", () => {
    const ctx: DetectionNavContext = {
      teamId: null,
      locationId: "loc-venezuela",
      country: "Venezuela",
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T00:00:00.000Z",
      orderBy: "LAST_SIGNAL_DESC",
    };
    writeDetectionNavContext(ctx);
    expect(readDetectionNavContext()).toEqual(ctx);
  });
});

describe("detection nav id lists", () => {
  it("round-trips event and signal ids", () => {
    writeDetectionNavEventIds(["e1", "e2", "e3"]);
    writeDetectionNavSignalIds(["s1", "s2"]);
    expect(readDetectionNavEventIds()).toEqual(["e1", "e2", "e3"]);
    expect(readDetectionNavSignalIds()).toEqual(["s1", "s2"]);
  });

  it("returns null for empty or invalid payloads", () => {
    writeDetectionNavEventIds([]);
    expect(readDetectionNavEventIds()).toBeNull();
    sessionStorage.setItem("detection-nav-event-ids", "{not-json");
    expect(readDetectionNavEventIds()).toBeNull();
  });
});

describe("resolveDetailNavIds", () => {
  it("prefers the stored Detection list over a re-queried page", () => {
    expect(resolveDetailNavIds(["a", "b", "c"], ["c", "d"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("falls back to queried ids when nothing was stored", () => {
    expect(resolveDetailNavIds(null, ["x", "y"])).toEqual(["x", "y"]);
    expect(resolveDetailNavIds([], ["x", "y"])).toEqual(["x", "y"]);
  });
});

describe("defaultMapNavTimeWindow", () => {
  it("returns a ~30 day window ending near now", () => {
    const { from, to } = defaultMapNavTimeWindow();
    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);
    expect(Number.isFinite(fromMs)).toBe(true);
    expect(Number.isFinite(toMs)).toBe(true);
    const days = (toMs - fromMs) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });
});
