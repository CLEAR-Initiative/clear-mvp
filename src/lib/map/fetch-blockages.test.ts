import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blockagesHintFromMeta,
  getBlockagesFetchUrl,
  isBlockagesUiEnabled,
} from "./fetch-blockages";
import type { BlockagesMapCollection } from "./logie-blockages";

describe("isBlockagesUiEnabled", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalUrl = process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL;

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL;
    } else {
      process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL = originalUrl;
    }
    // NODE_ENV is often read-only; stub restores via unstubAllEnvs when stubbed.
    void originalEnv;
  });

  it("is enabled in development without an API URL (local spike)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_LOGIE_BLOCKAGES_URL", "");
    expect(isBlockagesUiEnabled()).toBe(true);
    expect(getBlockagesFetchUrl()).toBe("/api/dev/logie-blockages");
  });

  it("stays Coming soon in production without an API URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOGIE_BLOCKAGES_URL", "");
    expect(isBlockagesUiEnabled()).toBe(false);
  });

  it("enables when BFF / clear-api slim URL is set (any NODE_ENV)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOGIE_BLOCKAGES_URL", "/api/logie/blockages");
    expect(isBlockagesUiEnabled()).toBe(true);
    expect(getBlockagesFetchUrl()).toBe("/api/logie/blockages");
  });
});

describe("blockagesHintFromMeta", () => {
  it("includes spike tag and reduction for local smoke", () => {
    const collection = {
      type: "FeatureCollection",
      features: [],
      meta: {
        source: "logie-spike-smoke",
        feature_types: ["road", "bridge"],
        feature_count: 31,
        simplify_tolerance_deg: 0.0008,
        bytes_in: 100,
        bytes_out: 13,
        reduction_ratio: 0.13,
      },
    } satisfies BlockagesMapCollection;
    expect(blockagesHintFromMeta(collection, "spike")).toBe(
      "31 · −87% · spike",
    );
  });
});
