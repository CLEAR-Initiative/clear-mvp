import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  deriveSettledNavSegment,
  isMapNavOverlay,
  useOptimisticNavSegment,
} from "~/hooks/use-optimistic-nav-segment";

describe("deriveSettledNavSegment", () => {
  it("uses the active segment on non-detail routes", () => {
    expect(deriveSettledNavSegment("detection")).toBe("detection");
    expect(deriveSettledNavSegment("map", "detection")).toBe("map");
  });

  it("uses from= referrer on detail routes when present", () => {
    expect(deriveSettledNavSegment("event", "detection")).toBe("detection");
    expect(deriveSettledNavSegment("signal", "map")).toBe("map");
    expect(deriveSettledNavSegment("crisis", "insights")).toBe("insights");
  });

  it("falls back to the detail segment when referrer is missing", () => {
    expect(deriveSettledNavSegment("event")).toBe("event");
    expect(deriveSettledNavSegment("event", null)).toBe("event");
  });
});

describe("isMapNavOverlay", () => {
  it("is on while settled on /map even if optimism leaves", () => {
    expect(isMapNavOverlay("map", null)).toBe(true);
    expect(isMapNavOverlay("map", "detection")).toBe(true);
  });

  it("is on while optimistically heading to /map", () => {
    expect(isMapNavOverlay("detection", "map")).toBe(true);
    expect(isMapNavOverlay("event", "map")).toBe(true);
  });

  it("is off on detail pages even when from=map highlights Map", () => {
    // displaySegment would be "map" via deriveSettledNavSegment — overlay must not follow.
    expect(isMapNavOverlay("event", null)).toBe(false);
    expect(isMapNavOverlay("signal", null)).toBe(false);
    expect(isMapNavOverlay("crisis", null)).toBe(false);
  });

  it("is off on other settled non-map routes", () => {
    expect(isMapNavOverlay("detection", null)).toBe(false);
    expect(isMapNavOverlay("insights", "detection")).toBe(false);
  });
});

describe("useOptimisticNavSegment", () => {
  it("starts on the settled segment", () => {
    const { result } = renderHook(() =>
      useOptimisticNavSegment("detection"),
    );
    expect(result.current.displaySegment).toBe("detection");
    expect(result.current.optimisticSegment).toBeNull();
  });

  it("honors from= on detail routes while idle", () => {
    const { result } = renderHook(() =>
      useOptimisticNavSegment("event", "detection"),
    );
    expect(result.current.displaySegment).toBe("detection");
    expect(result.current.optimisticSegment).toBeNull();
  });

  it("lets click optimism win over from=", () => {
    const { result } = renderHook(() =>
      useOptimisticNavSegment("event", "detection"),
    );

    act(() => {
      result.current.setOptimisticSegment("map");
    });

    expect(result.current.displaySegment).toBe("map");
    expect(result.current.optimisticSegment).toBe("map");
  });

  it("clears optimism when the active segment settles", () => {
    const { result, rerender } = renderHook(
      ({ active, referrer }: { active: string; referrer?: string | null }) =>
        useOptimisticNavSegment(active, referrer),
      { initialProps: { active: "event", referrer: "detection" as string | null } },
    );

    act(() => {
      result.current.setOptimisticSegment("map");
    });
    expect(result.current.displaySegment).toBe("map");

    rerender({ active: "map", referrer: null });
    expect(result.current.displaySegment).toBe("map");
    expect(result.current.optimisticSegment).toBeNull();
  });

  it("restores from= after optimism clears on a new detail route", () => {
    const { result, rerender } = renderHook(
      ({ active, referrer }: { active: string; referrer?: string | null }) =>
        useOptimisticNavSegment(active, referrer),
      { initialProps: { active: "detection", referrer: null as string | null } },
    );

    act(() => {
      result.current.setOptimisticSegment("map");
    });

    rerender({ active: "event", referrer: "map" });
    expect(result.current.displaySegment).toBe("map");
    expect(result.current.optimisticSegment).toBeNull();
  });
});
