import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Analysis, AnalysisFigures } from "~/server/api/mappers/analysis";

vi.mock("../scope-map", () => ({ ScopeMap: () => null }));
vi.mock("next/link", () => ({
  default: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, vars?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
  useFormatter: () => ({
    dateTime: () => "1 Jan 2026",
    relativeTime: () => "2 days ago",
    number: (n: number, opts?: { style?: string }) => (opts?.style === "percent" ? `${Math.round(n * 100)}%` : String(n)),
  }),
  useNow: () => new Date("2026-09-29T12:00:00Z"),
}));

const { AnalysisOverview } = await import("./dark-analysis");

const figures: AnalysisFigures = {
  idpStock: null,
  refugees: null,
  returneeStock: null,
  overallPin: null,
  pinBySector: [],
};

function analysis(item = "8.58 / \u20138.6 million people are displaced"): Analysis {
  return {
    id: "a1",
    scope: { locationIds: ["sdn"], name: "Sudan", windowStart: "2026-01-01T00:00:00Z", windowEnd: null },
    crisis: {
      country: "Sudan",
      year: "2026",
      generatedAt: "2026-09-27T06:00:00Z",
      generatedByModel: "claude-sonnet-4-6",
      schemaVersion: "v4",
      reportCount: 1,
      qualityScore: 0.7,
      freshestSourceAt: null,
    },
    summary: "",
    summaryRefs: [],
    summaryLineRefs: {},
    stats: [],
    figures: { displaced: null, affected: null, inNeed: null, returnees: null, fundingRequired: null, fundingReceived: null },
    contextRisks: [
      {
        key: "demographics",
        label: "Demographics",
        items: [item],
        refs: [],
        lineRefs: {},
      },
    ],
    hazards: { hazards: [], vulnerabilities: [] },
    displacement: { push: [], return: [] },
    sectors: [],
    sources: [],
    changes: { comparedTo: null, notes: {} },
    scenarios: null,
    eventSourceIds: [],
    keyFindings: [],
  };
}

describe("AnalysisOverview figures", () => {
  it("renders a leading range as one figure and the remaining words as the sentence", () => {
    render(
      <AnalysisOverview
        data={analysis()}
        figures={figures}
        events={undefined}
        scopeName="Sudan"
        countryId="sdn"
        countryName="Sudan"
        areaIds={[]}
        isCountry
        onOpenSources={() => {}}
        noteFor={() => undefined}
      />,
    );

    expect(screen.getByText("8.58 / \u20138.6 million")).toBeInTheDocument();
    expect(screen.getByText("people are displaced")).toBeInTheDocument();
  });

  it("still splits a single leading number from the sentence", () => {
    render(
      <AnalysisOverview
        data={analysis("8.58 million people are displaced")}
        figures={figures}
        events={undefined}
        scopeName="Sudan"
        countryId="sdn"
        countryName="Sudan"
        areaIds={[]}
        isCountry
        onOpenSources={() => {}}
        noteFor={() => undefined}
      />,
    );

    expect(screen.getByText("8.58")).toBeInTheDocument();
    expect(screen.getByText("million people are displaced")).toBeInTheDocument();
  });

  it("labels the displaced split so rounded parts are not a second total", () => {
    render(
      <AnalysisOverview
        data={analysis()}
        figures={{
          ...figures,
          idpStock: { value: 7_250_000, low: null, high: null, newestAt: null },
          refugees: { value: 1_350_000, low: null, high: null, newestAt: null },
        }}
        events={undefined}
        scopeName="Sudan"
        countryId="sdn"
        countryName="Sudan"
        areaIds={[]}
        isCountry
        onOpenSources={() => {}}
        noteFor={() => undefined}
      />,
    );

    const split = screen.getByTestId("displaced-split");
    expect(screen.getByTestId("analysis-figures")).toHaveTextContent("8.6M");
    expect(split).toHaveTextContent("7.3M");
    expect(split).toHaveTextContent("1.4M");
    expect(split).toHaveTextContent("analysis.kpis.differentDates");
    expect(split).not.toHaveTextContent("8.7M");
  });
});
