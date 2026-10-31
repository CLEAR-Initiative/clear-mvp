import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import { withShares, type GqlLocationPrecisionMetrics } from "~/lib/location-precision";
import { PrecisionTiles } from "./precision-tiles";
import { PrecisionBySource } from "./precision-by-source";
import { PrecisionWeekly } from "./precision-weekly";
import { PrecisionMethodNote } from "./precision-method-note";

afterEach(() => cleanup());

// jsdom lays nothing out, so give the charts a fixed size to draw into.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) =>
      React.cloneElement(children, { width: 640, height: 260 }),
  };
});

function wrap(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>{ui}</MantineProvider>
    </NextIntlClientProvider>,
  );
}

// The shape dev returned on 31 Oct 2026, trimmed to two sources and two weeks.
const RAW: GqlLocationPrecisionMetrics = {
  from: "2026-10-19T00:00:00.000Z",
  to: "2026-11-01T23:59:59.999Z",
  signalsInRange: 2777,
  bySource: [
    { source: "sudan-war-x", total: 2457, noLocation: 3, country: 849, state: 963, district: 590, point: 52 },
    { source: "dataminr", total: 320, noLocation: 0, country: 10, state: 0, district: 0, point: 310 },
  ],
  weekly: [
    { isoWeek: "2026-W43", weekStart: "2026-10-19T00:00:00.000Z", source: "sudan-war-x", total: 1854, noLocation: 3, country: 629, state: 820, district: 380, point: 22, isPartial: false },
    { isoWeek: "2026-W44", weekStart: "2026-10-26T00:00:00.000Z", source: "sudan-war-x", total: 603, noLocation: 0, country: 220, state: 143, district: 210, point: 30, isPartial: true },
    { isoWeek: "2026-W43", weekStart: "2026-10-19T00:00:00.000Z", source: "dataminr", total: 200, noLocation: 0, country: 6, state: 0, district: 0, point: 194, isPartial: false },
    { isoWeek: "2026-W44", weekStart: "2026-10-26T00:00:00.000Z", source: "dataminr", total: 120, noLocation: 0, country: 4, state: 0, district: 0, point: 116, isPartial: true },
  ],
  corrections: { open: 2, accepted: 1, corrected: 1, declined: 0, superseded: 0 },
};

describe("PrecisionTiles", () => {
  it("shows the overall and emphasised shares with their n, and the challenges", () => {
    wrap(<PrecisionTiles metrics={withShares(RAW)} />);
    expect(screen.getByText("At district or finer")).toBeInTheDocument();
    // (590 + 52 + 310) / 2777
    expect(screen.getByText("34%")).toBeInTheDocument();
    expect(screen.getByText("952 of 2,777 signals")).toBeInTheDocument();
    expect(screen.getByText("sudan-war-x at district or finer")).toBeInTheDocument();
    expect(screen.getByText("26%")).toBeInTheDocument();
    expect(screen.getByText("Location challenges")).toBeInTheDocument();
    expect(screen.getByText("2 open · 2 decided")).toBeInTheDocument();
  });

  it("shows — with nothing in range", () => {
    wrap(<PrecisionTiles metrics={withShares({ ...RAW, signalsInRange: 0, bySource: [], weekly: [] })} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getByText("none in range")).toBeInTheDocument();
  });
});

describe("PrecisionBySource", () => {
  it("lists every level in the legend and opens a table view with the counts", () => {
    wrap(<PrecisionBySource metrics={withShares(RAW)} />);
    expect(screen.getByText("Where each source lands")).toBeInTheDocument();
    for (const level of ["No location", "Country", "State", "District", "Point"]) {
      expect(screen.getAllByText(level).length).toBeGreaterThan(0);
    }
    fireEvent.click(screen.getByText("Table view"));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("2,457")).toBeInTheDocument();
    expect(screen.getByText("Hide table")).toBeInTheDocument();
  });
});

describe("PrecisionWeekly", () => {
  it("draws one line per source, marks the deploy week, and offers the table", () => {
    const { container } = wrap(<PrecisionWeekly metrics={withShares(RAW)} />);
    expect(screen.getByText("Weekly trend")).toBeInTheDocument();
    expect(screen.getByLabelText("Legend")).toHaveTextContent("sudan-war-x");
    expect(screen.getByLabelText("Legend")).toHaveTextContent("dataminr");
    // The 29 Oct deploy falls in W44, which is in the data, so its marker is drawn.
    expect(container.textContent).toContain("Geocoding inside the model's area");
    fireEvent.click(screen.getByText("Table view"));
    expect(screen.getByText("2026-W43")).toBeInTheDocument();
    expect(screen.getByText("2026-W44 (partial)")).toBeInTheDocument();
  });
});

describe("PrecisionMethodNote", () => {
  it("explains the measurement in plain language", () => {
    wrap(<PrecisionMethodNote />);
    expect(screen.getByText("How location precision is measured")).toBeInTheDocument();
    expect(screen.getByText(/ADR-0012/)).toBeInTheDocument();
  });
});
