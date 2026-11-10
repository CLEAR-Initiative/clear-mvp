import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { GqlPlaceAlias, GqlPlaceNameSuggestion, PlaceAliasCountry } from "~/lib/types/graphql";

/**
 * The alias list: who sees which actions, and adding, changing and deleting
 * an alias. clear-api enforces the same access rule; the list only hides the
 * actions the reader cannot use (`canEdit`).
 */

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, vars?: Record<string, unknown>) => (vars ? `${key}:${JSON.stringify(vars)}` : key);
    t.rich = (key: string, vars?: Record<string, unknown>) => `${key}:${String(vars?.name ?? "")}`;
    return t;
  },
  useFormatter: () => ({ dateTime: () => "2 Nov 2026" }),
  useLocale: () => "en",
}));
vi.mock("@mantine/hooks", async () => {
  const actual = await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return { ...actual, useDebouncedValue: <T,>(value: T) => [value] };
});
vi.mock("~/components/location-challenge/location-challenge-map", () => ({
  LocationChallengeMap: (props: { onPick: (at: { lat: number; lng: number }) => void }) => (
    <button type="button" data-testid="map" onClick={() => props.onPick({ lat: 11.2, lng: 29.9 })} />
  ),
}));
vi.mock("~/lib/map/geocode-lookup", () => ({ geocodePlaceQuery: vi.fn(async () => []) }));

const alias = (over: Partial<GqlPlaceAlias>): GqlPlaceAlias => ({
  id: "a1",
  nameNorm: "um dabakir",
  nameDisplay: "Um Dabakir",
  countryCode: "SD",
  scopeLocationId: "S1",
  scopeLocation: { id: "S1", name: "South Kordofan" },
  locationId: "L4",
  location: {
    id: "L4",
    name: "Um Dabakir power station",
    level: 4,
    ancestors: [
      { id: "C1", name: "Sudan", level: 0 },
      { id: "S1", name: "South Kordofan", level: 1 },
      { id: "D1", name: "Kadugli", level: 2 },
    ],
  },
  source: "REVIEW",
  createdByName: "Amal",
  createdAt: "2026-11-02T09:00:00Z",
  note: null,
  canEdit: true,
  ...over,
});

const COUNTRIES: PlaceAliasCountry[] = [
  { countryCode: "SD", name: "Sudan", countryLocationId: "C1", states: [{ id: "S1", name: "South Kordofan" }, { id: "S2", name: "White Nile" }] },
];
const DISTRICT: GqlPlaceNameSuggestion = {
  kind: "LOCATION", geonamesId: null, locationId: "D1", name: "Kadugli", level: 2, featureClass: null,
  featureCode: null, latitude: 11, longitude: 29.7, score: 1, insideArea: true, distanceKm: 0,
};
const GEONAMES: GqlPlaceNameSuggestion = {
  kind: "GEONAMES", geonamesId: 7, locationId: null, name: "Umm Dabakir", level: null, featureClass: "P",
  featureCode: "PPL", latitude: 11.1, longitude: 29.8, score: 0.8, insideArea: false, distanceKm: 41.6,
};

let pages: { items: GqlPlaceAlias[]; totalCount: number; nextCursor: string | null }[] = [];
let hasNextPage = false;
let writeError: { message: string; data?: { code?: string } } | null = null;
const listInput = vi.fn();
const suggestionsInput = vi.fn();
const fetchNextPage = vi.fn();
const createMutate = vi.fn();
const updateMutate = vi.fn();
const deleteMutate = vi.fn();
const invalidate = { aliases: vi.fn(), queue: vi.fn(), queueCount: vi.fn() };

const mutation = (spy: (input: unknown) => void) => ({
  useMutation: () => ({
    mutate: (input: unknown, opts: { onSuccess?: () => void; onError?: (err: unknown) => void }) => {
      spy(input);
      if (writeError) opts.onError?.(writeError);
      else opts.onSuccess?.();
    },
    isPending: false,
  }),
});

