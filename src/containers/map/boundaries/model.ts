export const BOUNDARY_LEVELS = ["country", "state", "districts"] as const;

export type BoundaryLevel = (typeof BOUNDARY_LEVELS)[number];

export const DEFAULT_BOUNDARY_LEVEL: BoundaryLevel = "state";

export const ADMIN_LEVEL: Record<BoundaryLevel, 0 | 1 | 2> = { country: 0, state: 1, districts: 2 };

export const BOUNDARY_WIDTH: Record<BoundaryLevel, number> = { country: 2, state: 1.5, districts: 1 };

export type BoundaryRequest = { level: 0 | 1 | 2; countryId: string } | { level: 0 | 1 | 2; countryIds: string[] };

export type BoundaryScope = {
  scopeReady: boolean;
  countryId: string | null;
  countries: readonly { id: string }[];
};

/** `null` means no request: without a scope clear-api returns every location in the system. */
export function boundaryRequest(level: BoundaryLevel, scope: BoundaryScope): BoundaryRequest | null {
  if (!scope.scopeReady || scope.countries.length === 0) return null;
  if (scope.countryId) return { level: ADMIN_LEVEL[level], countryId: scope.countryId };
  return { level: ADMIN_LEVEL[level], countryIds: scope.countries.map((c) => c.id) };
}
