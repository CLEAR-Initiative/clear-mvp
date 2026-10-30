import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

/**
 * The tracker's load gate, end to end through the component: the Umami
 * script tag renders only for a signed-in non-admin whose account opt-out is
 * known and off,
 * with env vars set and the flag on, on a post-login path.
 */

vi.mock("next/script", () => ({
  default: function ScriptStandIn(props: Record<string, unknown>) {
    // Stand in for the tracker finishing loading.
    React.useEffect(() => (props.onReady as (() => void) | undefined)?.(), [props.onReady]);
    // eslint-disable-next-line @next/next/no-sync-scripts -- test stand-in for next/script
    return <script data-testid="umami" src={props.src as string} data-website-id={props["data-website-id"] as string} />;
  },
}));
let pathname = "/detection";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next-intl", () => ({ useLocale: () => "en" }));

let flags: Record<string, boolean> = { usage_analytics: true };
let flagsLoading = false;
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureFlags: () => ({ flags, isLoading: flagsLoading }),
}));
vi.mock("~/providers/team-provider", () => ({ useOptionalTeam: () => null }));

const member = () => ({ authenticated: true, user: { id: "u1", role: "member", analyticsOptOut: false } });
let me: unknown = member();
const mutate = vi.fn();
const invalidate = vi.fn();
let dataUpdatedAt = Number.MAX_SAFE_INTEGER;
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ auth: { me: { invalidate, setData: vi.fn() } } }),
    auth: {
      me: { useQuery: () => ({ data: me, dataUpdatedAt }) },
      setAnalyticsOptOut: { useMutation: () => ({ mutate, isPending: false }) },
    },
  },
}));

import { UsageTracker } from "./usage-tracker";
import { clearPendingEvents, track } from "~/lib/analytics/track";

function renderTracker() {
  const { queryByTestId } = render(<UsageTracker />);
  return queryByTestId("umami");
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_UMAMI_HOST_URL", "https://app.clearinitiative.io/ux");
  vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "site-1");
  pathname = "/detection";
  flags = { usage_analytics: true };
  flagsLoading = false;
  me = member();
  mutate.mockClear();
  invalidate.mockClear();
  dataUpdatedAt = Number.MAX_SAFE_INTEGER;
  document.cookie = "clear_analytics_opt_out=; path=/; max-age=0";
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  delete window.umami;
  delete window.__clearAnalyticsOff;
  clearPendingEvents();
});