vi.mock("~/trpc/react", () => ({
  api: {
    useUtils: () => ({
      placeNames: {
        aliases: { invalidate: invalidate.aliases },
        queue: { invalidate: invalidate.queue },
        queueCount: { invalidate: invalidate.queueCount },
      },
    }),
    locationChallenge: {
      placement: {
        useQuery: () => ({
          data: { id: "D1", name: "Kadugli", level: 2, ancestors: [{ id: "S1", name: "South Kordofan", level: 1 }] },
          isLoading: false,
          isSuccess: true,
        }),
      },
    },
    placeNames: {
      aliases: {
        useInfiniteQuery: (input: unknown) => {
          listInput(input);
          return { data: { pages }, isLoading: false, error: null, hasNextPage, isFetchingNextPage: false, fetchNextPage };
        },
      },
      aliasScopes: { useQuery: () => ({ data: COUNTRIES }) },
      suggestions: {
        useQuery: (input: unknown, opts: { enabled: boolean }) => {
          suggestionsInput(input, opts.enabled);
          return { data: opts.enabled ? [DISTRICT, GEONAMES] : undefined, isLoading: false };
        },
      },
      createAlias: mutation(createMutate),
      updateAlias: mutation(updateMutate),
      deleteAlias: mutation(deleteMutate),
    },
  },
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
Element.prototype.scrollIntoView = () => undefined;

const { AliasesView } = await import("./aliases-view");

function renderView(canPlaceAnywhere = false) {
  render(
    <MantineProvider>
      <AliasesView canPlaceAnywhere={canPlaceAnywhere} />
    </MantineProvider>,
  );
}

/** Pick an option of a Mantine Select by its label. */
function choose(testId: string, label: string) {
  fireEvent.click(screen.getByTestId(testId));
  fireEvent.click(screen.getByRole("option", { name: label }));
}

beforeEach(() => {
  pages = [
    {
      items: [
        alias({}),
        alias({ id: "a2", nameDisplay: "أم دباكر", nameNorm: "ام دباكر", note: "Arabic spelling" }),
        alias({ id: "a3", nameDisplay: "Merowe Dam", scopeLocationId: null, scopeLocation: null, source: "SEED", createdByName: null, canEdit: false }),
      ],
      totalCount: 3,
      nextCursor: null,
    },
  ];
  hasNextPage = false;
  writeError = null;
  vi.clearAllMocks();
});
afterEach(cleanup);

describe("AliasesView list", () => {
  it("lists each alias with its target path, scope, source, author and date", () => {
    renderView();
    const rows = screen.getAllByTestId("inbox-alias-row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByTestId("inbox-alias-spelling")).toHaveTextContent("Um Dabakir");
    expect(within(rows[0]!).getByTestId("inbox-alias-target")).toHaveTextContent(
      "Um Dabakir power station, Kadugli, South Kordofan",
    );
    expect(rows[0]).toHaveTextContent("aliases.levels.landmark");
    expect(rows[0]).toHaveTextContent("South Kordofan");
    expect(rows[0]).toHaveTextContent("aliases.sources.REVIEW");
    expect(rows[0]).toHaveTextContent("Amal");
    expect(rows[0]).toHaveTextContent("2 Nov 2026");
    // An Arabic spelling sits in its own bidi island.
    expect(within(rows[1]!).getByTestId("inbox-alias-spelling").tagName).toBe("BDI");
    expect(rows[1]).toHaveTextContent("Arabic spelling");
    // A country-wide seed alias with no author.
    expect(rows[2]).toHaveTextContent('aliases.wholeCountry:{"country":"SD"}');
    expect(rows[2]).toHaveTextContent("aliases.sources.SEED");
    expect(rows[2]).toHaveTextContent("aliases.noAuthor");
    expect(screen.getByTestId("inbox-aliases-count")).toHaveTextContent('aliases.count:{"count":3}');
  });

  it("shows Edit and Delete only on the aliases the reader may change", () => {
    renderView();
    const rows = screen.getAllByTestId("inbox-alias-row");
    expect(within(rows[0]!).getByTestId("inbox-alias-edit")).toBeInTheDocument();
    expect(within(rows[0]!).getByTestId("inbox-alias-delete")).toBeInTheDocument();
    expect(within(rows[2]!).queryByTestId("inbox-alias-edit")).not.toBeInTheDocument();
    expect(within(rows[2]!).queryByTestId("inbox-alias-delete")).not.toBeInTheDocument();
  });

  it("searches by spelling or place, and filters by source", () => {
    renderView();
    fireEvent.change(screen.getByTestId("inbox-aliases-search"), { target: { value: " kadugli " } });
    expect(listInput).toHaveBeenLastCalledWith({ search: "kadugli", source: undefined });
    choose("inbox-aliases-source", "aliases.sources.MANUAL");
    expect(listInput).toHaveBeenLastCalledWith({ search: "kadugli", source: "MANUAL" });
  });

  it("loads more while clear-api has more", () => {
    hasNextPage = true;
    pages[0]!.totalCount = 120;
    renderView();
    const more = screen.getByTestId("inbox-aliases-more");
    expect(more).toHaveTextContent('aliases.loadMore:{"shown":3,"total":120}');
    fireEvent.click(more);
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("says so when there is no alias, or none that matches", () => {
    pages = [{ items: [], totalCount: 0, nextCursor: null }];
    renderView();
    expect(screen.getByText("aliases.empty")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("inbox-aliases-search"), { target: { value: "zz" } });
    expect(screen.getByText("aliases.noMatch")).toBeInTheDocument();
  });
});

describe("AliasesView add", () => {
  function openAdd(canPlaceAnywhere = false) {
    renderView(canPlaceAnywhere);
    fireEvent.click(screen.getByTestId("inbox-aliases-add"));
    fireEvent.change(screen.getByTestId("inbox-alias-form-name"), { target: { value: "Um Dabakir" } });
    fireEvent.change(screen.getByTestId("inbox-alias-form-arabic"), { target: { value: "أم دباكر" } });
  }

  it("adds an alias to a place CLEAR already has, scoped to a state", () => {
    openAdd();
    expect(screen.getByTestId("inbox-alias-form-save")).toBeDisabled();
    choose("inbox-alias-form-scope", "South Kordofan");
    // Suggestions are asked for inside the scope, with both spellings.
    expect(suggestionsInput).toHaveBeenLastCalledWith(
      { name: "Um Dabakir", nameAr: "أم دباكر", countryCode: "SD", withinLocationId: "S1" },
      true,
    );
    fireEvent.click(within(screen.getByTestId("inbox-alias-form-suggestions")).getAllByRole("radio")[0]!);
    fireEvent.change(screen.getByTestId("inbox-alias-form-note"), { target: { value: " Power station " } });
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(createMutate).toHaveBeenCalledWith({
      name: "Um Dabakir",
      nameAr: "أم دباكر",
      countryCode: "SD",
      scopeLocationId: "S1",
      locationId: "D1",
      note: "Power station",
    });
    // The list and the queue follow: a new alias closes the rows it answers.
    expect(invalidate.aliases).toHaveBeenCalled();
    expect(invalidate.queue).toHaveBeenCalled();
    expect(invalidate.queueCount).toHaveBeenCalled();
    expect(screen.queryByTestId("inbox-alias-form")).not.toBeInTheDocument();
  });

  it("sends a GeoNames place as a named point, so clear-api makes the landmark", () => {
    openAdd();
    choose("inbox-alias-form-scope", "South Kordofan");
    const radios = within(screen.getByTestId("inbox-alias-form-suggestions")).getAllByRole("radio");
    fireEvent.click(radios[1]!);
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ point: { lat: 11.1, lng: 29.8, name: "Umm Dabakir" }, scopeLocationId: "S1" }),
    );
    expect(createMutate.mock.calls[0]![0]).not.toHaveProperty("locationId");
  });

  it("adds an alias at a point placed on the map", () => {
    openAdd();
    choose("inbox-alias-form-scope", "South Kordofan");
    fireEvent.click(screen.getByTestId("inbox-alias-form-point"));
    expect(screen.getByTestId("inbox-alias-form-save")).toBeDisabled();
    fireEvent.click(screen.getByTestId("map"));
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ scopeLocationId: "S1", point: { lat: 11.2, lng: 29.9, name: undefined } }),
    );
  });

  it("keeps a team admin's point inside the scope; a platform admin may go beyond it", () => {
    // The point lands in South Kordofan; the alias is scoped to White Nile.
    openAdd();
    choose("inbox-alias-form-scope", "White Nile");
    fireEvent.click(screen.getByTestId("inbox-alias-form-point"));
    fireEvent.click(screen.getByTestId("map"));
    expect(screen.getByTestId("inbox-alias-form-save")).toBeDisabled();
    cleanup();

    openAdd(true);
    choose("inbox-alias-form-scope", "White Nile");
    fireEvent.click(screen.getByTestId("inbox-alias-form-point"));
    fireEvent.click(screen.getByTestId("map"));
    expect(screen.getByTestId("inbox-alias-form-save")).toBeEnabled();
  });

  it("offers the whole country to a platform admin only", () => {
    openAdd(false);
    fireEvent.click(screen.getByTestId("inbox-alias-form-scope"));
    expect(screen.queryByRole("option", { name: /aliases.form.wholeCountry/ })).not.toBeInTheDocument();
    cleanup();

    openAdd(true);
    choose("inbox-alias-form-scope", 'aliases.form.wholeCountry:{"country":"Sudan"}');
    // With no state, suggestions are asked for inside the country.
    expect(suggestionsInput).toHaveBeenLastCalledWith(expect.objectContaining({ withinLocationId: "C1" }), true);
    fireEvent.click(within(screen.getByTestId("inbox-alias-form-suggestions")).getAllByRole("radio")[0]!);
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ scopeLocationId: null, locationId: "D1" }));
  });

  it.each([
    ["CONFLICT", "aliases.errors.conflict"],
    ["FORBIDDEN", "aliases.errors.forbidden"],
    ["BAD_REQUEST", "aliases.errors.badInput"],
    [undefined, "aliases.errors.failed"],
  ])("shows clear-api's refusal (%s) and keeps the form open", (code, key) => {
    writeError = { message: "refused", data: { code } };
    openAdd();
    choose("inbox-alias-form-scope", "South Kordofan");
    fireEvent.click(within(screen.getByTestId("inbox-alias-form-suggestions")).getAllByRole("radio")[0]!);
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(screen.getByRole("alert")).toHaveTextContent(key);
    expect(screen.getByTestId("inbox-alias-form")).toBeInTheDocument();
    expect(invalidate.aliases).not.toHaveBeenCalled();
  });
});

