import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { buildPlaceNameEntries } from "~/lib/hotline-inbox";
import type { GqlPlaceNameSuggestion, GqlUnresolvedPlaceName } from "~/lib/types/graphql";

/**
 * Resolving an unresolved place name from its Inbox pane. The four actions:
 * use a suggested place (a CLEAR place or a GeoNames place), place a point on
 * the map, mark the name not a place, mark it ambiguous. A point outside the
 * row's state can't be saved unless a platform admin resolves it.
 */

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useFormatter: () => ({ dateTime: () => "2 Nov 2026" }),
  useLocale: () => "en",
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
const track = vi.fn();
vi.mock("~/lib/analytics/track", () => ({ track: (...args: unknown[]) => track(...args) }));

/** The map: a click on it places the decider's point while picking. */
vi.mock("~/components/location-challenge/location-challenge-map", () => ({
  LocationChallengeMap: (props: {
    picking: boolean;
    placed: { lat: number; lng: number } | null;
    suggestions: { lat: number; lng: number }[];
    outlines: unknown[];
    onPick: (at: { lat: number; lng: number }) => void;
  }) => (
    <button
      type="button"
      data-testid="map"
      data-picking={props.picking}
      data-placed={props.placed ? `${props.placed.lat},${props.placed.lng}` : ""}
      data-suggestions={props.suggestions.map((s) => `${s.lat},${s.lng}`).join("|")}
      data-outlines={props.outlines.length}
      onClick={() => props.onPick({ lat: 11.2, lng: 29.9 })}
    />
  ),
}));
vi.mock("~/lib/map/geocode-lookup", () => ({ geocodePlaceQuery: vi.fn(async () => []) }));

type Placement = { data: unknown; isLoading: boolean; isSuccess: boolean };
const IN_STATE: Placement = {
  data: { id: "D1", name: "Kadugli", level: 2, ancestors: [{ id: "S1", name: "South Kordofan", level: 1 }, { id: "C1", name: "Sudan", level: 0 }] },
  isLoading: false,
  isSuccess: true,
};
const IN_ANOTHER_STATE: Placement = {
  data: { id: "D9", name: "Nyala", level: 2, ancestors: [{ id: "S9", name: "South Darfur", level: 1 }, { id: "C1", name: "Sudan", level: 0 }] },
  isLoading: false,
  isSuccess: true,
};
let placement: Placement = IN_STATE;
let suggestions: GqlPlaceNameSuggestion[] = [];
let suggestionsLoading = false;
let resolveError: { message: string; data?: { code?: string } } | null = null;
const resolveMutate = vi.fn();
const suggestionsInput = vi.fn();
const outlineIds = vi.fn();
vi.mock("~/trpc/react", () => ({
  api: {
    useQueries: (build: (q: unknown) => unknown[]) => {
      const q = { locations: { getById: (input: { id: string }) => input.id } };
      const ids = build(q) as string[];
      outlineIds(ids);
      return ids.map((id) => ({ data: { id, geometry: { type: "MultiPolygon", coordinates: [] } } }));
    },
    locationChallenge: {
      placement: { useQuery: () => placement },
    },
    placeNames: {
      suggestions: {
        useQuery: (input: unknown) => {
          suggestionsInput(input);
          return { data: suggestionsLoading ? undefined : suggestions, isLoading: suggestionsLoading };
        },
      },
      resolve: {
        useMutation: () => ({
          mutate: (
            input: unknown,
            opts: { onSuccess?: (r: { signalsMoved: number }) => void; onError?: (err: unknown) => void },
          ) => {
            resolveMutate(input);
            if (resolveError) opts.onError?.(resolveError);
            else opts.onSuccess?.({ signalsMoved: 4 });
          },
          isPending: false,
        }),
      },
    },
  },
}));

const { PlaceNamePane } = await import("./place-name-pane");