describe("UsageTracker", () => {
  it("loads Umami for a signed-in member", () => {
    const tag = renderTracker();
    expect(tag?.getAttribute("src")).toBe("https://app.clearinitiative.io/ux/script.js");
    expect(tag?.getAttribute("data-website-id")).toBe("site-1");
  });

  it("loads nothing when the env vars are unset", () => {
    vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");
    expect(renderTracker()).toBeNull();
  });

  it("loads nothing for a global admin", () => {
    me = { authenticated: true, user: { id: "a1", role: "admin" } };
    expect(renderTracker()).toBeNull();
  });

  it("loads nothing when the account is opted out, and mirrors it to the cookie", () => {
    me = { authenticated: true, user: { id: "u1", role: "member", analyticsOptOut: true } };
    expect(renderTracker()).toBeNull();
    expect(document.cookie).toContain("clear_analytics_opt_out=2");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("loads nothing until the account opt-out is known", () => {
    me = { authenticated: true, user: { id: "u1", role: "member", analyticsOptOut: null } };
    expect(renderTracker()).toBeNull();
    cleanup();
    me = { authenticated: true, user: { id: "u1", role: "member" } };
    expect(renderTracker()).toBeNull();
  });

  it("migrates a legacy cookie opt-out onto the account once, loading nothing", () => {
    document.cookie = "clear_analytics_opt_out=1; path=/";
    expect(renderTracker()).toBeNull();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]?.[0]).toEqual({ optedOut: true });
  });

  it("refetches after the grace period instead of clearing a just-written mirror", () => {
    vi.useFakeTimers();
    try {
      // Another tab just opted out; its save may not have reached the server,
      // so this tab's fresh "opted in" fetch could still be stale.
      const now = Date.now();
      dataUpdatedAt = now;
      document.cookie = `clear_analytics_opt_out=2.${now}; path=/`;
      renderTracker();
      expect(document.cookie).toContain("clear_analytics_opt_out=2");
      expect(invalidate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(15_000);
      expect(invalidate).toHaveBeenCalled();
      expect(document.cookie).toContain("clear_analytics_opt_out=2");
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears a stale mirror cookie when the account is opted in", () => {
    document.cookie = "clear_analytics_opt_out=2; path=/";
    expect(renderTracker()).not.toBeNull();
    expect(document.cookie).not.toContain("clear_analytics_opt_out=2");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("loads nothing before sign-in or on pre-login pages", () => {
    me = { authenticated: false, user: null };
    expect(renderTracker()).toBeNull();
    cleanup();
    me = member();
    pathname = "/auth/login";
    expect(renderTracker()).toBeNull();
  });

  it("loads nothing while flags load or when the flag is off", () => {
    flagsLoading = true;
    expect(renderTracker()).toBeNull();
    cleanup();
    flagsLoading = false;
    flags = {};
    expect(renderTracker()).toBeNull();
  });

  describe("events tracked while the gate is loading", () => {
    const umamiTrack = vi.fn();
    beforeEach(() => {
      umamiTrack.mockClear();
      window.umami = { track: umamiTrack, identify: vi.fn() };
      // Fresh page load from an email link: nothing has arrived yet.
      flagsLoading = true;
      me = undefined;
    });

    it("sends them once the gate opens", () => {
      delete window.umami; // the tracker script hasn't loaded yet either
      const view = render(<UsageTracker />);
      track("event.opened", { from: "email" });
      expect(umamiTrack).not.toHaveBeenCalled();

      window.umami = { track: umamiTrack, identify: vi.fn() };
      flagsLoading = false;
      me = member();
      view.rerender(<UsageTracker />);
      expect(view.queryByTestId("umami")).not.toBeNull();
      expect(umamiTrack).toHaveBeenCalledTimes(1);
      expect(umamiTrack).toHaveBeenCalledWith("event.opened", { from: "email" });
    });

    it.each([
      ["a global admin", () => ({ authenticated: true, user: { id: "u1", role: "admin", analyticsOptOut: false } })],
      ["opted out", () => ({ authenticated: true, user: { id: "u1", role: "member", analyticsOptOut: true } })],
    ])("discards them if the gate resolves off (%s)", (_label, resolvedMe) => {
      delete window.umami;
      const view = render(<UsageTracker />);
      track("event.opened", { from: "email" });
      flagsLoading = false;
      me = resolvedMe();
      view.rerender(<UsageTracker />);
      window.umami = { track: umamiTrack, identify: vi.fn() };
      // Even if the gate later opened, nothing held from before should go out.
      me = member();
      view.rerender(<UsageTracker />);
      expect(umamiTrack).not.toHaveBeenCalledWith("event.opened", { from: "email" });
    });

    it("never sends events tracked during a known opt-out, even if the user opts back in before flags load", () => {
      delete window.umami;
      me = { authenticated: true, user: { id: "u1", role: "member", analyticsOptOut: true } };
      const view = render(<UsageTracker />);
      expect(window.__clearAnalyticsOff).toBe(true);
      track("event.opened", { from: "email" });
      // Opts back in while flags are still loading, then flags arrive.
      me = member();
      document.cookie = "clear_analytics_opt_out=; path=/; max-age=0";
      view.rerender(<UsageTracker />);
      window.umami = { track: umamiTrack, identify: vi.fn() };
      flagsLoading = false;
      view.rerender(<UsageTracker />);
      expect(view.queryByTestId("umami")).not.toBeNull();
      expect(umamiTrack).not.toHaveBeenCalled();
    });

    it("discards them if the flag turns out off", () => {
      delete window.umami;
      const view = render(<UsageTracker />);
      track("event.opened", { from: "email" });
      flagsLoading = false;
      flags = {};
      view.rerender(<UsageTracker />);
      expect(window.__clearAnalyticsOff).toBe(true);
      track("event.opened", { from: "email" });
      window.umami = { track: umamiTrack, identify: vi.fn() };
      flags = { usage_analytics: true };
      me = member();
      view.rerender(<UsageTracker />);
      expect(umamiTrack).not.toHaveBeenCalled();
    });
  });
});