describe("AliasesView edit", () => {
  function openEdit(canPlaceAnywhere = false) {
    renderView(canPlaceAnywhere);
    fireEvent.click(within(screen.getAllByTestId("inbox-alias-row")[0]!).getByTestId("inbox-alias-edit"));
  }

  it("shows the spelling as fixed, and keeps the target unless the reader picks another", () => {
    openEdit();
    expect(screen.getByTestId("inbox-alias-form-spelling")).toHaveTextContent("Um Dabakir");
    expect(screen.queryByTestId("inbox-alias-form-name")).not.toBeInTheDocument();
    expect(screen.getByTestId("inbox-alias-form-keep")).toBeChecked();
    // Nothing changed yet.
    expect(screen.getByTestId("inbox-alias-form-save")).toBeDisabled();
  });

  it("changes the note alone", () => {
    openEdit();
    fireEvent.change(screen.getByTestId("inbox-alias-form-note"), { target: { value: "Checked with the team" } });
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(updateMutate).toHaveBeenCalledWith({ id: "a1", change: { note: "Checked with the team" } });
    expect(invalidate.aliases).toHaveBeenCalled();
  });

  it("changes the target to another place", () => {
    openEdit();
    fireEvent.click(screen.getByTestId("inbox-alias-form-pick"));
    fireEvent.click(within(screen.getByTestId("inbox-alias-form-suggestions")).getAllByRole("radio")[0]!);
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(updateMutate).toHaveBeenCalledWith({ id: "a1", change: { locationId: "D1" } });
  });

  it("changes the scope: to another state, or (a platform admin) to the whole country", () => {
    openEdit(true);
    choose("inbox-alias-form-scope", "White Nile");
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(updateMutate).toHaveBeenLastCalledWith({ id: "a1", change: { scopeLocationId: "S2" } });
    cleanup();

    openEdit(true);
    choose("inbox-alias-form-scope", 'aliases.form.wholeCountry:{"country":"Sudan"}');
    fireEvent.click(screen.getByTestId("inbox-alias-form-save"));
    expect(updateMutate).toHaveBeenLastCalledWith({ id: "a1", change: { scopeLocationId: null } });
  });
});

