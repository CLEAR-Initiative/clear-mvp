import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

/**
 * The sidebar country picker: hidden unless the team has two or more
 * countries, no "All Countries" option, a multi-country team with no pick
 * starts on its first country, and collapsed it shows the ISO code.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const SUDAN = { id: "sd", name: "Sudan", level: 0 };
const AFGHANISTAN = { id: "af", name: "Afghanistan", level: 0 };

let working: {
  countries: { id: string; name: string; level: number }[];
  countryId: string | null;
  countryName: string | null;
  showCountrySelector: boolean;
  scopeReady: boolean;
};
const setWorkingCountry = vi.fn();

vi.mock("~/providers/team-provider", () => ({
  useTeam: () => ({ activeTeamId: "team-1" }),
}));
vi.mock("~/providers/working-country-provider", () => ({
  useWorkingCountry: () => ({ ...working, setWorkingCountry }),
}));

const { SidebarCountryPicker, resetDefaultedTeamsForTest } = await import("./sidebar-country-picker");

function renderPicker(collapsed = false) {
  return render(
    <MantineProvider>
      <SidebarCountryPicker collapsed={collapsed} />
    </MantineProvider>,
  );
}

beforeEach(() => {
  working = {
    countries: [AFGHANISTAN, SUDAN],
    countryId: "sd",
    countryName: "Sudan",
    showCountrySelector: true,
    scopeReady: true,
  };
});

afterEach(() => {
  cleanup();
  setWorkingCountry.mockReset();
  resetDefaultedTeamsForTest();
});

describe("SidebarCountryPicker", () => {
  it("renders nothing for a single-country team", () => {
    working = { ...working, countries: [SUDAN], showCountrySelector: false };
    renderPicker();
    expect(screen.queryByTestId("sidebar-country-picker")).toBeNull();
  });

  it("renders nothing until the team scope is known", () => {
    working = { ...working, scopeReady: false };
    renderPicker();
    expect(screen.queryByTestId("sidebar-country-picker")).toBeNull();
  });

  it("lists only the team's countries and sets the picked one", async () => {
    renderPicker();
    fireEvent.click(screen.getByTestId("sidebar-country-picker"));
    fireEvent.click(await screen.findByText("Afghanistan"));
    expect(screen.queryByText("All Countries")).toBeNull();
    expect(setWorkingCountry).toHaveBeenCalledWith("af");
  });

  it("starts a multi-country team with no pick on its first country", () => {
    working = { ...working, countryId: null, countryName: null };
    renderPicker();
    expect(setWorkingCountry).toHaveBeenCalledWith("af");
  });

  it("does not default again when another picker mounts later (mobile menu)", () => {
    working = { ...working, countryId: null, countryName: null };
    renderPicker();
    expect(setWorkingCountry).toHaveBeenCalledTimes(1);
    cleanup();
    // The user then picks All Countries on a page and opens the mobile menu.
    renderPicker();
    expect(setWorkingCountry).toHaveBeenCalledTimes(1);
  });

  it("keeps an existing pick", () => {
    renderPicker();
    expect(setWorkingCountry).not.toHaveBeenCalled();
  });

  it("shows the ISO code when collapsed", () => {
    renderPicker(true);
    expect(screen.getByTestId("sidebar-country-picker").textContent).toBe("SD");
  });
});
