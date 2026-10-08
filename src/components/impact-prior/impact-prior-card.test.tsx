import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlImpactPrior } from "~/lib/types/graphql";

/**
 * The read-only ImpactPrior card the Inbox's Review item and My requests
 * pane mount: its source, state, counts, the Worker, and the cited cases,
 * with only http(s) sources linked.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "10 Aug 2021", relativeTime: () => "2 hours ago" }),
}));

const { ImpactPriorCard } = await import("./impact-prior-card");

const PRIOR: GqlImpactPrior = {
  id: "ip-1",
  eventId: "evt-1",
  taskId: "task-0",
  sourceKind: "event.impact_prior.clear",
  state: "proposed",
  hazardType: "FL",
  countryLocationId: "sdn",
  geographicScope: "district",
  horizonYears: 10,
  populationGroup: null,
  metric: null,
  lowerBound: null,
  upperBound: null,
  numberOfCases: 2,
  basis: [
    { tier: "clear", eventId: "evt-2021", occurredAt: "2021-08-10", scope: "district", quote: "The Nile burst its banks." },
    { tier: "web", sourceUrl: "https://example.test/floods-2019", scope: "country", quote: "Floods displaced thousands." },
  ],
  methodVersion: "clear-impact-prior@0.1.0",
  supersedesId: null,
  decidedById: null,
  decidedAt: null,
  decisionRationale: null,
  createdAt: "2026-10-06T11:00:00.000Z",
};

function renderCard(prior: GqlImpactPrior) {
  return render(
    <MantineProvider>
      <ImpactPriorCard prior={prior} />
    </MantineProvider>,
  );
}

describe("ImpactPriorCard", () => {
  afterEach(cleanup);

  it("shows its source, state, counts and cited cases", () => {
    renderCard(PRIOR);
    const card = screen.getByTestId("enrichment-prior");
    expect(card.getAttribute("data-state")).toBe("proposed");
    expect(card.getAttribute("data-source-kind")).toBe("event.impact_prior.clear");
    expect(screen.getByTestId("enrichment-prior-source").textContent).toBe("sourceKind.clear");
    expect(screen.getByText("prior.proposed")).toBeTruthy();
    expect(screen.getByText(/cases:\{"count":2\}/)).toBeTruthy();
    expect(screen.getAllByTestId("enrichment-case")).toHaveLength(2);
    expect(screen.getByText("“The Nile burst its banks.”")).toBeTruthy();
    expect((screen.getByText("source") as HTMLAnchorElement).getAttribute("href")).toBe("https://example.test/floods-2019");
    expect((screen.getByText("priorEvent") as HTMLAnchorElement).getAttribute("href")).toBe("/event/evt-2021");
  });

  it("names the Worker that produced it when the server returned one", () => {
    renderCard({ ...PRIOR, task: { leaseOwner: { id: "w", name: "CLEAR Worker (Dagster)" } } });
    expect(screen.getByText(/worker:\{"name":"CLEAR Worker \(Dagster\)"\}/)).toBeTruthy();
  });

  it("links only http(s) sources and encodes the prior Event id", () => {
    renderCard({
      ...PRIOR,
      basis: [
        { tier: "web", sourceUrl: "javascript:alert(1)", scope: "country", quote: "x" },
        { tier: "clear", eventId: "evt/../admin?x", scope: "country", quote: "y" },
      ],
    });
    expect(screen.getByTestId("enrichment-unsafe-source").textContent).toContain("javascript:alert(1)");
    expect(screen.queryByRole("link", { name: "source" })).toBeNull();
    const priorLink = screen.getByText("priorEvent") as HTMLAnchorElement;
    expect(priorLink.getAttribute("href")).toBe(`/event/${encodeURIComponent("evt/../admin?x")}`);
  });
});
