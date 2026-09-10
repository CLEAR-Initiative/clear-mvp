import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blockagesHintFromMeta,
  fetchBlockagesMapCollection,
  getBlockagesFetchUrl,
  isBlockagesUiEnabled,
} from "./fetch-blockages";
import type { BlockagesMapCollection } from "./logie-blockages";

describe("isBlockagesUiEnabled", () => {
  const originalUrl = process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL;

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL;
    } else {
      process.env.NEXT_PUBLIC_LOGIE_BLOCKAGES_URL = originalUrl;
    }
  });

  it("is enabled in development without an API URL (local spike)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_LOGIE_BLOCKAGES_URL", "");
    expect(isBlockagesUiEnabled()).toBe(true);
    expect(getBlockagesFetchUrl()).toBe("/api/dev/logie-blockages");
  });

  it("is always enabled (no NEXT_PUBLIC gate); prod without env uses BFF path", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOGIE_BLOCKAGES_URL", "");
    expect(isBlockagesUiEnabled()).toBe(true);
    expect(getBlockagesFetchUrl()).toBe("/api/logie/blockages");
  });

  it("prefers BFF / clear-api slim URL when set (any NODE_ENV)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOGIE_BLOCKAGES_URL", "/api/logie/blockages");
    expect(isBlockagesUiEnabled()).toBe(true);
    expect(getBlockagesFetchUrl()).toBe("/api/logie/blockages");
  });
});

describe("fetchBlockagesMapCollection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("appends iso3 and merges multi-country FeatureCollections", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_LOGIE_BLOCKAGES_URL", "");

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const iso3 = new URL(url, "http://local.invalid").searchParams.get("iso3");
      const collection: BlockagesMapCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: {
              feature_type: "bridge",
              route_id: iso3,
              name: iso3,
              label: String(iso3),
              status_code: 4,
              status: "Not Passable",
              status_as_of: null,
              status_remark: null,
              source_name: null,
              source_label: null,
              source_reliability_code: null,
              source_reliability: null,
              age_days: null,
              stale: 0,
            },
          },
        ],
        meta: {
          source: "logie-ingest",
          feature_types: ["road", "bridge"],
          feature_count: 1,
          simplify_tolerance_deg: 0.0008,
          bytes_in: 10,
          bytes_out: 5,
          reduction_ratio: 0.5,
          iso3: iso3 ?? undefined,
        },
      };
      return {
        ok: true,
        status: 200,
        json: async () => collection,
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { collection, source, iso3 } = await fetchBlockagesMapCollection({
      iso3: ["AFG", "VEN"],
    });

    expect(source).toBe("api");
    expect(iso3).toEqual(["AFG", "VEN"]);
    expect(collection.features).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("iso3=AFG");
    expect(String(fetchMock.mock.calls[1]![0])).toContain("iso3=VEN");
  });

  it("returns empty without inventing SDN when iso3 is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { collection, iso3 } = await fetchBlockagesMapCollection({});
    expect(iso3).toEqual([]);
    expect(collection.features).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("blockagesHintFromMeta", () => {
  it("includes spike tag, reduction, and ISO3", () => {
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
    expect(blockagesHintFromMeta(collection, "spike", ["AFG"])).toBe(
      "31 · −87% · spike · AFG",
    );
  });
});
