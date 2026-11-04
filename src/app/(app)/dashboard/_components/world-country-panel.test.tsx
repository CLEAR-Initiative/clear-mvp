import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import { nrcOperatingCountry } from "~/lib/data/nrc-operating-countries";

const ok = <T,>(data: T) => ({ data, isLoading: false, isError: false });

let teamCountries: { id: string; name: string }[] = [];
let allCountries: { id: string; name: string }[] = [];
let figures: Record<string, unknown> = {};
let severity: unknown = null;
const scopesQuery = vi.fn();

vi.mock("~/trpc/react", () => ({
  api: {
    inform: {
      getRisk: {
        useQuery: () =>
          ok({
            score: 7.8,
            pillars: { hazard: 8.3, vulnerability: 7.5, coping: 7.7 },
            indicators: [{ id: "HA.HUM", name: "Conflict & Human Hazard", score: 10, pillar: "HA" }],
            edition: "INFORM Risk Mid 2026",
          }),
      },
      getSeverity: { useQuery: () => ok(severity) },
    },
    hapi: { countryFigures: { useQuery: () => ok(figures) } },
    situationAnalysis: { countries: { useQuery: () => ok(allCountries) } },
    analysis: {
      scopes: {
        useQuery: (input: { countries: { id: string; name: string }[] }, opts: { enabled: boolean }) => {
          scopesQuery(input, opts);
          const c = input.countries[0];
          return ok(
            c
              ? { countries: [{ id: c.id, name: c.name, analysisId: "a1", generatedAt: "2026-11-01T00:00:00Z", headline: "Fighting displaced 40,000 in El Fasher." }], created: [] }
              : { countries: [], created: [] },
          );
        },
      },
    },
  },
}));
vi.mock("~/providers/team-provider", () => ({ useTeam: () => ({ activeTeamId: "t1" }) }));
vi.mock("~/hooks/use-team-country", () => ({
  useTeamCountry: () => ({ countries: teamCountries, scopeReady: true }),
}));

const { WorldCountryPanel, informRiskClass } = await import("./world-country-panel");

function renderPanel(iso2: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC" now={new Date("2026-11-03T12:00:00Z")}>
      <MantineProvider>
        <WorldCountryPanel country={nrcOperatingCountry(iso2)!} onClose={() => {}} />
      </MantineProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  teamCountries = [];
  allCountries = [];
  figures = {
    peopleInNeed: null, refugeesHosted: null, internallyDisplaced: null,
    appeal: null, politicalViolence: null, ipcPhase3Plus: null, failed: [],
  };
  severity = null;
  scopesQuery.mockClear();
});
afterEach(cleanup);

describe("WorldCountryPanel analysis", () => {
  it("links to the analysis of a country in the team's scope", () => {
    teamCountries = [{ id: "loc-sd", name: "Sudan" }];
    renderPanel("SD");
    expect(screen.getByText("Fighting displaced 40,000 in El Fasher.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open analysis/ }).getAttribute("href")).toBe("/insights?country=loc-sd");
  });

  it("shows nothing about the analysis outside the team's scope", () => {
    teamCountries = [{ id: "loc-af", name: "Afghanistan" }];
    renderPanel("SD");
    expect(screen.queryByText("Country analysis")).toBeNull();
    expect(screen.queryByRole("link", { name: /Open analysis/ })).toBeNull();
    expect(scopesQuery).toHaveBeenLastCalledWith(expect.objectContaining({ countries: [] }), expect.objectContaining({ enabled: false }));
  });

  it("matches the API's long country names", () => {
    teamCountries = [{ id: "loc-ve", name: "Venezuela (Bolivarian Republic of)" }];
    renderPanel("VE");
    expect(screen.getByRole("link", { name: /Open analysis/ }).getAttribute("href")).toBe("/insights?country=loc-ve");
  });

  it("lets an unscoped team open any country, like Insights", () => {
    allCountries = [{ id: "loc-md", name: "Moldova" }];
    renderPanel("MD");
    expect(screen.getByRole("link", { name: /Open analysis/ }).getAttribute("href")).toBe("/insights?country=loc-md");
  });
});

describe("WorldCountryPanel figures", () => {
  it("shows every figure, saying whether a source has no data or failed", () => {
    figures = {
      ...figures,
      refugeesHosted: { value: 2_829_444, asOf: "2025-12-31" },
      appeal: { name: "HNRP", year: 2026, requirementsUsd: 619_784_400, fundingUsd: 1, fundingPct: 49 },
      failed: ["ipc"],
    };
    renderPanel("CO");
    expect(screen.getByText("2.8M")).toBeTruthy();
    expect(screen.getByText("49% funded")).toBeTruthy();
    expect(screen.getAllByText("No data from this source")).toHaveLength(3);
    expect(screen.getAllByText("Unavailable right now")).toHaveLength(1);
  });

  it("marks a figure over a year old and gives an IPC period as a range", () => {
    figures = {
      ...figures,
      peopleInNeed: { value: 21_400_000, asOf: "2024-12-31" },
      internallyDisplaced: { value: 3_500_000, asOf: "2026-09-30" },
      ipcPhase3Plus: { value: 2_000_000, fraction: null, from: "2026-09-01", asOf: "2027-01-31" },
    };
    renderPanel("UG");
    expect(screen.getAllByText("Over a year old")).toHaveLength(1);
    expect(screen.getByText(/Sep 2026\s*.\s*Jan 2027/)).toBeTruthy();
  });

  it("names the source of each figure", () => {
    renderPanel("CO");
    for (const source of ["OCHA Humanitarian Needs and Response Plan", "UNHCR", "ACLED"]) {
      expect(screen.getByLabelText(`Source: ${source}, via HDX HAPI`)).toBeTruthy();
    }
  });

  it("shows the ACAPS index on its 0 to 10 scale", () => {
    severity = { score: 9.1, category: "Very High", categoryNumeric: 5, crisisName: "Conflict in Ukraine" };
    renderPanel("UA");
    expect(screen.getByText("9.1")).toBeTruthy();
    expect(screen.getAllByText("/10")).toHaveLength(2);
    expect(screen.queryByText("/5")).toBeNull();
  });

  it("shows INFORM Risk with its class and source edition", () => {
    renderPanel("SD");
    expect(screen.getByText("7.8")).toBeTruthy();
    expect(screen.getByText("Very high")).toBeTruthy();
    expect(screen.getByText("Source: JRC INFORM Risk Mid 2026")).toBeTruthy();
  });

  it("says when ACAPS tracks no crisis", () => {
    renderPanel("MD");
    expect(screen.getByText("No crisis tracked by ACAPS for this country.")).toBeTruthy();
  });
});

describe("informRiskClass", () => {
  it("follows the JRC class thresholds", () => {
    expect(informRiskClass(6.5)).toBe("veryHigh");
    expect(informRiskClass(6.4)).toBe("high");
    expect(informRiskClass(5)).toBe("high");
    expect(informRiskClass(3.5)).toBe("medium");
    expect(informRiskClass(2)).toBe("low");
    expect(informRiskClass(1.9)).toBe("veryLow");
  });
});
