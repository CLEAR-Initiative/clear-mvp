import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

/**
 * The welcome pages call useTeamCountry, which throws outside
 * WorkingCountryProvider. Before this layout mounted the provider, every
 * invited user landed on a blank /welcome/profile.
 */

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock("~/providers/team-provider", async () => {
  const actual = await vi.importActual<typeof import("~/providers/team-provider")>(
    "~/providers/team-provider",
  );
  return {
    ...actual,
    TeamProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useTeam: () => ({ activeTeam: null, activeTeamId: null, teams: [], isLoading: false }),
  };
});

vi.mock("~/components/feature-flags-provider", () => ({
  FeatureFlagsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("~/components/analytics/usage-tracker", () => ({
  UsageTracker: () => null,
}));

const { useTeamCountry } = await import("~/hooks/use-team-country");
const { default: WelcomeLayout } = await import("./layout");

function TeamCountryProbe() {
  const { hasCountryScope } = useTeamCountry();
  return <p>scoped: {String(hasCountryScope)}</p>;
}

afterEach(cleanup);

describe("WelcomeLayout", () => {
  it("lets welcome pages use the team country", async () => {
    render(await WelcomeLayout({ children: <TeamCountryProbe /> }));
    expect(screen.getByText("scoped: false")).toBeTruthy();
  });
});
