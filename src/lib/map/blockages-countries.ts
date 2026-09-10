/**
 * LogIE Blockages country scope — ISO3 codes for ArcGIS / clear-api filters.
 *
 * Map `pCode` is alpha-2 (Mapbox); LogIE layers filter on alpha-3 (`iso3`).
 * Keep this map in sync with countries CLEAR actually deploys (today: SDN,
 * AFG, VEN). Detection KPI has a similar table — prefer this helper for
 * Blockages so Venezuela aliases resolve correctly.
 */

import {
  ALL_COUNTRIES,
  shortCountryName,
} from "~/lib/constants/country-config";

/** ISO 3166-1 alpha-3 used by LogIE Feature Services. */
export const BLOCKAGES_COUNTRY_ISO3: Record<string, string> = {
  Sudan: "SDN",
  Ethiopia: "ETH",
  "South Sudan": "SSD",
  Somalia: "SOM",
  Yemen: "YEM",
  Afghanistan: "AFG",
  Ukraine: "UKR",
  Iraq: "IRQ",
  Syria: "SYR",
  Colombia: "COL",
  Venezuela: "VEN",
};

const NAME_ALIASES: Record<string, keyof typeof BLOCKAGES_COUNTRY_ISO3> = {
  "Venezuela (Bolivarian Republic of)": "Venezuela",
  "Bolivarian Republic of Venezuela": "Venezuela",
};

/** ISO3 codes CLEAR ships Blockages for in this wedge. */
export const BLOCKAGES_SHIPPED_ISO3 = ["SDN", "AFG", "VEN"] as const;
export type BlockagesShippedIso3 = (typeof BLOCKAGES_SHIPPED_ISO3)[number];

export function isBlockagesIso3(value: string): value is BlockagesShippedIso3 {
  return (BLOCKAGES_SHIPPED_ISO3 as readonly string[]).includes(value);
}

/**
 * Resolve a picker / COD country name to LogIE ISO3.
 * Returns null when unknown (do not invent SDN).
 */
export function countryNameToBlockagesIso3(
  countryName: string | null | undefined,
): string | null {
  if (!countryName || countryName === ALL_COUNTRIES) return null;

  const direct = BLOCKAGES_COUNTRY_ISO3[countryName];
  if (direct) return direct;

  const aliased = NAME_ALIASES[countryName];
  if (aliased) return BLOCKAGES_COUNTRY_ISO3[aliased] ?? null;

  const short = shortCountryName(countryName);
  if (short && short !== countryName) {
    return BLOCKAGES_COUNTRY_ISO3[short] ?? null;
  }

  return null;
}

/**
 * ISO3 list for the current map country frame.
 * - One country → that ISO3 (if known)
 * - All Countries → unique ISO3 for each team-scoped country name
 */
export function blockagesIso3ForMapScope(args: {
  selectedCountry: string;
  teamCountryNames: readonly string[];
}): string[] {
  const { selectedCountry, teamCountryNames } = args;

  if (selectedCountry !== ALL_COUNTRIES) {
    const one = countryNameToBlockagesIso3(selectedCountry);
    return one ? [one] : [];
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of teamCountryNames) {
    const iso3 = countryNameToBlockagesIso3(name);
    if (!iso3 || seen.has(iso3)) continue;
    seen.add(iso3);
    out.push(iso3);
  }
  return out;
}

/** Normalize / validate an ISO3 query value (uppercase A–Z × 3). */
export function normalizeBlockagesIso3(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(v) ? v : null;
}
