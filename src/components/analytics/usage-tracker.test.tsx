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
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-sync-scripts -- test stand-in for next/script
    <script data-testid="umami" src={props.src as string} data-website-id={props["data-website-id"] as string} />
  ),
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

  it("refetches instead of clearing a mirror newer than the account value", () => {
    // Another tab just opted out; this tab's cached account value predates it.
    dataUpdatedAt = 0;
    document.cookie = "clear_analytics_opt_out=2; path=/";
    renderTracker();
    expect(document.cookie).toContain("clear_analytics_opt_out=2");
    expect(invalidate).toHaveBeenCalled();
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
});
