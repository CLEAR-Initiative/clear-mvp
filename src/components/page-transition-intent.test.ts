import { describe, expect, it } from "vitest";
import {
  firstSegment,
  isModifiedNavClick,
  resolvePageTransitionIntent,
} from "~/components/page-transition-intent";

describe("firstSegment", () => {
  it("returns the first path segment", () => {
    expect(firstSegment("/detection")).toBe("detection");
    expect(firstSegment("/map")).toBe("map");
    expect(firstSegment("/event/abc")).toBe("event");
  });
});

describe("resolvePageTransitionIntent", () => {
  it("begins when navigating to a different segment", () => {
    expect(resolvePageTransitionIntent("map", "detection", false)).toBe("begin");
    expect(resolvePageTransitionIntent("map", "detection", true)).toBe("begin");
  });

  it("aborts when re-clicking the settled segment while a veil is pending", () => {
    expect(resolvePageTransitionIntent("detection", "detection", true)).toBe(
      "abort",
    );
  });

  it("no-ops when re-clicking the settled segment with nothing pending", () => {
    expect(resolvePageTransitionIntent("detection", "detection", false)).toBe(
      "noop",
    );
  });

  it("no-ops on empty next segment", () => {
    expect(resolvePageTransitionIntent("", "detection", true)).toBe("noop");
  });
});

describe("isModifiedNavClick", () => {
  it("detects modifier / non-primary clicks", () => {
    expect(
      isModifiedNavClick({
        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        button: 0,
      }),
    ).toBe(true);
    expect(
      isModifiedNavClick({
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        button: 1,
      }),
    ).toBe(true);
    expect(
      isModifiedNavClick({
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        button: 0,
      }),
    ).toBe(false);
  });
});
