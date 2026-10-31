import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import type { MetricDefinition, MetricSeriesResult } from "~/lib/metric-series";

/**
 * The "At a glance" tiles with metrics.series stubbed per metric: the latest
 * week's value, the four reasons a tile has no reading (a failed read, an API
 * without the registry, nothing measured, still loading), the selection and
 * the query each tile makes.
 */

type SeriesState = { data?: MetricSeriesResult; error?: { message: string; data?: { code: string } } | null };
let seriesStates: Record<string, SeriesState> = {};
const useSeries = vi.fn((input: { metric: string; granularity?: string; locationId?: string }, _options?: unknown) => ({
  isFetching: false,
  error: null,
  ...(seriesStates[input.metric] ?? {}),
}));
vi.mock("~/trpc/react", () => ({
  api: {
    metrics: {
      series: { useQuery: (...args: unknown[]) => useSeries(...(args as [{ metric: string }, unknown])) },
    },
  },
}));
// jsdom lays nothing out, so give the sparkline a fixed size to draw into.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) =>
      React.cloneElement(children, { width: 160, height: 40 }),
  };
});

const { MetricTiles, latestReading } = await import("./metric-tiles");

const definition = (key: string, name: string): MetricDefinition => ({
  key,
  name,
  dimension: "ACCURACY",
  unit: "SIGNALS",
  description: "d",
  timeBasis: "t",
  groupable: false,
  adr: "ADR-0012",
});
const DEFINITIONS = [
  definition("MEASURED", "Measured"),
  definition("FAILED", "Failed"),
  definition("MISSING", "Missing"),
  definition("EMPTY", "Empty"),
  definition("PENDING", "Pending"),
];
const bucket = (start: string, label: string, isPartial: boolean, numerator: number, denominator: number) => ({
  start,
  label,
  isPartial,
  group: null,
  numerator,
  denominator,
});
const ok = (metric: string, buckets: ReturnType<typeof bucket>[]): MetricSeriesResult => ({
  status: "ok",
  series: { metric, granularity: "WEEK", from: "2026-08-10T00:00:00.000Z", to: "2026-10-31T23:59:59.999Z", groups: [], buckets },
});

afterEach(() => {
  cleanup();
  seriesStates = {};
  useSeries.mockClear();
});

function wrap(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>{ui}</MantineProvider>
    </NextIntlClientProvider>,
  );
}

describe("latestReading", () => {
  it("is the last bucket that measured anything, or nothing", () => {
    expect(
      latestReading([
        { start: "2026-10-19T00:00:00.000Z", label: "2026-W43", isPartial: false, numerator: 10, denominator: 50 },
        { start: "2026-10-26T00:00:00.000Z", label: "2026-W44", isPartial: true, numerator: 0, denominator: 0 },
      ]),
    ).toEqual({ share: 0.2, label: "2026-W43", isPartial: false });
    expect(latestReading([])).toBeNull();
  });
});

describe("MetricTiles", () => {
  it("shows each metric's latest week, and says why a tile has no reading", () => {
    seriesStates = {
      MEASURED: {
        data: ok("MEASURED", [
          bucket("2026-10-19T00:00:00.000Z", "2026-W43", false, 10, 50),
          bucket("2026-10-26T00:00:00.000Z", "2026-W44", true, 20, 50),
        ]),
      },
      FAILED: { error: { message: "Request timed out", data: { code: "INTERNAL_SERVER_ERROR" } } },
      MISSING: { data: { status: "unavailable" } },
      EMPTY: { data: ok("EMPTY", [bucket("2026-10-26T00:00:00.000Z", "2026-W44", true, 0, 0)]) },
    };
    const onSelect = vi.fn();
    wrap(<MetricTiles definitions={DEFINITIONS} selected="MEASURED" onSelect={onSelect} nameOf={(d) => d.name} />);

    expect(screen.getByTestId("tile-value-MEASURED")).toHaveTextContent("40%");
    expect(screen.getByText("2026-W44, so far")).toBeInTheDocument();
    expect(screen.getByTestId("tile-value-FAILED")).toHaveTextContent("—");
    expect(screen.getByText("Couldn't load")).toHaveAttribute("title", "Request timed out");
    expect(screen.getByText("Not served by this API")).toBeInTheDocument();
    expect(screen.getByText("No data in the last 12 weeks")).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Show Measured" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Show Failed" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Show Failed" }));
    expect(onSelect).toHaveBeenCalledWith("FAILED");
  });

  it("asks clear-api for each metric by week, under the page's country only", () => {
    wrap(<MetricTiles definitions={DEFINITIONS.slice(0, 2)} selected="MEASURED" onSelect={() => undefined} locationId="loc-sdn" nameOf={(d) => d.name} />);
    expect(useSeries).toHaveBeenCalledWith({ metric: "MEASURED", granularity: "WEEK", locationId: "loc-sdn" }, expect.anything());
    expect(useSeries).toHaveBeenCalledWith({ metric: "FAILED", granularity: "WEEK", locationId: "loc-sdn" }, expect.anything());
  });
});
