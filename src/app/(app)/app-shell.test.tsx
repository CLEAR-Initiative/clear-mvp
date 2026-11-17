import { describe, expect, it, vi } from "vitest";

// The shell's client components are not under test here: only the order of
// the auth.me prefetch and the render.
const { stub, prefetch } = vi.hoisted(() => ({
  stub: () => null,
  prefetch: vi.fn<() => Promise<void>>(),
}));
vi.mock("~/components/nav-sidebar", () => ({ NavSidebar: stub }));
vi.mock("~/components/nav-sidebar-fallback", () => ({ NavSidebarFallback: stub }));
vi.mock("~/components/mobile-bottom-nav", () => ({ MobileBottomNav: stub }));
vi.mock("~/components/feature-flags-provider", () => ({ FeatureFlagsProvider: stub }));
vi.mock("~/components/agent/agent-provider", () => ({ AgentProvider: stub, AgentViewBoundary: stub }));
vi.mock("~/components/agent/agent-drawer", () => ({ AgentDrawer: stub }));
vi.mock("~/providers/team-provider", () => ({ TeamProvider: stub }));
vi.mock("~/providers/working-country-provider", () => ({ WorkingCountryProvider: stub }));
vi.mock("~/components/onboarding-guard", () => ({ OnboardingGuard: stub }));
vi.mock("~/components/onboarding/product-tour-host", () => ({ ProductTourHost: stub }));
vi.mock("~/components/console-buffer-init", () => ({ ConsoleBufferInit: stub }));
vi.mock("~/components/analytics/usage-tracker", () => ({ UsageTracker: stub }));
vi.mock("~/components/analytics/usage-notice", () => ({ UsageNoticeAfterOnboarding: stub }));
vi.mock("~/components/page-transition", () => ({ PageTransitionProvider: stub, PageTransitionVeil: stub }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));

vi.mock("~/trpc/server", () => ({
  api: { auth: { me: { prefetch: () => prefetch() } } },
  HydrateClient: stub,
}));

import { isValidElement, Suspense } from "react";
import { AppShell } from "./app-shell";
import AppLayout from "./layout";

describe("AppShell", () => {
  // A pending auth.me is dehydrated as a promise: the server then renders
  // the nav with no user and the client hydrates it with one, so admins and
  // deciders got a different nav and React #418 on every full page load.
  it("does not render the shell until auth.me has resolved", async () => {
    let resolve!: () => void;
    prefetch.mockReturnValue(new Promise<void>((r) => (resolve = r)));

    let rendered = false;
    const layout = AppShell({ children: null }).then((tree) => {
      rendered = true;
      return tree;
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(prefetch).toHaveBeenCalledOnce();
    expect(rendered).toBe(false);

    resolve();
    await layout;
    expect(rendered).toBe(true);
  });
});

describe("AppLayout", () => {
  // Next.js renders a layout as `[assets, layout]`. An async layout reaches
  // the browser as a lazy in that array, and when it suspended during
  // hydration React dropped the array from every useId below (Mantine class
  // names and ids no longer matched the server HTML). The layout itself must
  // return a plain element at once, with the async shell under Suspense.
  it("returns the shell inside a Suspense boundary without awaiting anything", () => {
    const tree = AppLayout({ children: "page" });
    expect(tree).not.toBeInstanceOf(Promise);
    expect(isValidElement(tree)).toBe(true);
    const boundary = tree as React.ReactElement<{ children: React.ReactElement<{ children: unknown }> }>;
    expect(boundary.type).toBe(Suspense);
    expect(boundary.props.children.type).toBe(AppShell);
    expect(boundary.props.children.props.children).toBe("page");
  });
});
