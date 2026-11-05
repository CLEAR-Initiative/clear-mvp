import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

/**
 * Overview world map (flag `overview_world_map`): the Overview shows only
 * NRC's operating countries on a world map, whatever the working country.
 * Clicking one inspects it (zoom, highlight, right panel) without touching
 * the working country.
 */

type MapProps = {
  markers?: unknown[];
  center?: [number, number];
  focusCountryPCode?: string;
  focusCountryName?: string;
  operatingCountries?: readonly { iso2: string }[];
  onCountrySelect?: (iso2: string) => void;
  selectedOperatingIso?: string | null;
  countryFitInsetRight?: number;
  countryFitInsetBottom?: number;
  onPresenceHover?: (hover: unknown) => void;
};
const mapProps: { current: MapProps } = { current: {} };

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => `${ns ? `${ns}.` : ""}${key}`,
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function MapStub(props: MapProps) {
      mapProps.current = props;
      return <div data-testid="crisis-map" />;
    },
}));

const query = () => ({ data: undefined, isSuccess: false });
vi.mock("~/trpc/react", () => ({
  api: {
    locations: {
      getById: { useQuery: query },
      getAdminBoundaries: { useQuery: query },
      getPopulationBoundaries: { useQuery: query },
    },
    alerts: {
      alertsForMap: { useQuery: query },
      eventsForMap: { useQuery: query },
      getCrises: { useQuery: query },
    },
  },
}));

vi.mock("~/providers/team-provider", () => ({ useTeam: () => ({ activeTeamId: "t1" }) }));
vi.mock("~/hooks/use-locations", () => ({
  useLocations: () => ({ getLocationId: () => null, getCenter: () => [0, 0], getZoom: () => 2 }),
}));
vi.mock("~/hooks/use-last-focused-country", () => ({ useLastFocusedCountry: () => null }));
vi.mock("~/lib/report-stale-country-pick", () => ({ useReportStaleCountryPick: () => undefined }));
vi.mock("~/hooks/use-is-dark", () => ({ useIsDark: () => false }));

const setWorkingCountry = vi.fn();
let working: { id: string | null; name: string | null } = { id: null, name: null };
vi.mock("~/hooks/use-team-country", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/hooks/use-team-country")>();
  return {
    ...actual,
    useTeamCountry: () => ({
      countries: [
        { id: "loc-af", name: "Afghanistan" },
        { id: "loc-sd", name: "Sudan" },
      ],
      countryId: working.id,
      countryName: working.name,
      setWorkingCountry,
      scopeReady: true,
    }),
  };
});

let worldMapFlag = true;
let flagsLoading = false;
let mobile = false;
vi.mock("@mantine/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mantine/hooks")>()),
  useMediaQuery: () => mobile,
  useViewportSize: () => ({ width: mobile ? 390 : 1440, height: 800 }),
}));
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: (key: string) => (key === "overview_world_map" ? worldMapFlag : true),
  useFeatureFlags: () => ({ isLoading: flagsLoading }),
}));

vi.mock("~/app/(app)/map/_components/map-marker-detail", () => ({ MapMarkerDetail: () => null }));
vi.mock("~/app/(app)/map/_components/map-panel-bar", () => ({ MapPanelBar: () => null }));
vi.mock("./_components/right-panel", () => ({
  RightPanel: ({ selectedCountry }: { selectedCountry: string }) => (
    <div data-testid="panel-country">{selectedCountry}</div>
  ),
}));
vi.mock("./_components/world-country-panel", () => ({
  WorldCountryPanel: ({ country, onClose }: { country: { name: string }; onClose: () => void }) => (
    <div>
      <div data-testid="panel-country">{country.name}</div>
      <button type="button" onClick={onClose}>close panel</button>
    </div>
  ),
}));

const { default: DashboardPage } = await import("./page");

function renderPage() {
  return render(
    <MantineProvider>
      <DashboardPage />
    </MantineProvider>,
  );
}

beforeEach(() => {
  worldMapFlag = true;
  flagsLoading = false;
  mobile = false;
  working = { id: null, name: null };
  mapProps.current = {};
  setWorkingCountry.mockClear();
});
afterEach(cleanup);

