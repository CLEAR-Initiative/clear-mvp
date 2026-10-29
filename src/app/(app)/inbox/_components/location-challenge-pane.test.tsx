import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { buildLocationChallengeEntries } from "~/lib/hotline-inbox";
import type { GqlLocationChallengeToDecide } from "~/lib/types/graphql";

/**
 * Deciding a Location challenge from its Inbox pane: accept the proposed
 * point, place a different one (a click on the map, or a place search), or
 * decline. A point outside the team's area can't be saved unless a platform
 * admin decides, and a challenge that proposes no point can't be accepted.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "28 Oct 2026" }),
  useLocale: () => "en",
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

/** The map: a click on it places the decider's point while picking. */
vi.mock("~/components/location-challenge/location-challenge-map", () => ({
  LocationChallengeMap: (props: {
    picking: boolean;
    placed: { lat: number; lng: number } | null;
    onPick: (at: { lat: number; lng: number }) => void;
  }) => (
    <button
      type="button"
      data-testid="map"
      data-picking={props.picking}
      data-placed={props.placed ? `${props.placed.lat},${props.placed.lng}` : ""}
      onClick={() => props.onPick({ lat: 12.3, lng: 24.7 })}
    />
  ),
}));

const geocodePlaceQuery = vi.fn();
vi.mock("~/lib/map/geocode-lookup", () => ({
  geocodePlaceQuery: (...args: unknown[]) => geocodePlaceQuery(...args),
}));

type Placement = { data: unknown; isLoading: boolean; isSuccess: boolean };
const IN_TEAM_AREA: Placement = {
  data: { id: "D1", name: "Nyala", level: 2, ancestors: [{ id: "C1", name: "Sudan", level: 0 }] },
  isLoading: false,
  isSuccess: true,
};
let placement: Placement = IN_TEAM_AREA;
let decideError: { message: string; data?: { code?: string } } | null = null;
const decideMutate = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    locationChallenge: {
      placement: { useQuery: () => placement },
      decide: {
        useMutation: () => ({
          mutate: (input: unknown, opts: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
            decideMutate(input);
            if (decideError) opts.onError?.(decideError);
            else opts.onSuccess?.();
          },
          isPending: false,
        }),
      },
    },
  },
}));

const { LocationChallengePane } = await import("./location-challenge-pane");

function challenge(overrides: Partial<GqlLocationChallengeToDecide> = {}): GqlLocationChallengeToDecide {
  return {
    id: "lc-1",
    signalId: "sig-1",
    status: "consideration",
    note: "Dataminr put this in the wrong town",
    proposedLat: 12.0,
    proposedLng: 24.95,
    proposedName: "Kalma",
    createdBy: "u-analyst",
    createdByName: "Amira",
    createdAt: "2026-10-28T09:00:00Z",
    updatedAt: "2026-10-28T09:00:00Z",
    hasProposedPoint: true,
    teamId: "T1",
    team: { id: "T1", name: "Sudan team", locations: [{ id: "C1" }] },
    signal: {
      id: "sig-1",
      title: "Clashes near the market",
      generalLocation: {
        id: "P1",
        name: "Clashes near the market",
        level: 4,
        geometry: { type: "Point", coordinates: [24.88, 12.05] },
        pointType: null,
        ancestors: [
          { id: "C1", name: "Sudan", level: 0 },
          { id: "D1", name: "Nyala", level: 2 },
        ],
      },
      originLocation: null,
      destinationLocation: null,
    },
    proposedPlacement: { id: "D2", name: "Bielel", level: 2, ancestors: [{ id: "C1", name: "Sudan", level: 0 }] },
    ...overrides,
  };
}

const onDecided = vi.fn();
function open(c: GqlLocationChallengeToDecide = challenge(), canPlaceAnywhere = false) {
  const entry = buildLocationChallengeEntries([c])[0]!;
  render(
    <MantineProvider>
      <LocationChallengePane entry={entry} canPlaceAnywhere={canPlaceAnywhere} onDecided={onDecided} onBack={() => {}} />
    </MantineProvider>,
  );
  return entry;
}

