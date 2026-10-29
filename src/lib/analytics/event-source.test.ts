import { describe, expect, it } from "vitest";
import { EVENT_FROM_VALUES, eventHref, normaliseEventFrom, tagEventPath } from "./event-source";
import { isAllowedEvent } from "./events";
import { KEPT_QUERY_VALUES, sanitizePageUrl } from "./gating";
import { createOncePerView } from "./use-once-per-view";

describe("normaliseEventFrom", () => {
  it("keeps every fixed value", () => {
    for (const from of EVENT_FROM_VALUES) expect(normaliseEventFrom(from)).toBe(from);
  });
  it("counts missing or unknown as direct", () => {
    expect(normaliseEventFrom(null)).toBe("direct");
    expect(normaliseEventFrom(undefined)).toBe("direct");
    expect(normaliseEventFrom("")).toBe("direct");
    expect(normaliseEventFrom("insights")).toBe("direct");
    expect(normaliseEventFrom("MAP")).toBe("direct");
    expect(normaliseEventFrom("toString")).toBe("direct");
  });
  it("every normalised value is allowed in event.opened and kept in page views", () => {
    for (const from of [...EVENT_FROM_VALUES, "direct"] as const) {
      expect(isAllowedEvent("event.opened", { from })).toBe(true);
    }
    for (const from of EVENT_FROM_VALUES) {
      expect(KEPT_QUERY_VALUES.from).toContain(from);
      expect(sanitizePageUrl(eventHref("abc", from))).toBe(`/event/abc?from=${from}`);
    }
  });
});

describe("tagEventPath", () => {
  it("adds from to an Event path without one", () => {
    expect(tagEventPath("/event/abc", "agent")).toBe("/event/abc?from=agent");
  });
  it("keeps an existing from", () => {
    expect(tagEventPath("/event/abc?from=inbox", "agent")).toBe("/event/abc?from=inbox");
  });
  it("leaves non-Event paths alone", () => {
    expect(tagEventPath("/map?countryId=x", "agent")).toBe("/map?countryId=x");
    expect(tagEventPath("/signal/abc", "agent")).toBe("/signal/abc");
  });
});

describe("event.section_seen", () => {
  it("allows only the enrichment and feedback sections", () => {
    expect(isAllowedEvent("event.section_seen", { section: "enrichment" })).toBe(true);
    expect(isAllowedEvent("event.section_seen", { section: "feedback" })).toBe(true);
    expect(isAllowedEvent("event.section_seen", { section: "summary" })).toBe(false);
  });
});

describe("createOncePerView", () => {
  it("claims a key once per view, again after reset", () => {
    const once = createOncePerView();
    expect(once.claim("evt")).toBe(true);
    expect(once.claim("evt")).toBe(false); // strict-mode re-run / re-render
    expect(once.claim("other")).toBe(true);
    once.reset();
    expect(once.claim("evt")).toBe(true);
  });
});
