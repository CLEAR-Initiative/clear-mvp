import { ALL_COUNTRIES, WORLD_VIEW } from "~/lib/constants/country-config";

/** All Countries zoom-out is 20% slower than the current fly so it reads as a different move. */
export const WORLD_PICK_FLY_DURATION_FACTOR = 1.2;

export function worldPickFlyDuration(currentFlyMs: number): number {
  return Math.round(currentFlyMs * WORLD_PICK_FLY_DURATION_FACTOR);
}

/**
 * Country fitBounds skips a repeat frame of the same country so live pans
 * are not yanked back. After All Countries the skip must reset — otherwise
 * Sudan → All Countries → Sudan never flies in again.
 */
export function shouldSkipCountryFit(args: {
  prevFramedKey: string | undefined;
  nextFramedKey: string | undefined;
  nonceBumped: boolean;
}): boolean {
  if (args.nonceBumped) return false;
  if (!args.nextFramedKey) return true;
  return args.prevFramedKey === args.nextFramedKey;
}

/** Unset focus (All Countries) forgets the last frame so the next pick refits. */
export function framedCountryAfterFocusChange(
  focusCountryName: string | undefined,
): string | undefined {
  return focusCountryName || undefined;
}

export function browseMapCamera(args: {
  selectedCountry: string;
  lastFocusedCountry: string | null;
  getCenter: (countryName: string) => [number, number];
  getZoom: (countryName: string) => number;
}): { center: [number, number]; zoom: number } {
  if (args.selectedCountry && args.selectedCountry !== ALL_COUNTRIES) {
    return {
      center: args.getCenter(args.selectedCountry),
      zoom: args.getZoom(args.selectedCountry),
    };
  }
  return {
    center: args.lastFocusedCountry
      ? args.getCenter(args.lastFocusedCountry)
      : WORLD_VIEW.center,
    zoom: WORLD_VIEW.zoom,
  };
}
