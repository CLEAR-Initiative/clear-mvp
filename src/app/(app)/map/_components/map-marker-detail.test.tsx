import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MapMarkerDetail } from "./map-marker-detail";
import styles from "./map-marker-detail.module.css";
import type { CrisisMarker } from "./map-markers-data";

vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useMediaQuery: () => true,
  };
});

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string) =>
      key,
  useFormatter: () => ({
    dateTime: () => "1 Jan 2026",
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    locationChallenge: {
      getBySignal: {
        useQuery: () => ({ data: undefined }),
      },
    },
  },
}));

vi.mock("~/components/location-challenge", () => ({
  LocationChallengeModal: () => null,
  LocationChallengeStatus: () => null,
}));

/** Whether the reader may file a Location challenge (the active team's
 *  analysts and platform admins). */
let canFile = false;
vi.mock("~/components/location-challenge/use-location-challenge-filing", () => ({
  useLocationChallengeFiling: () => ({ canFile, teamId: canFile ? "T1" : null, teamLocations: null, canPlaceAnywhere: false }),
}));

const LONG_DESCRIPTION =
  "A very long marker description that wraps past several lines on a phone sheet. ".repeat(8);

const marker: CrisisMarker = {
  id: 1,
  lng: 32.5,
  lat: 15.5,
  title: "Long description event",
  severity: "high",
  description: LONG_DESCRIPTION,
  eventId: "evt_1",
  markerKind: "event",
  region: "Khartoum",
};

afterEach(() => {
  cleanup();
  canFile = false;
});

describe("MapMarkerDetail mobile sheet (#506)", () => {
  it("pins View details outside the scroll body and clamps the description", () => {
    const { container } = render(
      <MantineProvider>
        <MapMarkerDetail marker={marker} onClose={() => undefined} />
      </MantineProvider>,
    );

    const sheet = container.querySelector(`[data-tour="map-marker-detail"]`);
    expect(sheet).toHaveClass(styles.sheetMobile);

    const body = container.querySelector(`.${styles.bodyMobile}`);
    const cta = container.querySelector(`.${styles.ctaMobile}`);
    const clamp = container.querySelector(`.${styles.descriptionClamp}`);

    expect(body).not.toBeNull();
    expect(cta).not.toBeNull();
    expect(clamp).not.toBeNull();
    expect(clamp?.textContent).toContain("very long marker description");

    const viewDetails = screen.getByRole("link", { name: "detail.viewDetails" });
    expect(cta?.contains(viewDetails)).toBe(true);
    expect(body?.contains(viewDetails)).toBe(false);
  });
});

describe("MapMarkerDetail Change location", () => {
  const signalMarker: CrisisMarker = { ...marker, id: 2, markerKind: "signal", eventId: "sig_1" };

  function renderSignal() {
    render(
      <MantineProvider>
        <MapMarkerDetail marker={signalMarker} onClose={() => undefined} />
      </MantineProvider>,
    );
  }

  it("offers Change location to the active team's analysts", () => {
    canFile = true;
    renderSignal();
    expect(screen.getByRole("button", { name: "actions.changeLocation" })).toBeTruthy();
  });

  it("hides it from readers who can't file", () => {
    renderSignal();
    expect(screen.queryByRole("button", { name: "actions.changeLocation" })).toBeNull();
  });
});
