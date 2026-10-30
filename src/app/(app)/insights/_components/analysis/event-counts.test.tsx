import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { createTranslator } from "use-intl/core";
import type { AnalysisEvent, AnalysisEvents } from "~/server/api/mappers/analysis";
import type { SaSource } from "~/server/api/mappers/situation-analysis";
import en from "../../../../../../messages/en.json";
import { CitedEvents } from "./cited-events";

vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="crisis-map" /> }));
vi.mock("~/trpc/react", () => ({
  api: {
    locations: { getById: { useQuery: () => ({ data: null }) } },
    useQueries: (build: (q: { locations: { getById: () => { data: null } } }) => unknown[]) =>
      build({ locations: { getById: () => ({ data: null }) } }),
  },
}));

const { ScopeMap } = await import("./scope-map");

const t = createTranslator({ locale: "en", messages: en, namespace: "analysis" });

function event(id: string): AnalysisEvent {
  return {
    id,
    title: "Shelling",
    types: ["conflict"],
    severity: 3,
    startedAt: "2026-09-20T00:00:00Z",
    lastSignalAt: "2026-09-21T00:00:00Z",
    casualties: null,
    populationDisplaced: null,
    point: null,
    locationName: null,
    admin1: null,
  };
}

function source(id: string, title = id, publishedAt: string | null = null): SaSource {
  return { id, title, url: null, publishedAt, publisher: null };
}

function renderCited(sources: SaSource[], events: AnalysisEvent[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <CitedEvents sources={sources} events={events} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("Analysis event count labels", () => {
  it("names the header count as cited events, not every event in the country", () => {
    expect(t("meta.builtFrom", { reports: 40, events: 115 })).toBe("40 reports, 115 cited events");
  });

  it("lists only the cited events, each under its citation number", () => {
    renderCited(
      [source("r1", "OCHA update"), source("event:e1"), source("event:e2")],
      [{ ...event("e1"), title: "Shelling in Nyala" }, { ...event("e2"), title: "Clashes in Gereida", locationName: "Gereida" }],
    );
    const rows = screen.getAllByTestId("analysis-event-row");
    expect(rows.map((r) => r.getAttribute("href"))).toEqual(["/event/e1?from=analysis", "/event/e2?from=analysis"]);
    expect(rows[0]).toHaveTextContent("2.");
    expect(rows[0]).toHaveTextContent("Shelling in Nyala");
    expect(rows[1]).toHaveTextContent("3.");
    expect(rows[1]).toHaveTextContent("Gereida");
    expect(screen.getByTestId("analysis-events")).toHaveTextContent("2 events");
    expect(screen.getByTestId("analysis-events")).not.toHaveTextContent("OCHA update");
  });

  it("still lists a cited event whose details did not load", () => {
    renderCited([source("event:e9", "event:e9", "2026-09-22T00:00:00Z")], []);
    const row = screen.getByTestId("analysis-event-row");
    expect(row).toHaveAttribute("href", "/event/e9?from=analysis");
    expect(row).toHaveTextContent("Untitled event");
    expect(row).toHaveTextContent("Sep 22");
    expect(row).not.toHaveTextContent("event:e9");
  });

  it("says the analysis cites no events", () => {
    renderCited([source("r1", "OCHA update")], []);
    expect(screen.getByTestId("analysis-events")).toHaveTextContent("This analysis cites no events.");
    expect(screen.queryByTestId("analysis-event-row")).toBeNull();
  });

  it("keeps the map off zero and the empty copy while events are loading", () => {
    renderMap(undefined);
    const map = screen.getByRole("region", { name: "Analysis area" });
    expect(map).toHaveTextContent("Loading events…");
    expect(map).not.toHaveTextContent("No events recorded");
    expect(map.textContent).not.toMatch(/\b0\b/);
  });

  it("names the map total as events in this area since the window", () => {
    renderMap({
      totalCount: 4465,
      items: [{ ...event("e1"), point: [25.3, 13.6], locationName: "El Fasher", admin1: { id: "nd", name: "North Darfur" } }],
    });
    const map = screen.getByRole("region", { name: "Analysis area" });
    expect(map).toHaveTextContent("events in this area since Jan 1, 2026");
    expect(map.textContent?.replaceAll(",", "")).toContain("4465");
    expect(map).not.toHaveTextContent("Loading events…");
    expect(map).not.toHaveTextContent("No events recorded");
  });

  it("keeps the empty copy when the events query succeeds with none", () => {
    renderMap({ totalCount: 0, items: [] });
    const map = screen.getByRole("region", { name: "Analysis area" });
    expect(map).toHaveTextContent("No events recorded in this area since Jan 1, 2026.");
    expect(map).not.toHaveTextContent("Loading events…");
  });

  it("says the events request failed instead of staying on loading", () => {
    renderMap(undefined, true);
    const map = screen.getByRole("region", { name: "Analysis area" });
    expect(map).toHaveTextContent("Events could not be loaded.");
    expect(map).not.toHaveTextContent("Loading events…");
    expect(map).not.toHaveTextContent("No events recorded");
    expect(map.textContent).not.toMatch(/\b0\b/);
  });
});

function renderMap(events: AnalysisEvents | undefined, failed = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <ScopeMap
        countryId="sdn"
        countryName="Sudan"
        scopeName="Sudan"
        areaIds={[]}
        since="2026-01-01T00:00:00.000Z"
        events={events}
        failed={failed}
      />
    </NextIntlClientProvider>,
  );
}
