import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlSignalLocationChallenge } from "~/lib/types/graphql";

/**
 * The mark after a Signal's place name: grey while a location change waits
 * for a decision, green once an admin changed the location, nothing while
 * the location is the source's.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) =>
    params ? `${key} ${Object.values(params).join(" ")}` : key,
  useFormatter: () => ({ dateTime: (d: Date) => d.toISOString().slice(0, 10) }),
}));

const { LocationChangeIndicator } = await import("./location-change-indicator");

const OPEN: GqlSignalLocationChallenge = {
  id: "lc-1",
  signalId: "sig-1",
  status: "consideration",
  note: null,
  proposedLat: 34.527,
  proposedLng: 69.1851,
  proposedName: "Kabul",
  createdBy: "u-1",
  createdAt: "2026-10-29T15:53:18.694Z",
  updatedAt: "2026-10-29T15:53:18.694Z",
  hasProposedPoint: true,
};

function show(props: React.ComponentProps<typeof LocationChangeIndicator>) {
  render(
    <MantineProvider>
      <LocationChangeIndicator {...props} />
    </MantineProvider>,
  );
  return screen.queryByTestId("location-change-indicator");
}

afterEach(() => {
  cleanup();
});

describe("LocationChangeIndicator", () => {
  it("shows nothing while the location is the source's", () => {
    expect(show({ challenge: null, correctedAt: null })).toBeNull();
  });

  it("is grey while a change waits for a decision, naming where to", () => {
    const mark = show({ challenge: OPEN, correctedAt: null })!;
    expect(mark.dataset.state).toBe("requested");
    expect(mark.getAttribute("aria-label")).toBe("indicator.requestedTo Kabul");
    expect(mark.querySelector("svg")!.getAttribute("stroke")).toBe("var(--color-text-muted)");
  });

  it("names the point when the change has no place name", () => {
    const mark = show({ challenge: { ...OPEN, proposedName: null }, correctedAt: null })!;
    expect(mark.getAttribute("aria-label")).toBe("indicator.requestedTo 34.52700, 69.18510");
  });

  it("is green once an admin changed the location, with the date", () => {
    const mark = show({ challenge: null, correctedAt: "2026-10-29T16:30:00.000Z" })!;
    expect(mark.dataset.state).toBe("changed");
    expect(mark.getAttribute("aria-label")).toBe("indicator.changed 2026-10-29");
    expect(mark.querySelector("svg")!.getAttribute("stroke")).toBe("var(--color-success)");
  });

  it("shows a new open change over an earlier accepted one", () => {
    const mark = show({ challenge: OPEN, correctedAt: "2026-10-01T09:00:00.000Z" })!;
    expect(mark.dataset.state).toBe("requested");
  });
});
