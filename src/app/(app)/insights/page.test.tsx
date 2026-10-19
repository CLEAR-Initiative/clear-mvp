import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

/**
 * Insights tabs. Analysis is always present. Crisis Overview and Situation
 * Analysis still follow their flags.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

let flags: Record<string, boolean> = {};
vi.mock("~/components/feature-flags-provider", () => ({
  useFeatureEnabled: (key: string) => flags[key] ?? true,
}));

vi.mock("~/hooks/use-team-country", () => ({
  useTeamCountry: () => ({ countries: [], showCountrySelector: false, scopeReady: true }),
  useScopedCountryOptions: () => [],
}));
vi.mock("~/hooks/use-locations", () => ({
  useLocations: () => ({ countries: [] }),
}));

vi.mock("./_components/reports-tab", () => ({ ReportsTab: () => <div>crisis-panel</div> }));
vi.mock("./_components/situation/situation-tab", () => ({ SituationTab: () => <div>situation-panel</div> }));
vi.mock("./_components/analysis/analysis-tab", () => ({ AnalysisTab: () => <div>analysis-panel</div> }));

import InsightsPage from "./page";

function renderPage() {
  return render(
    <MantineProvider>
      <InsightsPage />
    </MantineProvider>,
  );
}

afterEach(() => {
  cleanup();
  flags = {};
});

describe("Insights tabs", () => {
  it("shows Analysis after Situation Analysis even when a stored analysis_v2 flag is off", () => {
    flags = { analysis_v2: false, crisis_overview: true, situation_analysis: true };
    renderPage();

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["page.tabs.crisis", "page.tabs.situation", "page.tabs.analysis"]);
  });

  it("opens Analysis when the other Insights tabs are turned off", async () => {
    flags = { crisis_overview: false, situation_analysis: false, analysis_v2: false };
    renderPage();

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["page.tabs.analysis"]);
    await waitFor(() => expect(screen.getByText("analysis-panel")).toBeTruthy());
  });

  it("keeps Crisis Overview and Situation Analysis and opens Analysis on click", () => {
    flags = { crisis_overview: true, situation_analysis: true };
    renderPage();

    expect(screen.getByText("crisis-panel")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "page.tabs.analysis" }));
    expect(screen.getByText("analysis-panel")).toBeTruthy();
    expect(screen.queryByText("crisis-panel")).toBeNull();
  });
});
