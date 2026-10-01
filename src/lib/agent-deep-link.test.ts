import { describe, expect, it } from "vitest";
import {
  detectionDeepLinkHref,
  mapDeepLinkHref,
  readDetectionDeepLink,
  readMapDeepLink,
  withoutDeepLink,
} from "~/lib/agent-deep-link";

const params = (href: string) => new URL(href, "http://x").searchParams;

describe("Map deep links", () => {
  it("round-trips country, region and timeframe", () => {
    const href = mapDeepLinkHref({ country: "Sudan", region: "North Darfur", timeframe: "7d" });
    expect(href).toBe("/map?country=Sudan&region=North+Darfur&timeframe=7d");
    expect(readMapDeepLink(params(href))).toEqual({ country: "Sudan", region: "North Darfur", timeframe: "7d" });
  });

  it("ignores unknown or oversized values", () => {
    expect(readMapDeepLink(params(`/map?timeframe=forever&country=${"x".repeat(200)}`))).toEqual({});
    expect(mapDeepLinkHref({})).toBe("/map");
  });
});

describe("Detection deep links", () => {
  it("round-trips its filters", () => {
    const link = {
      country: "Sudan",
      region: "loc-nd",
      date: "Last 7 days",
      severities: ["critical" as const, "high" as const],
      types: ["FL", "Flood"],
      sources: ["dataminr"],
    };
    expect(readDetectionDeepLink(params(detectionDeepLinkHref(link)))).toEqual(link);
  });

  it("accepts a calendar month and drops unknown severities and dates", () => {
    expect(readDetectionDeepLink(params("/detection?date=Sep%202026&severities=high,catastrophic"))).toEqual({
      date: "Sep 2026",
      severities: ["high"],
    });
    expect(readDetectionDeepLink(params("/detection?date=yesterday"))).toEqual({});
  });
});

describe("withoutDeepLink", () => {
  it("drops only the deep-link parameters", () => {
    expect(withoutDeepLink(params("/map?country=Sudan&event=e1&timeframe=7d"), ["country", "region", "timeframe"])).toBe(
      "?event=e1",
    );
  });
});
