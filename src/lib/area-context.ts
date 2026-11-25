import type { GqlLocation } from "~/lib/types/graphql";

type AreaLocation = Pick<GqlLocation, "name" | "level" | "population" | "metadata" | "ancestors">;

/** The location and the ancestors it carries, the candidates for the area's figures. */
function candidates(location: AreaLocation) {
  return [location, ...(location.ancestors ?? [])];
}

/** The population of the most local area that has one: district (A2), then state (A1), then country. */
export function areaPopulationOf(location: AreaLocation | null | undefined): { name: string; value: string } | null {
  if (!location) return null;
  const all = candidates(location);
  for (const level of [2, 1, 0]) {
    const found = all.find((c) => c.level === level && c.population);
    if (found?.population) return { name: found.name, value: found.population };
  }
  return null;
}

export type IdpData = { displaced: number; population: number | null; ratio: number | null; name: string };

/**
 * IDPs per capita of the most local area with IOM DTM displacement data: district (A2), then state (A1),
 * then country. `ratio` is null when that area has no population.
 */
export function idpPerCapitaOf(location: AreaLocation | null | undefined): IdpData | null {
  if (!location) return null;
  const all = candidates(location);
  for (const level of [2, 1, 0]) {
    const found = all.find((c) => c.level === level);
    if (!found) continue;
    const meta = found.metadata?.find((m) => m.type === "iom_dtm_displacement");
    if (!meta?.data) continue;
    const displaced = (meta.data as Record<string, unknown>).population_displaced;
    if (typeof displaced !== "number" || !Number.isFinite(displaced)) continue;
    const population = found.population ? Number(found.population) : null;
    const ratio = population ? displaced / population : null;
    return { displaced, population, ratio, name: found.name };
  }
  return null;
}

/** The IDP figure as the detail pages show it: a percentage, else the displaced count when the area has no population. */
export function formatIdp(idp: IdpData, formatCount: (value: number) => string): string {
  return idp.ratio !== null ? `${(idp.ratio * 100).toFixed(1)}%` : formatCount(idp.displaced);
}