describe("Overview world map", () => {
  it("shows only the operating countries, on the world camera", () => {
    renderPage();
    expect(mapProps.current.operatingCountries?.length).toBeGreaterThan(30);
    expect(mapProps.current.markers).toEqual([]);
    expect(mapProps.current.center).toEqual([10, 20]);
    expect(mapProps.current.focusCountryPCode).toBeUndefined();
    expect(mapProps.current.selectedOperatingIso).toBeNull();
    expect(screen.getByText("dashboard.worldMap.presenceEyebrow")).toBeTruthy();
    expect(screen.queryByTestId("panel-country")).toBeNull();
  });

  it("selects a clicked country without changing the working country", () => {
    renderPage();
    act(() => mapProps.current.onCountrySelect?.("SD"));

    expect(mapProps.current.selectedOperatingIso).toBe("SD");
    // The presence map frames the country itself; the working-country focus stays off.
    expect(mapProps.current.focusCountryPCode).toBeUndefined();
    expect(screen.getByTestId("panel-country").textContent).toBe("Sudan");
    expect(screen.queryByText("dashboard.worldMap.presenceEyebrow")).toBeNull();
    expect(setWorkingCountry).not.toHaveBeenCalled();
  });

  it("lists Sudan's office types in the legend, and only the country office elsewhere", () => {
    renderPage();
    act(() => mapProps.current.onCountrySelect?.("SD"));
    expect(screen.getByText("map.nrcOffices.types.area_office")).toBeTruthy();
    expect(screen.getByText("map.nrcOffices.types.field_office")).toBeTruthy();
    act(() => mapProps.current.onCountrySelect?.("CO"));
    expect(screen.getByText("map.nrcOffices.types.country_office")).toBeTruthy();
    expect(screen.queryByText("map.nrcOffices.types.area_office")).toBeNull();
  });

  it("shows a tooltip for the hovered country", () => {
    renderPage();
    act(() => mapProps.current.onPresenceHover?.({ kind: "country", iso2: "SD", x: 100, y: 80 }));
    expect(screen.getByText("Sudan")).toBeTruthy();
    expect(screen.getByText("dashboard.worldMap.countryTooltip")).toBeTruthy();
    act(() => mapProps.current.onPresenceHover?.(null));
    expect(screen.queryByText("dashboard.worldMap.countryTooltip")).toBeNull();
  });

  it("opens the country panel as a bottom sheet on mobile, framing the country above it", () => {
    mobile = true;
    renderPage();
    act(() => mapProps.current.onCountrySelect?.("SD"));
    expect(screen.getByTestId("panel-country").textContent).toBe("Sudan");
    expect(mapProps.current.countryFitInsetRight).toBe(0);
    expect(mapProps.current.countryFitInsetBottom).toBe(Math.round(800 * 0.55) + 72);
  });

  it("goes back to the world with the button", () => {
    renderPage();
    act(() => mapProps.current.onCountrySelect?.("SD"));

    fireEvent.click(screen.getByRole("button", { name: "dashboard.worldMap.backToWorld" }));

    expect(mapProps.current.selectedOperatingIso).toBeNull();
    expect(screen.queryByTestId("panel-country")).toBeNull();
  });

  it("goes back to the world when the panel closes", () => {
    renderPage();
    act(() => mapProps.current.onCountrySelect?.("SD"));
    fireEvent.click(screen.getByRole("button", { name: "close panel" }));
    expect(mapProps.current.selectedOperatingIso).toBeNull();
    expect(screen.queryByTestId("panel-country")).toBeNull();
  });

  it("goes back to the world on Escape", () => {
    renderPage();
    act(() => mapProps.current.onCountrySelect?.("SD"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mapProps.current.selectedOperatingIso).toBeNull();
  });


  it("shows neither layout until the flags have loaded", () => {
    flagsLoading = true;
    worldMapFlag = false; // the default, before the real value arrives
    working = { id: "loc-af", name: "Afghanistan" };
    renderPage();
    expect(mapProps.current).toEqual({});
    expect(screen.queryByTestId("panel-country")).toBeNull();
  });

  it("is absent when the flag is off", () => {
    worldMapFlag = false;
    renderPage();
    expect(mapProps.current.operatingCountries).toBeUndefined();
    act(() => mapProps.current.onCountrySelect?.("SD"));
    expect(mapProps.current.selectedOperatingIso).toBeNull();
  });

  it("stays on the world map even with a working country picked", () => {
    working = { id: "loc-sd", name: "Sudan" };
    renderPage();
    expect(mapProps.current.operatingCountries?.length).toBeGreaterThan(30);
    expect(mapProps.current.focusCountryName).toBeUndefined();
    expect(screen.queryByTestId("panel-country")).toBeNull();
  });

  it("keeps the working-country map when the flag is off", () => {
    worldMapFlag = false;
    working = { id: "loc-sd", name: "Sudan" };
    renderPage();
    expect(mapProps.current.focusCountryName).toBe("Sudan");
    expect(screen.getByTestId("panel-country").textContent).toBe("Sudan");
  });
});
