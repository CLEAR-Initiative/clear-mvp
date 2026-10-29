import { describe, expect, it, vi, afterEach } from "vitest";
import { ANALYTICS_EVENTS, ID, isAllowedEvent } from "./events";
import { identityData, track } from "./track";

describe("analytics event allowlist", () => {
  it("accepts every declared event with valid values", () => {
    for (const [name, spec] of Object.entries(ANALYTICS_EVENTS)) {
      const props = Object.fromEntries(
        Object.entries(spec).map(([k, allowed]) => [
          k,
          allowed === ID ? "cmvtdzfl0000fl307lu5gzbq3" : (allowed as readonly string[])[0],
        ]),
      );
      expect(isAllowedEvent(name, props), name).toBe(true);
    }
  });

  it("rejects unknown event names", () => {
    expect(isAllowedEvent("search.query", { q: "khartoum" })).toBe(false);
    expect(isAllowedEvent("toString")).toBe(false);
  });

  it("rejects values outside the fixed list", () => {
    expect(isAllowedEvent("privacy_notice.viewed", { from: "somewhere-else" })).toBe(false);
  });

  it("rejects missing, extra and non-string properties", () => {
    expect(isAllowedEvent("privacy_notice.viewed", {})).toBe(false);
    expect(isAllowedEvent("privacy_notice.viewed", { from: "profile", email: "a@b.c" })).toBe(false);
    expect(isAllowedEvent("tour.completed", { title: "x" })).toBe(false);
    expect(isAllowedEvent("privacy_notice.viewed", { from: 1 })).toBe(false);
  });

  it("only accepts cuid-shaped ids for ID properties (no free text)", () => {
    expect(isAllowedEvent("analysis.opened", { analysis: "cmvtdzfl0000fl307lu5gzbq3" })).toBe(true);
    expect(isAllowedEvent("analysis.opened", { analysis: "Sudan floods August" })).toBe(false);
  });

  it("uses only lower-case dotted event names", () => {
    for (const name of Object.keys(ANALYTICS_EVENTS)) {
      expect(name).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });
});

describe("track()", () => {
  afterEach(() => {
    delete window.umami;
    vi.restoreAllMocks();
  });

  it("sends allowed events to Umami", () => {
    const send = vi.fn();
    window.umami = { track: send, identify: vi.fn() };
    track("privacy_notice.viewed", { from: "profile" });
    track("tour.completed");
    expect(send).toHaveBeenCalledWith("privacy_notice.viewed", { from: "profile" });
    expect(send).toHaveBeenCalledWith("tour.completed", undefined);
  });

  it("drops events outside the allowlist", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const send = vi.fn();
    window.umami = { track: send, identify: vi.fn() };
    // @ts-expect-error unknown value is a compile error too
    track("privacy_notice.viewed", { from: "search" });
    // @ts-expect-error unknown event name
    track("search.query");
    expect(send).not.toHaveBeenCalled();
  });

  it("is a no-op when the tracker is not loaded", () => {
    expect(() => track("tour.completed")).not.toThrow();
  });

  it("identify data carries ids and fixed values only", () => {
    expect(
      identityData({
        userId: "u1",
        role: "member",
        teamRole: "analyst",
        organisationId: "org1",
        teamId: "team1",
        language: "fr",
      }),
    ).toEqual({ role: "member", teamRole: "analyst", organisation: "org1", team: "team1", language: "fr" });
  });
});
