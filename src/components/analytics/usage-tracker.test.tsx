import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

/**
 * The tracker's load gate, end to end through the component: the Umami
 * script tag renders only for a signed-in non-admin who hasn't opted out,
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

let me: unknown = { authenticated: true, user: { id: "u1", role: "member" } };
vi.mock("~/trpc/react", () => ({
  api: { auth: { me: { useQuery: () => ({ data: me }) } } },
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
  me = { authenticated: true, user: { id: "u1", role: "member" } };
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

  it("loads nothing when the user opted out", () => {
    document.cookie = "clear_analytics_opt_out=1; path=/";
    expect(renderTracker()).toBeNull();
  });

  it("loads nothing before sign-in or on pre-login pages", () => {
    me = { authenticated: false, user: null };
    expect(renderTracker()).toBeNull();
    cleanup();
    me = { authenticated: true, user: { id: "u1", role: "member" } };
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
