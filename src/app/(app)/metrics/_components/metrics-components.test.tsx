import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../../../../../messages/en.json";
import { withShares, type GqlDetectionMetrics } from "~/lib/detection-metrics";
import { StatTiles } from "./stat-tiles";

afterEach(() => cleanup());

function wrap(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <MantineProvider>{ui}</MantineProvider>
    </NextIntlClientProvider>,
  );
}

const HISTOGRAM = [
  ...Array.from({ length: 8 }, (_, d) => ({ daysAfterOnset: d, isOpenEnded: false, count: 0 })),
  { daysAfterOnset: 8, isOpenEnded: true, count: 0 },
];

const RAW: GqlDetectionMetrics = {
  from: "2026-07-20T00:00:00.000Z",
  to: "2026-10-14T12:00:00.000Z",
  eventsInRange: 40,
  withOnset: 30,
  counted: 20,
  sameDay: 5,
  byNextDay: 15,
  histogram: HISTOGRAM.map((row, i) => ({ ...row, count: i === 0 ? 5 : i === 1 ? 10 : i === 8 ? 5 : 0 })),
  weekly: [
    { isoWeek: "2026-W41", weekStart: "2026-10-05T00:00:00.000Z", counted: 4, sameDay: 1, byNextDay: 3, isPartial: false },
    { isoWeek: "2026-W42", weekStart: "2026-10-12T00:00:00.000Z", counted: 0, sameDay: 0, byNextDay: 0, isPartial: true },
  ],
  exclusions: [
    { reason: "NO_INGESTED_SIGNAL", count: 6 },
    { reason: "NO_ONSET", count: 10 },
    { reason: "DATE_ONLY_FIRST_SIGNAL", count: 3 },
    { reason: "BEFORE_ONSET", count: 1 },
  ],
};

const EMPTY: GqlDetectionMetrics = {
  ...RAW,
  eventsInRange: 0,
  withOnset: 0,
  counted: 0,
  sameDay: 0,
  byNextDay: 0,
  histogram: HISTOGRAM,
  weekly: [],
  exclusions: RAW.exclusions.map((e) => ({ ...e, count: 0 })),
};

describe("StatTiles", () => {
  it("shows each share as a whole percent with its n", () => {
    wrap(<StatTiles metrics={withShares(RAW)} />);
    expect(screen.getByText("Detected by next day")).toBeInTheDocument();
    expect(screen.getAllByText("75%")).toHaveLength(2);
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("15 of 20 measured")).toBeInTheDocument();
    expect(screen.getByText("30 of 40 in range")).toBeInTheDocument();
  });

  it("shows a share with no denominator as —", () => {
    wrap(<StatTiles metrics={withShares(EMPTY)} />);
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getAllByText("0 of 0 measured")).toHaveLength(2);
  });
});