const ROW: GqlUnresolvedPlaceName = {
  id: "pn-1",
  nameNorm: "um dabakir",
  nameAsWritten: "Um Dabakir",
  nameAr: "أم دباكر",
  countryCode: "SD",
  stateLocationId: "S1",
  countryLocationId: "C1",
  stateLocation: { id: "S1", name: "South Kordofan", level: 1 },
  status: "OPEN",
  signalCount: 7,
  firstSeenAt: "2026-10-20T09:00:00Z",
  lastSeenAt: "2026-11-02T09:00:00Z",
  signals: [
    {
      signalId: "sig-1",
      nameAsWritten: "Um Dabakir",
      reason: "OUTSIDE_AREA",
      seenAt: "2026-11-02T09:00:00Z",
      relocatedAt: null,
      areaLocation: { id: "D1", name: "Kadugli", level: 2 },
      signal: { id: "sig-1", title: "عاجل", description: "استهداف محطة أم دباكر", publishedAt: "2026-11-02T08:00:00Z" },
    },
    {
      signalId: "sig-2",
      nameAsWritten: "Um Dabakir",
      reason: "NO_MATCH",
      seenAt: "2026-11-01T09:00:00Z",
      relocatedAt: null,
      areaLocation: { id: "S1", name: "South Kordofan", level: 1 },
      signal: null,
    },
  ],
};

const GEONAMES: GqlPlaceNameSuggestion = {
  kind: "GEONAMES", geonamesId: 371760, locationId: null, name: "Umm Dabakir", level: null,
  featureClass: "P", featureCode: "PPL", latitude: 11.1, longitude: 29.8, score: 0.8, insideArea: true, distanceKm: 0,
};
const LANDMARK: GqlPlaceNameSuggestion = {
  kind: "LOCATION", geonamesId: null, locationId: "L4", name: "Um Dabakir power station", level: 4,
  featureClass: null, featureCode: null, latitude: 12.9, longitude: 30.1, score: 0.6, insideArea: false, distanceKm: 104.4,
};

const onResolved = vi.fn();

function renderPane(props: { canPlaceAnywhere?: boolean; row?: GqlUnresolvedPlaceName } = {}) {
  const [entry] = buildPlaceNameEntries([props.row ?? ROW]);
  render(
    <MantineProvider>
      <PlaceNamePane entry={entry!} canPlaceAnywhere={!!props.canPlaceAnywhere} onResolved={onResolved} onBack={vi.fn()} />
    </MantineProvider>,
  );
  return entry!;
}

