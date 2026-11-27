import { useCallback, useEffect, useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { reportHandledError } from "~/lib/report-handled-error";
import { useWorkingCountry } from "~/providers/working-country-provider";
import { api } from "~/trpc/react";
import { GLOBAL_PARAM, GLOBAL_PLACE, placeCountryId, resolvePlace, type MapPlace, type PlaceTree } from "../place/model";

export type MapPlaceStatus = "loading" | "ready" | "error";

export type PlaceOption = { id: string; name: string };

const EMPTY_TREE: PlaceTree = [];

const byName = (a: PlaceOption, b: PlaceOption) => a.name.localeCompare(b.name);

export function useMapPlace() {
  const [param, setParam] = useQueryState("place", parseAsString.withOptions({ history: "replace" }));
  const working = useWorkingCountry();
  const treeQuery = api.locations.tree.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const tree: PlaceTree = treeQuery.data ?? EMPTY_TREE;

  const scopeIds = useMemo(
    () => (working.hasCountryScope ? working.countries.map((c) => c.id) : null),
    [working.hasCountryScope, working.countries],
  );

  const status: MapPlaceStatus = treeQuery.isError
    ? "error"
    : treeQuery.isPending || !working.scopeReady
      ? "loading"
      : "ready";

  const resolved = useMemo(
    () => (status === "ready" ? resolvePlace(param, tree, scopeIds, working.countryId) : null),
    [status, param, tree, scopeIds, working.countryId],
  );

  let place: MapPlace;
  if (resolved) place = resolved.place;
  else if (status === "loading" && working.countryId && working.countryName) {
    place = { kind: "country", id: working.countryId, name: working.countryName };
  } else place = GLOBAL_PLACE;

  const countryOptions = useMemo<PlaceOption[]>(
    () =>
      tree
        .filter((c) => scopeIds === null || scopeIds.includes(c.id))
        .map(({ id, name }) => ({ id, name }))
        .sort(byName),
    [tree, scopeIds],
  );

  const placeCountry = placeCountryId(place);
  const stateOptions = useMemo<PlaceOption[]>(
    () =>
      (tree.find((c) => c.id === placeCountry)?.states ?? []).map(({ id, name }) => ({ id, name })).sort(byName),
    [tree, placeCountry],
  );

  useEffect(() => {
    if (treeQuery.error) reportHandledError(treeQuery.error, { feature: "map-v2-place", stage: "tree" });
  }, [treeQuery.error]);

  const invalid = resolved?.invalid ?? false;
  useEffect(() => {
    if (invalid) void setParam(null);
  }, [invalid, setParam]);

  const workingCountryId = working.countryId;
  const setPlace = useCallback(
    (next: MapPlace) => {
      if (next.kind === "global") void setParam(GLOBAL_PARAM);
      else if (next.kind === "country" && next.id === workingCountryId) void setParam(null);
      else void setParam(next.id);
    },
    [setParam, workingCountryId],
  );

  return { status, place, countryOptions, stateOptions, setPlace };
}
