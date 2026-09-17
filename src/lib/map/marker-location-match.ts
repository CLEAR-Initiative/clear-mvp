/**
 * Map location filter for pins.
 *
 * Catalog rows match by location id / ancestors. Landmark points created from
 * lat/lng (`createPointLocation`) often have no ancestors — without a country
 * bbox fallback those Observe pins vanish once Sudan (or any country) is selected.
 */

export type MarkerLocationScope = {
  locationId?: string | null;
  ancestorIds?: readonly string[] | null;
  region?: string | null;
  lng: number;
  lat: number;
  selectedLocationId: string | null;
  selectedLocationName: string | null;
  /**
   * Country bbox `[west, south, east, north]`. Pass only for a country-level
   * filter (not a region) so an orphan point inside the country still paints.
   */
  countryBbox?: readonly [number, number, number, number] | null;
};

export function pointInBbox(
  lng: number,
  lat: number,
  bbox: readonly [number, number, number, number],
): boolean {
  const [west, south, east, north] = bbox;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export function markerMatchesLocationScope(input: MarkerLocationScope): boolean {
  if (!input.selectedLocationId && !input.selectedLocationName) return true;

  if (input.selectedLocationId) {
    if (input.locationId === input.selectedLocationId) return true;
    if (input.ancestorIds?.includes(input.selectedLocationId)) return true;
  }

  if (input.selectedLocationName && input.region) {
    const regionLower = input.region.toLowerCase();
    const selectedLower = input.selectedLocationName.toLowerCase();
    if (
      regionLower.includes(selectedLower) ||
      selectedLower.includes(regionLower)
    ) {
      return true;
    }
  }

  if (
    input.countryBbox &&
    pointInBbox(input.lng, input.lat, input.countryBbox)
  ) {
    return true;
  }

  return false;
}
