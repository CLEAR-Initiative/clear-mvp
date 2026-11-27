import { expandSelectionsToCodes, type HierarchyLevel1 } from "~/components/disaster-type-picker";

export type MapFilters = { category: string | null; crisisType: string | null };

export const NO_FILTERS: MapFilters = { category: null, crisisType: null };

function categoryOf(crisisType: string, hierarchy: readonly HierarchyLevel1[]): string | null {
  return hierarchy.find((l1) => l1.groups.some((g) => g.name === crisisType))?.name ?? null;
}

export function resolveMapFilters(
  raw: MapFilters,
  hierarchy: readonly HierarchyLevel1[],
): { filters: MapFilters; changed: boolean } {
  const category = raw.category !== null && hierarchy.some((l1) => l1.name === raw.category) ? raw.category : null;
  const typeCategory = raw.crisisType !== null ? categoryOf(raw.crisisType, hierarchy) : null;

  let filters: MapFilters;
  if (typeCategory === null) filters = { category, crisisType: null };
  else if (category !== null && category !== typeCategory) filters = { category, crisisType: null };
  else filters = { category: typeCategory, crisisType: raw.crisisType };

  const changed = filters.category !== raw.category || filters.crisisType !== raw.crisisType;
  return { filters, changed };
}

export function filterEventTypes(
  filters: MapFilters,
  hierarchy: readonly HierarchyLevel1[],
): string[] | undefined {
  const { category, crisisType } = filters;
  if (category === null) return undefined;
  const selections =
    crisisType !== null
      ? [`${category}::${crisisType}`]
      : (hierarchy.find((l1) => l1.name === category)?.groups.map((g) => `${category}::${g.name}`) ?? []);
  return expandSelectionsToCodes(selections, hierarchy);
}

export function sentenceCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