beforeEach(() => {
  placement = IN_STATE;
  suggestions = [GEONAMES, LANDMARK];
  suggestionsLoading = false;
  resolveError = null;
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("PlaceNamePane", () => {
  it("shows the name with its Arabic spelling, the posts and why each missed", () => {
    renderPane();
    const name = screen.getByTestId("inbox-place-name");
    expect(name).toHaveTextContent("Um Dabakir");
    // Arabic sits in its own bidi island, marked as Arabic.
    const arabic = within(name).getByText("أم دباكر");
    expect(arabic.tagName).toBe("BDI");
    expect(arabic).toHaveAttribute("lang", "ar");

    const posts = screen.getAllByTestId("inbox-place-post");
    expect(posts).toHaveLength(2);
    expect(within(posts[0]!).getByText("استهداف محطة أم دباكر")).toHaveAttribute("dir", "auto");
    expect(posts[0]).toHaveTextContent('place.reasons.OUTSIDE_AREA:{"area":"Kadugli"}');
    expect(within(posts[0]!).getByTestId("inbox-place-signal-link")).toHaveAttribute("href", "/signal/sig-1");
    // A Signal the reader may not read still lists, without its text.
    expect(posts[1]).toHaveTextContent("place.postHidden");
    expect(posts[1]).toHaveTextContent('place.reasons.NO_MATCH:{"area":"South Kordofan"}');
  });

  it("asks for suggestions inside the row's state, and draws them and the areas on the map", () => {
    renderPane();
    expect(suggestionsInput).toHaveBeenCalledWith({
      name: "Um Dabakir",
      nameAr: "أم دباكر",
      countryCode: "SD",
      withinLocationId: "S1",
    });
    const map = screen.getByTestId("map");
    expect(map).toHaveAttribute("data-suggestions", "11.1,29.8|12.9,30.1");
    // The state, and the one district a post was placed in.
    expect(outlineIds).toHaveBeenLastCalledWith(["S1", "D1"]);
    expect(map).toHaveAttribute("data-outlines", "2");

    const rows = screen.getAllByTestId("inbox-place-suggestion");
    expect(rows[0]).toHaveTextContent("Umm Dabakir");
    expect(rows[0]).toHaveTextContent("place.kinds.geonames");
    expect(rows[0]).toHaveTextContent('place.where.inside:{"area":"South Kordofan"}');
    expect(rows[1]).toHaveTextContent("place.kinds.landmark");
    expect(rows[1]).toHaveTextContent('place.where.outside:{"km":104,"area":"South Kordofan"}');
  });

  it("uses a GeoNames suggestion", () => {
    const entry = renderPane();
    fireEvent.click(within(screen.getAllByTestId("inbox-place-suggestion")[0]!).getByTestId("inbox-place-use"));
    expect(resolveMutate).toHaveBeenCalledWith({ id: "pn-1", resolution: { kind: "GEONAMES", geonamesId: 371760 } });
    expect(onResolved).toHaveBeenCalledWith(entry, "GEONAMES", 4);
    expect(track).toHaveBeenCalledWith("place_name.resolved", { kind: "GEONAMES" });
  });

  it("uses an existing CLEAR place", () => {
    const entry = renderPane();
    fireEvent.click(within(screen.getAllByTestId("inbox-place-suggestion")[1]!).getByTestId("inbox-place-use"));
    expect(resolveMutate).toHaveBeenCalledWith({ id: "pn-1", resolution: { kind: "LOCATION", locationId: "L4" } });
    expect(onResolved).toHaveBeenCalledWith(entry, "LOCATION", 4);
  });

  it("places a point on the map", () => {
    const entry = renderPane();
    expect(screen.getByTestId("map")).toHaveAttribute("data-picking", "false");
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    expect(screen.getByTestId("inbox-place-placing")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-place-save")).toBeDisabled();

    fireEvent.click(screen.getByTestId("map"));
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "11.2,29.9");
    fireEvent.click(screen.getByTestId("inbox-place-save"));
    expect(resolveMutate).toHaveBeenCalledWith({
      id: "pn-1",
      resolution: { kind: "POINT", point: { lat: 11.2, lng: 29.9, name: undefined } },
    });
    expect(onResolved).toHaveBeenCalledWith(entry, "POINT", 4);
  });

  it("keeps a team admin's point inside the row's state; a platform admin may go beyond it", () => {
    placement = IN_ANOTHER_STATE;
    renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    fireEvent.click(screen.getByTestId("map"));
    expect(screen.getByTestId("inbox-place-save")).toBeDisabled();
    cleanup();

    renderPane({ canPlaceAnywhere: true });
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    fireEvent.click(screen.getByTestId("map"));
    expect(screen.getByTestId("inbox-place-save")).toBeEnabled();
  });

  it("marks the name not a place", () => {
    const entry = renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-not-a-place"));
    expect(resolveMutate).toHaveBeenCalledWith({ id: "pn-1", resolution: { kind: "NOT_A_PLACE" } });
    expect(onResolved).toHaveBeenCalledWith(entry, "NOT_A_PLACE", 4);
    expect(track).toHaveBeenCalledWith("place_name.resolved", { kind: "NOT_A_PLACE" });
  });

  it("marks the name ambiguous", () => {
    const entry = renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-ambiguous"));
    expect(resolveMutate).toHaveBeenCalledWith({ id: "pn-1", resolution: { kind: "AMBIGUOUS" } });
    expect(onResolved).toHaveBeenCalledWith(entry, "AMBIGUOUS", 4);
  });

  it.each([
    ["FORBIDDEN", "place.errors.forbidden"],
    ["BAD_REQUEST", "place.errors.badPlace"],
    ["CONFLICT", "place.errors.conflict"],
    ["NOT_FOUND", "place.errors.conflict"],
    [undefined, "place.errors.failed"],
  ])("says why clear-api refused (%s), and the row stays", (code, key) => {
    resolveError = { message: "refused", data: { code } };
    renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-not-a-place"));
    expect(screen.getByRole("alert")).toHaveTextContent(key);
    expect(onResolved).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("says so when no place has a similar name, and while it looks", () => {
    suggestions = [];
    renderPane();
    expect(screen.getByTestId("inbox-place-suggestions")).toHaveTextContent("place.noSuggestions");
    cleanup();
    suggestionsLoading = true;
    renderPane();
    expect(screen.getByTestId("inbox-place-suggestions")).toHaveTextContent("place.suggestionsLoading");
  });

  it("uses the country as the area of a row with no state", () => {
    renderPane({ row: { ...ROW, stateLocationId: null, stateLocation: null, signals: [] } });
    expect(suggestionsInput).toHaveBeenCalledWith(expect.objectContaining({ withinLocationId: "C1" }));
    expect(outlineIds).toHaveBeenLastCalledWith(["C1"]);
    expect(screen.getByTestId("inbox-place-posts")).toHaveTextContent("place.noPosts");
  });
});