beforeEach(() => {
  placement = IN_TEAM_AREA;
  decideError = null;
  geocodePlaceQuery.mockResolvedValue([
    { id: "p1", label: "Kalma, South Darfur, Sudan", center: [24.96, 12.01], placeTypes: ["place"] },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LocationChallengePane", () => {
  it("shows where the Signal is, what was proposed and why, and accepts the proposed point", () => {
    const entry = open();
    expect(screen.getByTestId("inbox-location-now")).toHaveTextContent("Nyala, Sudan");
    expect(screen.getByTestId("inbox-location-proposed")).toHaveTextContent("Kalma");
    expect(screen.getByTestId("inbox-location-proposed")).toHaveTextContent(
      'location.landsIn:{"chain":"Bielel, Sudan"}',
    );
    expect(screen.getByTestId("inbox-location-note")).toHaveTextContent("Dataminr put this in the wrong town");
    expect(screen.getByText('location.filedBy:{"name":"Amira","date":"28 Oct 2026"}')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "location.openSignal" })).toHaveAttribute("href", "/signal/sig-1");

    fireEvent.click(screen.getByTestId("inbox-location-accept"));
    expect(decideMutate).toHaveBeenCalledWith({ id: "lc-1", decision: "ACCEPT", point: undefined });
    expect(onDecided).toHaveBeenCalledWith(entry, "ACCEPT");
  });

  it("declines, leaving the pin as it is", () => {
    const entry = open();
    fireEvent.click(screen.getByTestId("inbox-location-decline"));
    expect(decideMutate).toHaveBeenCalledWith({ id: "lc-1", decision: "DECLINE", point: undefined });
    expect(onDecided).toHaveBeenCalledWith(entry, "DECLINE");
  });

  it("places a different point with a click on the map, and saves it", () => {
    const entry = open();
    expect(screen.getByTestId("map")).toHaveAttribute("data-picking", "false");
    fireEvent.click(screen.getByTestId("inbox-location-place"));
    expect(screen.getByTestId("map")).toHaveAttribute("data-picking", "true");
    const save = screen.getByTestId("inbox-location-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.click(screen.getByTestId("map"));
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "12.3,24.7");
    expect(screen.getByTestId("location-challenge-preview")).toHaveTextContent('modal.landsIn:{"chain":"Nyala, Sudan"}');
    fireEvent.click(save);
    expect(decideMutate).toHaveBeenCalledWith({
      id: "lc-1",
      decision: "CORRECT",
      point: { lat: 12.3, lng: 24.7, name: undefined },
    });
    expect(onDecided).toHaveBeenCalledWith(entry, "CORRECT");
  });

  it("places a point found by the place search, with its name", async () => {
    open();
    fireEvent.click(screen.getByTestId("inbox-location-place"));
    fireEvent.change(screen.getByTestId("location-challenge-search"), { target: { value: "Kalma" } });
    fireEvent.click(await screen.findByText("Kalma, South Darfur, Sudan"));
    fireEvent.click(screen.getByTestId("inbox-location-save"));
    expect(decideMutate).toHaveBeenCalledWith({
      id: "lc-1",
      decision: "CORRECT",
      point: { lat: 12.01, lng: 24.96, name: "Kalma" },
    });
  });

  it("can't save a point outside the team's area, unless a platform admin decides", () => {
    placement = { ...IN_TEAM_AREA, data: { id: "D9", name: "Abeche", level: 2, ancestors: [{ id: "C2", name: "Chad", level: 0 }] } };
    open();
    fireEvent.click(screen.getByTestId("inbox-location-place"));
    fireEvent.click(screen.getByTestId("map"));
    expect(screen.getByTestId("location-challenge-outside-team")).toBeInTheDocument();
    expect((screen.getByTestId("inbox-location-save") as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    open(challenge(), true);
    fireEvent.click(screen.getByTestId("inbox-location-place"));
    fireEvent.click(screen.getByTestId("map"));
    expect(screen.queryByTestId("location-challenge-outside-team")).not.toBeInTheDocument();
    expect((screen.getByTestId("inbox-location-save") as HTMLButtonElement).disabled).toBe(false);
  });

  it("goes back to the three choices when placing is cancelled", () => {
    open();
    fireEvent.click(screen.getByTestId("inbox-location-place"));
    fireEvent.click(screen.getByText("location.actions.cancel"));
    expect(screen.queryByTestId("inbox-location-placing")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-location-accept")).toBeInTheDocument();
    expect(decideMutate).not.toHaveBeenCalled();
  });

  it("offers no Accept when the analyst proposed no point", () => {
    open(
      challenge({
        proposedLat: null,
        proposedLng: null,
        proposedName: null,
        hasProposedPoint: false,
        proposedPlacement: null,
      }),
    );
    expect(screen.queryByTestId("inbox-location-accept")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-location-proposed")).toHaveTextContent("location.noProposal");
    expect(screen.getByTestId("inbox-location-place")).toHaveTextContent("location.actions.place");
    expect(screen.getByTestId("inbox-location-decline")).toBeInTheDocument();
  });

  it("says why clear-api refused, and stays on the challenge", () => {
    decideError = { message: "outside the team's area", data: { code: "FORBIDDEN" } };
    open();
    fireEvent.click(screen.getByTestId("inbox-location-accept"));
    expect(screen.getByRole("alert")).toHaveTextContent("location.errors.forbidden");
    expect(onDecided).not.toHaveBeenCalled();

    decideError = { message: "already declined", data: { code: "CONFLICT" } };
    fireEvent.click(screen.getByTestId("inbox-location-decline"));
    expect(screen.getByRole("alert")).toHaveTextContent("location.errors.conflict");
  });
});
