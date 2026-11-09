import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { SaSource } from "~/server/api/mappers/situation-analysis";
import { SituationSources } from "./situation-sources";

vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) => (key: string) => `${ns ?? ""}.${key}`,
  useFormatter: () => ({ dateTime: () => "1 Jan 2026" }),
}));

const EVENT_ID = "event:e-unresolved";
const UNTITLED_EVENT_ID = "event:e-missing-title";
const HAPI_ID = "api:sdn:hapi_humanitarian_needs:pin-2026";

function source(id: string, title = id): SaSource {
  return { id, title, url: null, publishedAt: null, publisher: null };
}

function renderSources(sources: SaSource[], include?: (source: SaSource) => boolean) {
  return render(
    <MantineProvider>
      <SituationSources sources={sources} className="sources-card" include={include} />
    </MantineProvider>,
  );
}

describe("Analysis sources", () => {
  afterEach(() => {
    cleanup();
  });

  it("hides an event id and a HAPI id behind typed labels", () => {
    renderSources([
      source(EVENT_ID),
      source(UNTITLED_EVENT_ID, ""),
      source("event:e-placeholder", "Untitled report"),
      source(HAPI_ID),
    ]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("insights.situation.sources.eventLabel");
    expect(list).toHaveTextContent("insights.situation.sources.hapiFigure");
    expect(list).not.toHaveTextContent(EVENT_ID);
    expect(list).not.toHaveTextContent(UNTITLED_EVENT_ID);
    expect(list).not.toHaveTextContent("Untitled report");
    expect(list).not.toHaveTextContent(HAPI_ID);
    expect(list).not.toHaveTextContent("ReliefWeb report");
  });

  it("lists only the included sources, each under its own citation number", () => {
    renderSources(
      [source("r1", "OCHA update"), source("event:e1", "Shelling"), source("r2", "WFP brief")],
      (s) => !s.id.startsWith("event:"),
    );

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("1.OCHA update");
    expect(list).toHaveTextContent("3.WFP brief");
    expect(list).not.toHaveTextContent("Shelling");
  });

  it("tells two untitled HAPI figures apart by their indicator", () => {
    renderSources([
      source("api:sdn:hapi_humanitarian_needs:pin-2026", ""),
      source("api:sdn:hapi_humanitarian_needs:funding-2026", ""),
    ]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("pin 2026");
    expect(list).toHaveTextContent("funding 2026");
  });

  it("qualifies duplicate report titles with the publisher", () => {
    renderSources([
      { ...source("r1", "Humanitarian update"), publisher: "OCHA" },
      { ...source("r2", "Humanitarian update"), publisher: "IOM" },
    ]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("Humanitarian update (OCHA)");
    expect(list).toHaveTextContent("Humanitarian update (IOM)");
  });

  it("tells apart duplicate titles that share a publisher by their link host", () => {
    renderSources([
      { ...source("r1", "Humanitarian update"), publisher: "OCHA", url: "https://reliefweb.int/a", publishedAt: "2024-01-01T00:00:00.000Z" },
      { ...source("r2", "Humanitarian update"), publisher: "OCHA", url: "https://www.unocha.org/b", publishedAt: "2024-01-01T00:00:00.000Z" },
    ]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("reliefweb.int");
    expect(list).toHaveTextContent("unocha.org");
  });

  it("numbers a remaining tie instead of showing an id", () => {
    renderSources([
      { ...source("r1", "Humanitarian update"), publisher: "OCHA", url: "https://reliefweb.int/a" },
      { ...source("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "Humanitarian update"), publisher: "OCHA", url: "https://reliefweb.int/b" },
    ]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("Humanitarian update (OCHA) (reliefweb.int) (1)");
    expect(list).toHaveTextContent("Humanitarian update (OCHA) (reliefweb.int) (2)");
    expect(list).not.toHaveTextContent("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  });

  it("shows a resolved event title as the heading", () => {
    renderSources([source("event:e1", "Shelling in El Fasher")]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("Shelling in El Fasher");
    expect(list).not.toHaveTextContent("event:e1");
    expect(list).not.toHaveTextContent("insights.situation.sources.eventLabel");
  });

  it("omits a country id publisher and a pasted date suffix", () => {
    const countryId = "0b1c2d3e-4f50-6123-8456-778899aabbcc";
    renderSources([
      {
        ...source("hapi-27", "HAPI figure"),
        publisher: countryId,
      },
      {
        ...source(
          "gedaref",
          "Gedaref IPC update Publication Date: 12 Mar 2024 | Data Valid: 1 Jun 2024",
        ),
        publisher: "IPC",
        publishedAt: "2024-03-12T00:00:00.000Z",
      },
    ]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("HAPI figure");
    expect(list).not.toHaveTextContent(countryId);
    expect(list).toHaveTextContent("Gedaref IPC update");
    expect(list).not.toHaveTextContent("Publication Date");
    expect(list).not.toHaveTextContent("Data Valid");
    expect(list).toHaveTextContent("IPC");
    expect(list).toHaveTextContent("1 Jan 2026");
  });
});