describe("AliasesView delete", () => {
  it("asks first, says that moved signals stay, then deletes and refreshes the list and the queue", () => {
    renderView();
    fireEvent.click(within(screen.getAllByTestId("inbox-alias-row")[0]!).getByTestId("inbox-alias-delete"));
    const confirm = screen.getByTestId("inbox-alias-delete-confirm");
    expect(confirm).toHaveTextContent("aliases.deleteBody:Um Dabakir");
    expect(confirm).toHaveTextContent("aliases.deleteKeeps");
    expect(deleteMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("inbox-alias-delete-yes"));
    expect(deleteMutate).toHaveBeenCalledWith({ id: "a1" });
    expect(invalidate.aliases).toHaveBeenCalled();
    // The queue row the alias came from opens again.
    expect(invalidate.queue).toHaveBeenCalled();
    expect(invalidate.queueCount).toHaveBeenCalled();
  });

  it("shows why clear-api refused, and keeps the alias", () => {
    writeError = { message: "refused", data: { code: "FORBIDDEN" } };
    renderView();
    fireEvent.click(within(screen.getAllByTestId("inbox-alias-row")[0]!).getByTestId("inbox-alias-delete"));
    fireEvent.click(screen.getByTestId("inbox-alias-delete-yes"));
    expect(screen.getByRole("alert")).toHaveTextContent("aliases.errors.forbidden");
    expect(invalidate.aliases).not.toHaveBeenCalled();
  });
});
