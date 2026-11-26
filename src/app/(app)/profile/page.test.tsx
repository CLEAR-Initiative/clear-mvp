import React from "react";
import { describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

/**
 * /profile hydration. auth.me is prefetched on the server (app-shell), but
 * teams.myTeams and auth.myUserDetails are fetched only in the browser, so the
 * server always renders them as loading. On a slow load a response can land
 * before the page's Suspense boundary hydrates; the page must still hydrate
 * the markup the server sent, or React throws #418 (ticket #1565).
 */

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => `${ns ? `${ns}.` : ""}${key}`,
  useLocale: () => "en",
  useTimeZone: () => "UTC",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("~/lib/auth-client", () => ({ authClient: {} }));
vi.mock("~/components/ui", () => ({ ColorSchemeToggle: () => null }));
vi.mock("~/i18n/use-time-zone-options", () => ({
  useTimeZoneOptions: () => [{ value: "UTC", label: "UTC" }],
}));
vi.mock("~/providers/team-provider", () => ({
  useTeam: () => ({ activeTeamId: "t1", switchTeam: vi.fn() }),
}));
vi.mock("~/hooks/use-team-country", () => ({ useTeamCountry: () => ({ countryIso: null }) }));
vi.mock("~/components/analytics/usage-tracker", () => ({
  useAnalyticsOptOut: () => ({ optedOut: false, known: true, setOptedOut: vi.fn(), saving: false }),
}));

const user = { id: "u1", name: "Ada", email: "ada@example.org", role: "user" };
const teams = [
  {
    id: "t1",
    name: "Field team",
    organisation: { id: "o1", name: "NRC" },
    members: [{ id: "m1", user: { id: "u1" }, role: "admin" }],
  },
];

// Whether the browser-only queries have resolved yet.
let browserQueriesLoaded = false;
const browserQuery = <T,>(data: T) => () =>
  browserQueriesLoaded
    ? { data, isLoading: false, isSuccess: true }
    : { data: undefined, isLoading: true, isSuccess: false };

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({ invalidate: vi.fn(), auth: { myUserDetails: { invalidate: vi.fn() } } }),
    auth: {
      // Prefetched by the app shell, so ready on both server and browser.
      me: { useQuery: () => ({ data: { authenticated: true, user }, isLoading: false }) },
      myUserDetails: { useQuery: browserQuery({ phoneNumber: "+4791234567" }) },
      updateProfile: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    teams: { myTeams: { useQuery: browserQuery(teams) } },
  },
}));

const { default: ProfilePage } = await import("./page");

describe("Profile hydration", () => {
  it("hydrates the server markup even when the browser-only queries arrived first", async () => {
    const { renderToString } = await import("react-dom/server");
    const { hydrateRoot } = await import("react-dom/client");
    const tree = (
      <MantineProvider>
        <ProfilePage />
      </MantineProvider>
    );

    // The server sees myTeams and myUserDetails loading...
    browserQueriesLoaded = false;
    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);

    // ...and the browser has both before the page hydrates.
    browserQueriesLoaded = true;
    const recoverable = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, tree, { onRecoverableError: recoverable });
      });

      expect(recoverable).not.toHaveBeenCalled();
      // After hydration the page catches up with the loaded teams.
      expect(container.textContent).toContain("Field team");
    } finally {
      act(() => root?.unmount());
      container.remove();
    }
  });
});
