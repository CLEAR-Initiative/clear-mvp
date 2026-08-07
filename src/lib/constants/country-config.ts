export interface CountryConfig {
  center: [number, number];
  zoom: number;
  regions: string[];
  hasCrisisData?: boolean;
  /** [lng_min, lat_min, lng_max, lat_max] bounding box for country detection */
  bbox: [number, number, number, number];
  /** ISO 3166-1 alpha-2 code used for Mapbox country focus layer */
  pCode?: string;
}

export const countryConfig: Record<string, CountryConfig> = {
  Sudan:        { center: [30.0, 15.5], zoom: 5,   pCode: "SD", hasCrisisData: true,  bbox: [21.8,  8.7, 38.6, 23.2], regions: ["All Regions", "Khartoum", "North Darfur", "South Darfur", "West Darfur", "Central Darfur", "Blue Nile", "Red Sea", "Kassala"] },
  Ethiopia:     { center: [40.5,  8.5], zoom: 5.5, pCode: "ET", hasCrisisData: true,  bbox: [33.0,  3.4, 48.0, 14.9], regions: ["All Regions", "Somali", "Oromia", "Afar", "Amhara", "Tigray", "SNNPR"] },
  "South Sudan":{ center: [31.0,  7.0], zoom: 5.5, pCode: "SS",                       bbox: [24.0,  3.5, 36.0, 12.2], regions: ["All Regions", "Central Equatoria", "Jonglei", "Unity", "Upper Nile", "Lakes"] },
  Somalia:      { center: [46.0,  5.0], zoom: 5,   pCode: "SO",                       bbox: [40.9, -1.7, 51.4, 12.0], regions: ["All Regions", "Banadir", "Bay", "Gedo", "Lower Juba", "Middle Shabelle"] },
  Yemen:        { center: [48.0, 15.5], zoom: 5.5, pCode: "YE",                       bbox: [42.5, 12.1, 54.5, 19.0], regions: ["All Regions", "Sana'a", "Aden", "Taiz", "Hodeidah", "Marib"] },
  Afghanistan:  { center: [67.7, 33.9], zoom: 5.5, pCode: "AF",                       bbox: [60.5, 29.4, 74.9, 38.5], regions: ["All Regions", "Kabul", "Herat", "Kandahar", "Mazar-i-Sharif"] },
  Ukraine:      { center: [31.2, 48.4], zoom: 5,   pCode: "UA",                       bbox: [22.1, 44.4, 40.2, 52.4], regions: ["All Regions", "Kyiv", "Kharkiv", "Odesa", "Lviv"] },
  Iraq:         { center: [44.4, 33.3], zoom: 5.5, pCode: "IQ",                       bbox: [38.8, 29.1, 48.6, 37.4], regions: ["All Regions", "Baghdad", "Erbil", "Mosul", "Basra"] },
  Syria:        { center: [38.9, 34.8], zoom: 6,   pCode: "SY",                       bbox: [35.7, 32.3, 42.4, 37.3], regions: ["All Regions", "Damascus", "Aleppo", "Idlib", "Homs"] },
  Colombia:     { center: [-74.3, 4.6], zoom: 5,   pCode: "CO",                       bbox: [-79.0,-4.2, -66.9,13.4], regions: ["All Regions", "Bogota", "Medellin", "Cali"] },
  // Team Venezuela - must stay in sync with locations.tree or country switch
  // falls back to Sudan center and needs multiple clicks to settle (GH #112).
  Venezuela:    { center: [-66.6, 6.4], zoom: 5,   pCode: "VE", hasCrisisData: true,  bbox: [-73.4, 0.6, -59.8, 12.2], regions: ["All Regions", "Distrito Capital", "Zulia", "Miranda", "Carabobo", "Lara"] },
};

export const countries = Object.keys(countryConfig).sort();

/**
 * Official / COD names that differ from our short countryConfig keys.
 * locations.tree uses UN-style names (e.g. Venezuela); config keys stay short.
 */
const COUNTRY_NAME_ALIASES: Record<string, keyof typeof countryConfig> = {
  "Venezuela (Bolivarian Republic of)": "Venezuela",
  "Bolivarian Republic of Venezuela": "Venezuela",
};

/**
 * Drop the COD/UN qualifier for display and for name-keyed lookups.
 * "Venezuela (Bolivarian Republic of)" -> "Venezuela".
 * The canonical name stays in `locations`; this is presentation only.
 */
export function shortCountryName(name: string): string;
export function shortCountryName(name: null | undefined): null;
export function shortCountryName(name: string | null | undefined): string | null;
export function shortCountryName(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.replace(/\s*\(.*\)\s*$/, "").trim();
}

/**
 * Map an API / dropdown country name to a countryConfig entry.
 * Exact -> alias -> "Name (...)" / "Name ..." prefix match (longest key wins so
 * "South Sudan" is not swallowed by "Sudan").
 */
export function resolveCountryConfig(
  countryName: string | undefined,
): CountryConfig | undefined {
  if (!countryName) return undefined;
  const direct = countryConfig[countryName];
  if (direct) return direct;

  const aliased = COUNTRY_NAME_ALIASES[countryName];
  if (aliased) return countryConfig[aliased];

  const lower = countryName.toLowerCase();
  let bestKey: string | undefined;
  for (const key of Object.keys(countryConfig)) {
    const k = key.toLowerCase();
    if (lower === k || lower.startsWith(`${k} (`) || lower.startsWith(`${k} `)) {
      if (!bestKey || key.length > bestKey.length) bestKey = key;
    }
  }
  return bestKey ? countryConfig[bestKey] : undefined;
}

/**
 * Instant country framing for the map switcher.
 * Camera must not wait on L0 GeoJSON - borders/highlight paint later.
 */
export function staticCountryBounds(
  countryName: string | undefined,
): [number, number, number, number] | null {
  const bbox = resolveCountryConfig(countryName)?.bbox;
  if (!bbox) return null;
  return [bbox[0], bbox[1], bbox[2], bbox[3]];
}

/** Generate dynamic date filter options based on the current date */
function buildDateOptions(): string[] {
  const now = new Date();
  const months: string[] = [];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
  }
  return [...months, "Last 7 days", "Last 30 days", "Last 90 days"];
}

export const dateOptions = buildDateOptions();

/** Parse a date filter option into a { start, end } range (UTC timestamps) */
export function parseDateFilter(option: string): { start: Date; end: Date } {
  const now = new Date();

  // "Last N days" patterns
  const lastDays = option.match(/^Last (\d+) days$/i);
  if (lastDays) {
    const days = parseInt(lastDays[1]!, 10);
    return { start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), end: now };
  }

  // "Mon YYYY" patterns
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthMatch = option.match(/^(\w+)\s+(\d{4})$/);
  if (monthMatch) {
    const monthIdx = monthNames.indexOf(monthMatch[1]!);
    const year = parseInt(monthMatch[2]!, 10);
    if (monthIdx >= 0) {
      const start = new Date(year, monthIdx, 1);
      const end = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
  }

  // Fallback: last 30 days
  return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
}
