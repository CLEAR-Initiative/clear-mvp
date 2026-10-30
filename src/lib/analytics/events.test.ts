import { describe, expect, it, vi, afterEach } from "vitest";
import { ANALYTICS_EVENTS, ID, ROUTE, isAllowedEvent } from "./events";
import { identityData, track } from "./track";

describe("analytics event allowlist", () => {
  it("accepts every declared event with valid values", () => {
    for (const [name, spec] of Object.entries(ANALYTICS_EVENTS)) {
      const props = Object.fromEntries(
        Object.entries(spec).map(([k, allowed]) => [
          k,
          allowed === ID
            ? "cmvtdzfl0000fl307lu5gzbq3"
            : allowed === ROUTE
              ? "/event/:id"
              : (allowed as readonly string[])[0],
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
    expect(isAllowedEvent("tour.finished", { title: "x" })).toBe(false);
    expect(isAllowedEvent("privacy_notice.viewed", { from: 1 })).toBe(false);
  });

  it("declares exactly the tour, Agent and analysis events of #1214", () => {
    const names = Object.keys(ANALYTICS_EVENTS).filter((n) => /^(tour|agent|analysis)\./.test(n));
    expect(names.sort()).toEqual(
      [
        "agent.navigation_back",
        "agent.opened",
        "agent.source_opened",
        "analysis.evidence_downloaded",
        "analysis.evidence_previewed",
        "analysis.summary_copied",
        "tour.finished",
        "tour.skipped",
        "tour.started",
        "tour.step_viewed",
      ].sort(),
    );
    // Turns are already stored by clear-api; never in Umami.
    expect(isAllowedEvent("agent.message_sent")).toBe(false);
  });

  it("accepts tour props only as fixed values", () => {
    expect(isAllowedEvent("tour.started", { trigger: "auto", first_on_device: "true" })).toBe(true);
    expect(isAllowedEvent("tour.started", { trigger: "replay", first_on_device: "false" })).toBe(true);
    expect(isAllowedEvent("tour.started", { trigger: "auto", first_on_device: "yes" })).toBe(false);
    expect(isAllowedEvent("tour.step_viewed", { step: "mapLayers" })).toBe(true);
    expect(isAllowedEvent("tour.skipped", { step: "Explore the map" })).toBe(false);
  });

  it("accepts only route patterns for agent.opened from_route (no URLs, queries or text)", () => {
    const opened = (from_route: string) => isAllowedEvent("agent.opened", { surface: "drawer", from_route });
    expect(opened("/event/:id")).toBe(true);
    expect(opened("/map")).toBe(true);
    expect(opened("direct")).toBe(true);
    expect(opened("/event/cmvtdzfl0000fl307lu5gzbq3")).toBe(false);
    expect(opened("/detection?q=khartoum")).toBe(false);
    expect(opened("https://clear.example/map")).toBe(false);
    expect(opened("what is happening in Sudan")).toBe(false);
    expect(isAllowedEvent("agent.opened", { surface: "popup", from_route: "/map" })).toBe(false);
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
    track("tour.finished");
    expect(send).toHaveBeenCalledWith("privacy_notice.viewed", { from: "profile" });
    expect(send).toHaveBeenCalledWith("tour.finished", undefined);
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
    expect(() => track("tour.finished")).not.toThrow();
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
