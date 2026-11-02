import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { SaDisplacement } from "~/server/api/mappers/situation-analysis";

/** The real map needs WebGL. This one projects 30 px per degree and renders the overlay. */
vi.mock("next/dynamic", () => ({
  default: () =>
    function FakeMap({ mapApiRef, children }: { mapApiRef: { current: unknown }; children?: React.ReactNode }) {
      mapApiRef.current = { projectMarker: (_: number, lng: number, lat: number) => ({ x: (lng - 15) * 30, y: (25 - lat) * 30 }) };
      return <div data-testid="crisis-map">{children}</div>;
    },
}));
Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 660 });
Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 440 });

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children?: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string, vars?: Record<string, unknown>) =>
    `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
}));

/** Sudan as a box, and the places the flows name. */
const geometries: Record<string, unknown> = {
  sdn: { type: "Polygon", coordinates: [[[22, 9], [38, 9], [38, 22], [22, 22], [22, 9]]] },
  khr: { type: "Point", coordinates: [32.5, 15.6] },
};
const location = (id: string) => ({ data: { id, geometry: geometries[id] ?? null } });
vi.mock("~/trpc/react", () => ({
  api: {
    locations: { getById: { useQuery: ({ id }: { id: string }) => location(id) } },
    useQueries: (build: (q: { locations: { getById: (input: { id: string }) => string } }) => string[]) =>
      build({ locations: { getById: ({ id }) => id } }).map(location),
  },
}));

const { DisplacementBody, displacementMeta } = await import("./displacement-section");

/** The six findings, data check, and flows of the "Situation Analysis" handoff. */
const designed: SaDisplacement = {
  push: [],
  return: [],
  summary: "Conflict drives most movement.",
  findings: [
    { label: "What forces people out", callout: "Conflict", text: "882 displacement-triggering incidents recorded since April 2023.", refs: [1], tone: "out", group: null, asOf: "to 31 Aug 2026", isNew: false },
    { label: "Blue Nile · Geisan", callout: "20,000+", text: "fled several localities in Geisan after RSF bombardment.", refs: [], tone: "out", group: "idp", asOf: null, isNew: true },
    { label: "Across borders", callout: "64% fled insecurity", text: "of people crossing into Chad in June.", refs: [], tone: "out", group: "refugee", asOf: "Jun 2026", isNew: false },
    { label: "Uneven returns", callout: "59% vs <1%", text: "Khartoum has seen 59% of its displaced return.", refs: [], tone: "back", group: "idp", asOf: "Jul 2026", isNew: false },
    { label: "Conditions on return", callout: "Resources ran out", text: "is why every surveyed returnee in North Darfur went back.", refs: [], tone: "back", group: "idp", asOf: null, isNew: false },
    { label: "Movement barriers", callout: "Kharif rains", text: "Runoff is blocking transport in Blue Nile.", refs: [], tone: "neutral", group: null, asOf: null, isNew: false },
  ],
  dataCheck: { text: "Returns data implies 6.4M still displaced inside Sudan, against the 8.6M in Key figures.", refs: [] },
  flows: [
    { direction: "out", group: "refugee", from: { id: null, name: null }, to: { id: null, name: "South Sudan" }, label: "South Sudan >1.3M", sublabel: "largest single destination", people: 1_300_000, finding: 3 , refs: [], eventId: null },
    { direction: "out", group: "refugee", from: { id: null, name: null }, to: { id: null, name: "Chad" }, label: "Chad · 5,402", sublabel: "arrivals in June (monthly)", people: 5_402, finding: 3 , refs: [], eventId: null },
    { direction: "out", group: "refugee", from: { id: null, name: null }, to: { id: null, name: null }, label: "Other countries", sublabel: "not broken down in source", people: null, finding: null , refs: [], eventId: null },
    { direction: "back", group: "idp", from: { id: null, name: null }, to: { id: "khr", name: "Khartoum" }, label: "Khartoum · 2.6M back", sublabel: "59% have returned", people: 2_600_000, finding: 4 , refs: [], eventId: null },
  ],
  mapSince: "April 2023",
};

function renderBody(displacement: SaDisplacement) {
  return render(
    <MantineProvider>
      <DisplacementBody
      displacement={displacement}
      countryId="sdn"
      countryName="Sudan"
      areaIds={[]}
      scopeName="Sudan"
      inside={8_600_000}
      sources={[]}
      onOpenSources={() => {}}
      />
    </MantineProvider>,
  );
}

describe("Displacement section", () => {
  afterEach(cleanup);

  it("lays out the designed story: label, callout, sentence, date, and NEW", () => {
    renderBody(designed);
    const rows = screen.getAllByTestId("displacement-finding");
    // Refugees start switched off, so "Across borders" is hidden.
    expect(rows.map((r) => r.getAttribute("data-tone"))).toEqual(["out", "out", "back", "back", "neutral"]);
    expect(rows[2]).toHaveTextContent("Uneven returns");
    expect(rows[2]).toHaveTextContent("59% vs <1%");
    expect(rows[2]).toHaveTextContent("Jul 2026");
    expect(within(rows[1]!).getByText(/analysis\.layout\.newMark/)).toBeInTheDocument();
    expect(screen.getByTestId("displacement-data-check")).toHaveTextContent("analysis.findings.dataCheck");
  });

  it("starts on internally displaced people and shows refugees when switched on", () => {
    const { container } = renderBody(designed);
    const idp = screen.getByRole("button", { name: /analysis\.findings\.groupIdp/ });
    const refugees = screen.getByRole("button", { name: /analysis\.findings\.groupRefugee/ });
    expect(idp).toHaveAttribute("aria-pressed", "true");
    expect(refugees).toHaveAttribute("aria-pressed", "false");
    // Findings about each group: one about refugees, three about internally displaced people.
    expect(refugees).toHaveTextContent("1");
    expect(idp).toHaveTextContent("3");
    expect(screen.getByTestId("displacement-map")).not.toHaveTextContent("South Sudan >1.3M");
    // The only IDP movement is a return with no known origin: a circle, not an arrow.
    expect(container.querySelectorAll("path[marker-end]")).toHaveLength(0);
    expect(screen.getByTestId("displacement-map")).toHaveTextContent("Khartoum · 2.6M back");

    fireEvent.click(refugees);
    expect(screen.getAllByTestId("displacement-finding")).toHaveLength(6);
    expect(screen.getByTestId("displacement-map")).toHaveTextContent("South Sudan >1.3M");

    fireEvent.click(idp);
    // Findings about both groups stay: drivers and barriers.
    expect(screen.getAllByTestId("displacement-finding").map((r) => r.textContent)).toEqual([
      expect.stringContaining("What forces people out"),
      expect.stringContaining("Across borders"),
      expect.stringContaining("Movement barriers"),
    ]);
  });

  it("cannot switch on a group the analysis has nothing about", () => {
    renderBody({ ...designed, findings: designed.findings.filter((f) => f.group !== "refugee"), flows: designed.flows.filter((f) => f.group !== "refugee") });
    expect(screen.getByRole("button", { name: /analysis\.findings\.groupRefugee/ })).toBeDisabled();
  });

  it("draws the movement map with the inside total, flows, labels, and finding badges", () => {
    const { container } = renderBody(designed);
    fireEvent.click(screen.getByRole("button", { name: /analysis\.findings\.groupRefugee/ }));
    const map = screen.getByTestId("displacement-map");
    expect(map).toHaveTextContent('analysis.findings.movementSince:{"since":"April 2023"}');
    expect(map).toHaveTextContent("8.6M");
    expect(map).toHaveTextContent("South Sudan >1.3M");
    expect(map).toHaveTextContent("Khartoum · 2.6M back");
    expect(map).toHaveTextContent("Other countries");
    // Three arrows with heads; the return without a known origin is a circle.
    expect(container.querySelectorAll("path[marker-end]")).toHaveLength(3);
    // Findings 3 and 4 are on the map, so their list numbers are coloured.
    expect(screen.getAllByText("3").length).toBeGreaterThan(1);
  });

  it("marks a movement caused by an event and links its label to the event", () => {
    const withEvent: SaDisplacement = {
      ...designed,
      flows: designed.flows.map((f, i) => (i === 3 ? { ...f, eventId: "ev-9" } : f)),
    };
    const { container } = renderBody(withEvent);
    expect(screen.getAllByTestId("displacement-map-event")).toHaveLength(1);
    expect(container.querySelector('a[href*="ev-9"]')).toHaveTextContent("Khartoum · 2.6M back");
    expect(screen.getByTestId("displacement-map")).toHaveTextContent("analysis.findings.movementLegendEvent");
  });

  it("draws where events displaced people, following the IDP toggle", () => {
    render(
      <MantineProvider>
        <DisplacementBody
          displacement={designed}
          countryId="sdn"
          countryName="Sudan"
          areaIds={[]}
          scopeName="Sudan"
          inside={8_600_000}
          events={{
            totalCount: 2,
            items: [
              { id: "ev-1", title: "Battles", types: [], severity: 3, startedAt: "", lastSignalAt: "", casualties: null, populationDisplaced: 31_287, point: [30, 13], locationName: "Gebrat Al Sheikh", admin1: null },
              { id: "ev-2", title: "Calm", types: [], severity: 1, startedAt: "", lastSignalAt: "", casualties: null, populationDisplaced: null, point: [31, 14], locationName: "Nowhere", admin1: null },
            ],
          }}
          sources={[]}
          onOpenSources={() => {}}
        />
      </MantineProvider>,
    );
    const map = screen.getByTestId("displacement-map");
    expect(map).toHaveTextContent("Gebrat Al Sheikh");
    expect(map).not.toHaveTextContent("Nowhere");
    expect(screen.getByTestId("displacement-inside")).toHaveTextContent("8.6M");
    fireEvent.click(screen.getByRole("button", { name: /analysis\.findings\.groupIdp/ }));
    expect(screen.getByTestId("displacement-map")).not.toHaveTextContent("Gebrat Al Sheikh");
  });

  it("counts findings and the map for the header", () => {
    expect(displacementMeta(designed)).toEqual({ count: 6, map: true });
    expect(displacementMeta({ ...designed, findings: [], push: [{ text: "a", refs: [] }] })).toEqual({ count: 1, map: false });
  });

  it("shows six older bullets, no map, and the rest behind Show all", () => {
    const bullets = Array.from({ length: 8 }, (_, i) => ({ text: `Push ${i + 1}.`, refs: [] }));
    renderBody({ ...designed, summary: null, findings: [], dataCheck: null, flows: [], push: bullets });
    expect(screen.getAllByTestId("displacement-finding")).toHaveLength(6);
    expect(screen.queryByTestId("displacement-map")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: 'analysis.findings.showAll:{"count":8}' }));
    expect(screen.getAllByTestId("displacement-finding")).toHaveLength(8);
  });
});
