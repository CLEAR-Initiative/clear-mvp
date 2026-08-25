import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSeismicSignalsFetchUrl,
  isUsgsSpikeAllowed,
} from "./fetch-usgs-earthquakes";

describe("getSeismicSignalsFetchUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the live USGS spike in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_USGS_EARTHQUAKES_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    expect(isUsgsSpikeAllowed()).toBe(true);
    expect(getSeismicSignalsFetchUrl()).toBe("/api/dev/usgs-earthquakes");
  });

  it("uses the live USGS spike on Vercel preview (NODE_ENV is production)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USGS_EARTHQUAKES_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    expect(isUsgsSpikeAllowed()).toBe(true);
    expect(getSeismicSignalsFetchUrl()).toBe("/api/dev/usgs-earthquakes");
  });

  it("uses the BFF on Vercel production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USGS_EARTHQUAKES_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(isUsgsSpikeAllowed()).toBe(false);
    expect(getSeismicSignalsFetchUrl()).toBe("/api/usgs/earthquakes");
  });

  it("prefers an explicit URL override", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_USGS_EARTHQUAKES_URL", "/api/usgs/earthquakes");
    expect(getSeismicSignalsFetchUrl()).toBe("/api/usgs/earthquakes");
  });

  it("appends the country bbox so Afghanistan is not the Venezuela test rectangle", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_USGS_EARTHQUAKES_URL", "");
    const url = getSeismicSignalsFetchUrl({
      bbox: [58, 26.9, 77.4, 41],
    });
    expect(url.startsWith("/api/dev/usgs-earthquakes?bbox=")).toBe(true);
    expect(url).toContain("58");
    expect(url).toContain("77.4");
  });
});
