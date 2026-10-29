import { describe, expect, it } from "vitest";
import {
  isTrackablePath,
  readUmamiConfig,
  sanitizePageUrl,
  sanitizeReferrer,
  shouldLoadTracker,
  type TrackerGateInput,
} from "./gating";
import {
  MIRROR_CLEAR_GRACE_MS,
  mirrorClearDecision,
  parseMirrorWrittenAt,
  parseOptOutCookie,
  parseOptOutCookieValue,
  resolveOptOut,
  syncAction,
} from "./opt-out";

const config = readUmamiConfig({ hostUrl: "https://app.clearinitiative.io/ux/", websiteId: "site-1" });
const base: TrackerGateInput = {
  config,
  flagEnabled: true,
  authenticated: true,
  globalRole: "member",
  optedOut: false,
  pathname: "/detection",
};

describe("readUmamiConfig", () => {
  it("is null unless both host and website id are set", () => {
    expect(readUmamiConfig({})).toBeNull();
    expect(readUmamiConfig({ hostUrl: "https://x/ux" })).toBeNull();
    expect(readUmamiConfig({ websiteId: "id" })).toBeNull();
    expect(readUmamiConfig({ hostUrl: " ", websiteId: "id" })).toBeNull();
  });

  it("derives the script URL from the host", () => {
    expect(config).toEqual({
      hostUrl: "https://app.clearinitiative.io/ux",
      websiteId: "site-1",
      scriptSrc: "https://app.clearinitiative.io/ux/script.js",
    });
    expect(readUmamiConfig({ hostUrl: "https://h/ux", websiteId: "i", scriptSrc: "/ux/script.js" })?.scriptSrc).toBe(
      "/ux/script.js",
    );
  });
});

describe("shouldLoadTracker", () => {
  it("loads for a signed-in member with everything on", () => {
    expect(shouldLoadTracker(base)).toBe(true);
    expect(shouldLoadTracker({ ...base, pathname: "/welcome/profile" })).toBe(true);
  });

  it.each([
    ["env vars unset", { config: null }],
    ["flag off or still loading", { flagEnabled: false }],
    ["not signed in", { authenticated: false }],
    ["global admin", { globalRole: "admin" }],
    ["opted out", { optedOut: true }],
    ["pre-login page", { pathname: "/auth/login" }],
    ["invite page", { pathname: "/accept-invite" }],
    ["email verification page", { pathname: "/verify-email" }],
  ])("does not load when %s", (_label, patch) => {
    expect(shouldLoadTracker({ ...base, ...patch })).toBe(false);
  });
});

describe("isTrackablePath", () => {
  it("excludes the root and pre-login prefixes but not look-alikes", () => {
    expect(isTrackablePath("/")).toBe(false);
    expect(isTrackablePath("/auth/reset-password")).toBe(false);
    expect(isTrackablePath("/authority")).toBe(true);
    expect(isTrackablePath("/map")).toBe(true);
  });
});

describe("sanitizePageUrl", () => {
  it("keeps only tab and from", () => {
    expect(sanitizePageUrl("/crisis/abc?tab=needs&q=secret&token=xyz&from=map")).toBe("/crisis/abc?tab=needs&from=map");
    expect(sanitizePageUrl("/inbox?search=khartoum")).toBe("/inbox");
    expect(sanitizePageUrl("/map#layer")).toBe("/map");
    expect(sanitizePageUrl("/detection?tab=private-text&from=map")).toBe("/detection?from=map");
    expect(sanitizePageUrl("https://app.clearinitiative.io/event/1?token=t")).toBe("/event/1");
  });
});

describe("sanitizeReferrer", () => {
  it("keeps only the origin", () => {
    expect(sanitizeReferrer("https://app.clearinitiative.io/auth/reset?token=abc")).toBe("https://app.clearinitiative.io");
    expect(sanitizeReferrer("")).toBe("");
    expect(sanitizeReferrer("not a url")).toBe("");
  });
});

describe("parseOptOutCookie", () => {
  it("reads the opt-out cookie", () => {
    expect(parseOptOutCookie("a=1; clear_analytics_opt_out=1")).toBe(true);
    expect(parseOptOutCookie("clear_analytics_opt_out=")).toBe(false);
    expect(parseOptOutCookieValue("clear_analytics_opt_out=1")).toBe("legacy");
    expect(parseOptOutCookieValue("x=1; clear_analytics_opt_out=2")).toBe("mirror");
    expect(parseOptOutCookieValue("")).toBeNull();
  });

  it("treats an unknown account value as opted out", () => {
    expect(resolveOptOut(null, undefined)).toBe(true);
    expect(resolveOptOut(null, null)).toBe(true);
    expect(resolveOptOut(null, false)).toBe(false);
    expect(resolveOptOut(null, true)).toBe(true);
    // A legacy cookie holds until migrated; a mirror never overrides the account.
    expect(resolveOptOut("legacy", false)).toBe(true);
    expect(resolveOptOut("mirror", false)).toBe(false);
  });

  it("syncs the cookie to the account and migrates a legacy opt-out", () => {
    expect(syncAction("legacy", false)).toBe("migrate");
    expect(syncAction("legacy", true)).toBe("mirror-on");
    expect(syncAction(null, true)).toBe("mirror-on");
    expect(syncAction("mirror", true)).toBe("none");
    expect(syncAction("mirror", false)).toBe("mirror-off");
    expect(syncAction(null, false)).toBe("none");
    expect(parseOptOutCookie("")).toBe(false);
  });
});

describe("opt-out mirror timestamp", () => {
  it("parses stamped and legacy-format mirrors", () => {
    expect(parseOptOutCookieValue("clear_analytics_opt_out=2.1700000000000")).toBe("mirror");
    expect(parseMirrorWrittenAt("a=1; clear_analytics_opt_out=2.1700000000000")).toBe(1700000000000);
    expect(parseMirrorWrittenAt("clear_analytics_opt_out=2")).toBe(0);
    expect(parseMirrorWrittenAt("clear_analytics_opt_out=1")).toBeNull();
    expect(parseOptOutCookieValue("clear_analytics_opt_out=2.abc")).toBeNull();
  });

  it("only clears a mirror against an account value fetched after the grace period", () => {
    const writtenAt = 1_000_000;
    // Another tab just opted out; this tab's fetch may predate the save landing.
    expect(mirrorClearDecision(writtenAt, writtenAt + 1_000, writtenAt + 2_000)).toEqual({
      clear: false,
      retryInMs: MIRROR_CLEAR_GRACE_MS - 2_000,
    });
    expect(mirrorClearDecision(writtenAt, writtenAt + MIRROR_CLEAR_GRACE_MS, writtenAt + MIRROR_CLEAR_GRACE_MS)).toEqual({
      clear: true,
    });
    // An old, bare mirror from another device can be cleared at once.
    expect(mirrorClearDecision(0, writtenAt, writtenAt)).toEqual({ clear: true });
  });
});
