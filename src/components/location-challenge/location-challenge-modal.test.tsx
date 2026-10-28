import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlSignalLocationChallenge } from "~/lib/types/graphql";

/**
 * Filing a Location challenge: it goes to the active team's admin, with a
 * corrected point found by place search or typed as coordinates. Typed
 * coordinates count only once they leave the source pin, an update starts
 * from the open challenge, and a place outside CLEAR's areas or the team's
 * area (unless a platform admin files it) is refused before it is sent.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useLocale: () => "en",
}));
const notify = vi.fn();
vi.mock("@mantine/notifications", () => ({
  notifications: { show: (...args: unknown[]) => notify(...args) },
}));

const geocodePlaceQuery = vi.fn();
vi.mock("~/lib/map/geocode-lookup", () => ({
  geocodePlaceQuery: (...args: unknown[]) => geocodePlaceQuery(...args),
}));

type Team = {
  id: string;
  locations: { id: string }[];
  members: { user: { id: string }; role: string }[];
};
let me: { id: string; role: string } = { id: "u1", role: "member" };
let activeTeam: Team | null = null;
vi.mock("~/providers/team-provider", () => ({ useOptionalTeam: () => ({ activeTeam }) }));

type Placement = { data: unknown; isLoading: boolean; isSuccess: boolean };
let placement: Placement = { data: null, isLoading: false, isSuccess: false };
let submitError: { message: string; data?: { code?: string } } | null = null;
const submitMutate = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      locationChallenge: { getBySignal: { invalidate: vi.fn() }, listForMap: { invalidate: vi.fn() } },
    }),
    auth: { me: { useQuery: () => ({ data: { user: me } }) } },
    locationChallenge: {
      placement: { useQuery: () => placement },
      submit: {
        useMutation: (opts: {
          onSuccess?: (data: unknown, input: unknown) => unknown;
          onError?: (err: unknown, input: unknown) => void;
        }) => ({
          mutate: (input: unknown) => {
            submitMutate(input);
            if (submitError) opts.onError?.(submitError, input);
            else void opts.onSuccess?.({}, input);
          },
          isPending: false,
        }),
      },
    },
  },
}));

const { LocationChallengeModal } = await import("./location-challenge-modal");

const IN_AREA = {
  data: { id: "D1", name: "Nyala", level: 2, ancestors: [{ id: "C1", name: "Sudan", level: 0 }] },
  isLoading: false,
  isSuccess: true,
};
const OPEN_WITH_POINT: GqlSignalLocationChallenge = {
  id: "C1",
  signalId: "S1",
  status: "consideration",
  note: "Wrong town",
  proposedLat: 12.1,
  proposedLng: 24.9,
  proposedName: "Kalma",
  createdBy: "u1",
  createdAt: "2026-10-28T10:00:00Z",
  updatedAt: "2026-10-28T10:00:00Z",
  hasProposedPoint: true,
};

function open(props: Partial<React.ComponentProps<typeof LocationChallengeModal>> = {}) {
  return render(
    <MantineProvider>
      <LocationChallengeModal
        opened
        onClose={() => {}}
        signalId="S1"
        sourceLat={12.05}
        sourceLng={24.88}
        {...props}
      />
    </MantineProvider>,
  );
}

const submitButton = () => screen.getByTestId("location-challenge-submit") as HTMLButtonElement;

beforeEach(() => {
  me = { id: "u1", role: "member" };
  activeTeam = { id: "T1", locations: [{ id: "D1" }], members: [{ user: { id: "u1" }, role: "analyst" }] };
  placement = { data: null, isLoading: false, isSuccess: false };
  submitError = null;
  geocodePlaceQuery.mockResolvedValue([
    { id: "p1", label: "Kalma, South Darfur, Sudan", center: [24.95, 12.0], placeTypes: ["place"] },
  ]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LocationChallengeModal", () => {
  it("files a bare challenge for the active team", () => {
    open();
    fireEvent.change(screen.getByLabelText("modal.noteLabel"), { target: { value: "  Wrong town  " } });
    fireEvent.click(submitButton());
    expect(submitMutate).toHaveBeenCalledWith({
      signalId: "S1",
      teamId: "T1",
      note: "Wrong town",
      proposedName: undefined,
      proposedLat: undefined,
      proposedLng: undefined,
    });
  });

  it("files no point when the coordinate fields are opened but left at the source pin", () => {
    open();
    fireEvent.click(screen.getByText("modal.enterCoordinatesManually"));
    fireEvent.click(submitButton());
    expect(submitMutate.mock.calls[0]![0]).toMatchObject({ proposedLat: undefined, proposedLng: undefined });
  });

  it("files typed coordinates once they leave the source pin", () => {
    placement = IN_AREA;
    open();
    fireEvent.click(screen.getByText("modal.enterCoordinatesManually"));
    fireEvent.change(screen.getByLabelText(/modal\.lat/), { target: { value: "12.5" } });
    fireEvent.click(submitButton());
    expect(submitMutate.mock.calls[0]![0]).toMatchObject({ proposedLat: 12.5, proposedLng: 24.88 });
  });

  it("starts an update from the open challenge, so resubmitting keeps its note and point", () => {
    placement = IN_AREA;
    open({ existing: OPEN_WITH_POINT });
    expect((screen.getByLabelText("modal.noteLabel") as HTMLTextAreaElement).value).toBe("Wrong town");
    expect(screen.getByTestId("location-challenge-preview").textContent).toContain("Kalma");
    fireEvent.click(submitButton());
    expect(submitMutate).toHaveBeenCalledWith({
      signalId: "S1",
      teamId: "T1",
      note: "Wrong town",
      proposedName: "Kalma",
      proposedLat: 12.1,
      proposedLng: 24.9,
    });
  });

  it("looks a place up, shows where it lands in CLEAR, and files it with its name", async () => {
    placement = IN_AREA;
    open();
    fireEvent.change(screen.getByTestId("location-challenge-search"), { target: { value: "Kalma" } });
    fireEvent.click(await screen.findByText("Kalma, South Darfur, Sudan"));
    expect(screen.getByTestId("location-challenge-preview").textContent).toContain(
      'modal.landsIn:{"chain":"Nyala, Sudan"}',
    );
    fireEvent.click(submitButton());
    expect(submitMutate.mock.calls[0]![0]).toMatchObject({
      proposedLat: 12.0,
      proposedLng: 24.95,
      proposedName: "Kalma",
    });
  });

  it("refuses a place outside the team's area, unless a platform admin files it", () => {
    placement = { ...IN_AREA, data: { id: "D2", name: "Kass", level: 2, ancestors: [{ id: "C2", name: "Chad", level: 0 }] } };
    open({ existing: OPEN_WITH_POINT });
    expect(screen.getByTestId("location-challenge-outside-team")).toBeTruthy();
    expect(submitButton().disabled).toBe(true);
    cleanup();

    me = { id: "u1", role: "admin" };
    open({ existing: OPEN_WITH_POINT });
    expect(screen.queryByTestId("location-challenge-outside-team")).toBeNull();
    expect(submitButton().disabled).toBe(false);
  });

  it("refuses a place outside the areas CLEAR covers", () => {
    placement = { data: null, isLoading: false, isSuccess: true };
    open({ existing: OPEN_WITH_POINT });
    expect(screen.getByTestId("location-challenge-preview").textContent).toContain("modal.outsideCoverage");
    expect(submitButton().disabled).toBe(true);
  });

  it("can't be sent without an active team", () => {
    activeTeam = null;
    open();
    expect(submitButton().disabled).toBe(true);
  });

  it("explains a refusal from clear-api", () => {
    submitError = { message: "The place is outside the team's area", data: { code: "FORBIDDEN" } };
    open();
    fireEvent.click(submitButton());
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: "errors.forbidden", color: "red" }));
  });
});
