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
const geocodePlaceQuery = vi.fn(async () => []);
vi.mock("~/lib/map/geocode-lookup", () => ({ geocodePlaceQuery: (...args: unknown[]) => geocodePlaceQuery(...(args as [])) }));

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
let homeGeometry: { type: string; coordinates: unknown } = { type: "MultiPolygon", coordinates: [] };
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
      return ids.map((id) => ({ data: { id, geometry: homeGeometry } }));
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

/** Paste into the place search, as a browser does: the text lands in the box
 *  unless the picker took it as a point. */
function paste(text: string) {
  const search = screen.getByTestId("location-challenge-search");
  const landed = fireEvent.paste(search, { clipboardData: { getData: () => text } });
  if (landed) fireEvent.change(search, { target: { value: text } });
}

beforeEach(() => {
  placement = IN_STATE;
  homeGeometry = { type: "MultiPolygon", coordinates: [] };
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
    // It opens on the state: the place 104 km outside it is left out, so the
    // map stays close enough to read.
    expect(map).toHaveAttribute("data-suggestions", "11.1,29.8");
    expect(screen.getAllByTestId("inbox-place-suggestion")).toHaveLength(1);
    const scope = screen.getByTestId("inbox-place-scope");
    expect(scope).toHaveValue("area");
    expect(scope).toHaveTextContent('place.scope.area:{"area":"South Kordofan","count":1}');
    expect(scope).toHaveTextContent('place.scope.country:{"country":"Sudan","count":2}');

    // The decider widens to the whole country.
    fireEvent.change(scope, { target: { value: "country" } });
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

  it("keeps the highlight of the focused suggestion when the pointer leaves", () => {
    renderPane();
    const row = screen.getAllByTestId("inbox-place-suggestion")[0]!;
    fireEvent.focus(within(row).getByTestId("inbox-place-use"));
    fireEvent.mouseEnter(row);
    fireEvent.mouseLeave(row);
    expect(row).toHaveAttribute("data-highlighted", "true");
    fireEvent.blur(within(row).getByTestId("inbox-place-use"));
    expect(row).not.toHaveAttribute("data-highlighted");
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
    fireEvent.change(screen.getByTestId("inbox-place-scope"), { target: { value: "country" } });
    fireEvent.click(within(screen.getAllByTestId("inbox-place-suggestion")[1]!).getByTestId("inbox-place-use"));
    expect(resolveMutate).toHaveBeenCalledWith({ id: "pn-1", resolution: { kind: "LOCATION", locationId: "L4" } });
    expect(onResolved).toHaveBeenCalledWith(entry, "LOCATION", 4);
  });

  it("places a point on the map", () => {
    const entry = renderPane();
    expect(screen.getByTestId("map")).toHaveAttribute("data-picking", "false");
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    expect(screen.getByTestId("inbox-place-scope")).toBeDisabled();
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

  it("links to a lookup of the Arabic spelling in the state, in a new tab", () => {
    renderPane();
    const links = screen.getAllByTestId("inbox-place-lookup-link");
    expect(links.map((l) => l.getAttribute("data-provider"))).toEqual(["google_maps", "openstreetmap", "web_search"]);
    const query = encodeURIComponent("أم دباكر, South Kordofan");
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.getAttribute("href")).toContain(query);
    }
    expect(links[2]).toHaveAttribute("href", `https://www.google.com/search?q=${query}`);
  });

  it("opens the map lookups on the row's state", () => {
    homeGeometry = { type: "Polygon", coordinates: [[[28, 10], [32, 10], [32, 13], [28, 13], [28, 10]]] };
    renderPane();
    const [google, osm] = screen.getAllByTestId("inbox-place-lookup-link");
    expect(google!.getAttribute("href")).toMatch(/\/@11\.5,30,6z$/);
    expect(osm!.getAttribute("href")).toMatch(/#map=6\/11\.5\/30$/);
  });

  it("looks up the name as written with the country for a row with no Arabic spelling and no state", () => {
    renderPane({ row: { ...ROW, nameAr: null, stateLocationId: null, stateLocation: null } });
    expect(screen.getAllByTestId("inbox-place-lookup-link")[2]).toHaveAttribute(
      "href",
      `https://www.google.com/search?q=${encodeURIComponent("Um Dabakir, Sudan")}`,
    );
  });

  it("tracks a lookup by its provider only, never the name", () => {
    renderPane();
    fireEvent.click(screen.getAllByTestId("inbox-place-lookup-link")[1]!);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("place_name.lookup_opened", { provider: "openstreetmap" });
  });

  it("places the point from a pasted map link", () => {
    const entry = renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    paste("https://www.google.com/maps/place/Um+Dabakir/@11.4,29.7,10z/data=!3d11.25!4d29.95");
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "11.25,29.95");
    // The link does not stay in the search box.
    expect(screen.getByTestId("location-challenge-search")).toHaveValue("");
    fireEvent.click(screen.getByTestId("inbox-place-save"));
    expect(resolveMutate).toHaveBeenCalledWith({
      id: "pn-1",
      resolution: { kind: "POINT", point: { lat: 11.25, lng: 29.95, name: undefined } },
    });
    expect(onResolved).toHaveBeenCalledWith(entry, "POINT", 4);
  });

  it.each([
    ["11.25, 29.95", "11.25,29.95"],
    ["11.25 29.95", "11.25,29.95"],
    [`11°15'00"N 29°57'00"E`, "11.25,29.95"],
    ["https://www.openstreetmap.org/?mlat=11.25&mlon=29.95#map=12/11.4/29.7", "11.25,29.95"],
  ])("places the point from pasted %s", (text, placed) => {
    renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    paste(text);
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", placed);
  });

  it("places typed coordinates on Enter or from the offered point", () => {
    renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    const search = screen.getByTestId("location-challenge-search");
    fireEvent.change(search, { target: { value: "11.25, 29.95" } });
    // Typing does not move the point by itself.
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "");
    expect(screen.getByTestId("location-challenge-use-coordinates")).toHaveTextContent(
      'modal.useCoordinates:{"coordinates":"11.25000, 29.95000"}',
    );
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "11.25,29.95");

    fireEvent.change(search, { target: { value: "11.3 29.9" } });
    fireEvent.click(screen.getByTestId("location-challenge-use-coordinates"));
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "11.3,29.9");
  });

  it.each([
    ["https://maps.app.goo.gl/AbCdEf123", "modal.pasteShortLink"],
    ["https://www.google.com/maps/place/Um+Dabakir", "modal.pasteNoCoordinates"],
    ["95, 200", "modal.pasteNoCoordinates"],
  ])("says so when pasted %s has no coordinates, and the point does not move", (text, key) => {
    renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    fireEvent.click(screen.getByTestId("map"));
    paste(text);
    expect(screen.getByTestId("location-challenge-search")).toHaveValue(text);
    expect(screen.getByTestId("location-challenge-paste-problem")).toHaveTextContent(key);
    expect(screen.queryByTestId("location-challenge-use-coordinates")).toBeNull();
    // The point placed before stays where it was, and can still be saved.
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "11.2,29.9");
    expect(screen.getByTestId("inbox-place-save")).toBeEnabled();
  });

  it("keeps a place picked from the search when a paste after its name has no coordinates", async () => {
    geocodePlaceQuery.mockResolvedValueOnce([{ id: "h1", label: "Kadugli, Sudan", center: [29.72, 11.01] }] as never);
    renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    const search = screen.getByTestId("location-challenge-search");
    fireEvent.change(search, { target: { value: "Kadugli" } });
    fireEvent.click(await screen.findByText("Kadugli, Sudan"));
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "11.01,29.72");

    paste("95, 200");
    // The paste replaces the box's text: it does not join the place's name.
    expect(search).toHaveValue("95, 200");
    expect(screen.getByTestId("location-challenge-paste-problem")).toHaveTextContent("modal.pasteNoCoordinates");
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "11.01,29.72");
  });

  it("does not place the point on the Enter that confirms a composition", () => {
    renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    const search = screen.getByTestId("location-challenge-search");
    fireEvent.change(search, { target: { value: "11.25, 29.95" } });
    fireEvent.keyDown(search, { key: "Enter", isComposing: true });
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "");
    expect(search).toHaveValue("11.25, 29.95");
  });

  it("does not search for a link or coordinates as a place name", async () => {
    vi.useFakeTimers();
    try {
      renderPane();
      fireEvent.click(screen.getByTestId("inbox-place-place"));
      const search = screen.getByTestId("location-challenge-search");
      for (const text of ["https://maps.app.goo.gl/AbCdEf123", "11.25, 29.95", "95, 200"]) {
        fireEvent.change(search, { target: { value: text } });
        await vi.advanceTimersByTimeAsync(1000);
      }
      expect(geocodePlaceQuery).not.toHaveBeenCalled();
      fireEvent.change(search, { target: { value: "Um Dabakir" } });
      await vi.advanceTimersByTimeAsync(1000);
      expect(geocodePlaceQuery).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a team admin's pasted point inside the row's state", () => {
    placement = IN_ANOTHER_STATE;
    renderPane();
    fireEvent.click(screen.getByTestId("inbox-place-place"));
    paste("12.05, 24.88");
    expect(screen.getByTestId("map")).toHaveAttribute("data-placed", "12.05,24.88");
    expect(screen.getByTestId("location-challenge-outside-team")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-place-save")).toBeDisabled();
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

  it("opens on the whole country when no suggestion is inside the state, with nothing to choose", () => {
    suggestions = [LANDMARK];
    renderPane();
    expect(screen.getAllByTestId("inbox-place-suggestion")).toHaveLength(1);
    expect(screen.queryByTestId("inbox-place-scope")).toBeNull();
  });

  it("uses the country as the area of a row with no state", () => {
    renderPane({ row: { ...ROW, stateLocationId: null, stateLocation: null, signals: [] } });
    expect(suggestionsInput).toHaveBeenCalledWith(expect.objectContaining({ withinLocationId: "C1" }));
    expect(outlineIds).toHaveBeenLastCalledWith(["C1"]);
    expect(screen.getByTestId("inbox-place-posts")).toHaveTextContent("place.noPosts");
  });
});
