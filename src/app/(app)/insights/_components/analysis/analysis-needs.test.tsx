import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { AnalysisFigures, PinSector } from "~/server/api/mappers/analysis";
import type { SaSector, SaSeverity } from "~/server/api/mappers/situation-analysis";
import { AnalysisNeeds } from "./analysis-needs";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => (ns ? `${ns}.${key}` : key),
}));

afterEach(cleanup);

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

describe("AnalysisNeeds", () => {
  it("shows the overview stock figure on a known sector and lists an extra sector from the analysis", () => {
    render(
      <MantineProvider>
        <AnalysisNeeds
          scopeName="Sudan"
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
    expect(screen.getByText("analysis.needs.noFigure")).toBeInTheDocument();
    expect(screen.queryByText("crisisDetail.needs.columns.presence")).not.toBeInTheDocument();
    expect(screen.queryByText("crisisDetail.needs.columns.precision")).not.toBeInTheDocument();
  });

  it("shows stock figures for Food, Nutrition, and Agriculture", () => {
    render(
      <MantineProvider>
        <AnalysisNeeds
          scopeName="Sudan"
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
    expect(screen.queryByText("analysis.needs.noFigure")).not.toBeInTheDocument();
  });
});
