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

function renderSources(sources: SaSource[]) {
  return render(
    <MantineProvider>
      <SituationSources sources={sources} className="sources-card" />
    </MantineProvider>,
  );
}

describe("Analysis sources", () => {
  afterEach(() => {
    cleanup();
  });

  it("hides an event id and a HAPI id behind typed labels", () => {
    renderSources([source(EVENT_ID), source(UNTITLED_EVENT_ID, ""), source(HAPI_ID)]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("insights.situation.sources.eventLabel");
    expect(list).toHaveTextContent("insights.situation.sources.hapiFigure");
    expect(list).not.toHaveTextContent(EVENT_ID);
    expect(list).not.toHaveTextContent(UNTITLED_EVENT_ID);
    expect(list).not.toHaveTextContent(HAPI_ID);
    expect(list).not.toHaveTextContent("ReliefWeb report");
  });

  it("shows a resolved event title as the heading", () => {
    renderSources([source("event:e1", "Shelling in El Fasher")]);

    const list = screen.getByTestId("analysis-sources");
    expect(list).toHaveTextContent("Shelling in El Fasher");
    expect(list).not.toHaveTextContent("event:e1");
    expect(list).not.toHaveTextContent("insights.situation.sources.eventLabel");
  });
});
