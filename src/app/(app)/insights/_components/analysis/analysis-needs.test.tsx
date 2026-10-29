import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { AnalysisFigures, PinSector } from "~/server/api/mappers/analysis";
import type { SaSector, SaSeverity } from "~/server/api/mappers/situation-analysis";
import type { AggregatedScopeNeeds } from "~/lib/scope-needs";

const needsResult: { data: AggregatedScopeNeeds | undefined } = { data: undefined };
vi.mock("~/trpc/react", () => ({
  api: { analysis: { needs: { useQuery: () => needsResult } } },
}));

vi.mock("next-intl", () => {
  const translator = (ns?: string) => {
    const t = (key: string, vars?: Record<string, unknown>) =>
      `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`;
    t.rich = (key: string, vars?: Record<string, unknown>) => t(key, vars);
    return t;
  };
  return {
    useTranslations: translator,
    useFormatter: () => ({ dateTime: () => "Aug 2025" }),
  };
});

afterEach(() => {
  needsResult.data = undefined;
  cleanup();
});

function sector(id: string, severity: SaSeverity, name: string): SaSector {
  return {
    id,
    code: id.slice(0, 2).toUpperCase(),
    name,
    severity,
    impact: [],
    humanitarian: [],
    atRisk: [],
    needs: ["water points"],
    interventions: [],
    coverage: [],
    refs: [],
    lineRefs: {},
    reportCount: 1,
    evidenceScope: "sector",
  };
}

function figures(pin: { sector: PinSector; value: number }[]): AnalysisFigures {
  return {
    idpStock: null,
    refugees: null,
    returneeStock: null,
    overallPin: null,
    pinBySector: pin.map((row) => ({
      sector: row.sector,
      figure: { value: row.value, low: null, high: null, newestAt: null },
    })),
  };
}

const { AnalysisNeeds } = await import("./analysis-needs");

describe("AnalysisNeeds", () => {
  it("shows the overview stock figure when the scope has no MSNA estimate", () => {
    render(
      <MantineProvider>
        <AnalysisNeeds
          scopeName="Sudan"
          locationIds={["sdn"]}
          sources={[]}
          sectors={[sector("wash", "critical", "WASH"), sector("nutrition", "high", "Nutrition")]}
          figures={figures([{ sector: "wash", value: 25_500_000 }])}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("25.5M", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Nutrition", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("common.severities.critical")).toBeInTheDocument();
    expect(screen.getByText("common.severities.high")).toBeInTheDocument();
    expect(screen.getAllByText("analysis.needs.notAssessed").length).toBeGreaterThan(0);
    expect(screen.getByText("crisisDetail.needs.columns.presence")).toBeInTheDocument();
    expect(screen.getByText("crisisDetail.needs.columns.precision")).toBeInTheDocument();
  });

  it("shows stock figures for Food, Nutrition, and Agriculture", () => {
    render(
      <MantineProvider>
        <AnalysisNeeds
          scopeName="Sudan"
          locationIds={["sdn"]}
          sources={[]}
          sectors={[
            sector("food", "critical", "Food"),
            sector("nutrition", "critical", "Nutrition"),
            sector("agriculture", "critical", "Agriculture"),
          ]}
          figures={figures([
            { sector: "food_security", value: 8_600_000 },
            { sector: "nutrition", value: 4_200_000 },
            { sector: "agriculture", value: 3_100_000 },
          ])}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("8.6M", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("4.2M", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("3.1M", { exact: true })).toBeInTheDocument();
  });

  it("shows SAF severity, the MSNA people-in-need estimate, and partner coverage, and keeps the reporting grade", () => {
    needsResult.data = {
      hasMsna: true,
      ochaAsOf: "2025-08-01",
      sectors: [
        {
          key: "health",
          saf: "Catastrophic",
          pin: 90_000,
          pinIsApprox: false,
          hasMsna: true,
          ocha: {
            code: "HLT",
            name: "Health",
            org_count: 2,
            by_type: { "International NGO": 1, "United Nations": 1 },
            organizations: [
              { acronym: "IMC", name: "International Medical Corps", type: "International NGO" },
              { acronym: "WHO", name: "World Health Organization", type: "United Nations" },
            ],
          },
        },
        { key: "wash", saf: "Severe", pin: 40_000, pinIsApprox: false, hasMsna: true, ocha: null },
        { key: "shelter", saf: null, pin: null, pinIsApprox: false, hasMsna: false, ocha: null },
        { key: "protection", saf: null, pin: null, pinIsApprox: false, hasMsna: false, ocha: null },
        { key: "food", saf: null, pin: null, pinIsApprox: false, hasMsna: false, ocha: null },
        { key: "education", saf: null, pin: null, pinIsApprox: false, hasMsna: false, ocha: null },
      ],
    };
    render(
      <MantineProvider>
        <AnalysisNeeds
          scopeName="North Kordofan"
          locationIds={["sheikan"]}
          sources={[]}
          sectors={[sector("health", "high", "Health"), sector("wash", "critical", "WASH")]}
          figures={figures([{ sector: "health", value: 1_000_000 }])}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("crisisDetail.needs.saf.catastrophic")).toBeInTheDocument();
    expect(screen.getByText("crisisDetail.needs.saf.severe")).toBeInTheDocument();
    expect(screen.getByText("90K", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("40K", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("1M")).not.toBeInTheDocument();
    expect(screen.getByText("2", { exact: true })).toBeInTheDocument();
    expect(screen.getByText(/crisisDetail\.needs\.severityFromMsna/)).toBeInTheDocument();
    expect(screen.getByText(/crisisDetail\.needs\.presenceFromOcha/)).toBeInTheDocument();
    expect(screen.getByText("North Kordofan")).toBeInTheDocument();
    expect(screen.getByText('analysis.needs.reportingGrade:{"grade":"common.severities.high"}')).toBeInTheDocument();
    expect(screen.queryByText("crisisDetail.needs.responseGap")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("crisisDetail.needs.sectors.health"));
    expect(screen.getByText("water points")).toBeInTheDocument();
    expect(screen.getByText("IMC")).toBeInTheDocument();
  });
});
