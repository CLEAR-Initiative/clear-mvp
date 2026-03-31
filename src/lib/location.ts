import type { GqlLocation } from "~/lib/types/graphql";

export function resolveLocationName(location: GqlLocation | null | undefined): string | null {
  if (!location) return null;
  if (location.level <= 2) return location.name;
  // Level > 2: find nearest ancestor at level <= 2
  const ancestor = (location.ancestors ?? [])
    .filter((a) => a.level <= 2)
    .sort((a, b) => b.level - a.level)[0]; // highest level <= 2 = most specific
  return ancestor?.name ?? null;
}
