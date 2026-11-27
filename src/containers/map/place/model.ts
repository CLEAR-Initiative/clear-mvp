export type MapPlace =
  | { kind: "global" }
  | { kind: "country"; id: string; name: string }
  | { kind: "state"; id: string; name: string; country: { id: string; name: string } };

export type PlaceTree = readonly {
  id: string;
  name: string;
  states: readonly { id: string; name: string; districts: readonly { id: string; name: string }[] }[];
}[];

export const GLOBAL_PLACE: MapPlace = { kind: "global" };

export const GLOBAL_PARAM = "global";

function defaultPlace(tree: PlaceTree, workingCountryId: string | null): MapPlace {
  const country = workingCountryId ? tree.find((c) => c.id === workingCountryId) : undefined;
  return country ? { kind: "country", id: country.id, name: country.name } : GLOBAL_PLACE;
}

function findPlace(id: string, tree: PlaceTree): MapPlace | null {
  for (const country of tree) {
    if (country.id === id) return { kind: "country", id: country.id, name: country.name };
    for (const state of country.states) {
      const asState: MapPlace = {
        kind: "state",
        id: state.id,
        name: state.name,
        country: { id: country.id, name: country.name },
      };
      if (state.id === id) return asState;
      if (state.districts.some((d) => d.id === id)) return asState;
    }
  }
  return null;
}

export function placeCountryId(place: MapPlace): string | null {
  if (place.kind === "global") return null;
  return place.kind === "country" ? place.id : place.country.id;
}

export function placeLocationId(place: MapPlace): string | null {
  return place.kind === "global" ? null : place.id;
}

/** `scopeIds === null` means an unscoped team: every country is allowed. */
export function resolvePlace(
  param: string | null,
  tree: PlaceTree,
  scopeIds: readonly string[] | null,
  workingCountryId: string | null,
): { place: MapPlace; invalid: boolean } {
  if (param === GLOBAL_PARAM) return { place: GLOBAL_PLACE, invalid: false };
  if (param) {
    const found = findPlace(param, tree);
    const countryId = found ? placeCountryId(found) : null;
    if (found && countryId && (scopeIds === null || scopeIds.includes(countryId))) {
      return { place: found, invalid: false };
    }
  }
  return { place: defaultPlace(tree, workingCountryId), invalid: param !== null };
}
