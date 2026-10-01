import { afterEach, describe, expect, it, vi } from "vitest";

const graphqlFetch = vi.fn();
vi.mock("~/server/api/graphql", () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));

const { readFeatureFlag, resetFeatureFlagCache } = await import("~/server/feature-flags");

afterEach(() => {
  graphqlFetch.mockReset();
  resetFeatureFlagCache();
  vi.useRealTimers();
});

describe("readFeatureFlag", () => {
  it("reads clear-api's value, then serves it from the cache for 30s", async () => {
    vi.useFakeTimers();
    graphqlFetch.mockResolvedValue({ featureFlags: [{ key: "hotline_translation", enabled: true }] });
    expect(await readFeatureFlag("hotline_translation", {})).toBe(true);
    expect(await readFeatureFlag("hotline_translation", {})).toBe(true);
    expect(graphqlFetch).toHaveBeenCalledTimes(1);

    graphqlFetch.mockResolvedValue({ featureFlags: [{ key: "hotline_translation", enabled: false }] });
    vi.advanceTimersByTime(30_000);
    expect(await readFeatureFlag("hotline_translation", {})).toBe(false);
    expect(graphqlFetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to the registry default when clear-api has no row or can't be read", async () => {
    graphqlFetch.mockResolvedValueOnce({ featureFlags: [] });
    expect(await readFeatureFlag("hotline_translation", {})).toBe(false);
    resetFeatureFlagCache();
    graphqlFetch.mockRejectedValueOnce(new Error("down"));
    expect(await readFeatureFlag("ground_intel", {})).toBe(true);
  });
});
