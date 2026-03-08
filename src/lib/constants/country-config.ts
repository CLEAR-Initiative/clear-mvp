export interface CountryConfig {
  center: [number, number];
  zoom: number;
  regions: string[];
  hasCrisisData?: boolean;
  /** [lng_min, lat_min, lng_max, lat_max] bounding box for country detection */
  bbox: [number, number, number, number];
}

export const countryConfig: Record<string, CountryConfig> = {
  Sudan: {
    center: [30.0, 15.5],
    zoom: 5,
    regions: ["All Regions", "Khartoum", "North Darfur", "South Darfur", "West Darfur", "Central Darfur", "Blue Nile", "Red Sea", "Kassala"],
    hasCrisisData: true,
    bbox: [21.8, 8.7, 38.6, 23.2],
  },
  Ethiopia: {
    center: [40.5, 8.5],
    zoom: 5.5,
    regions: ["All Regions", "Somali", "Oromia", "Afar", "Amhara", "Tigray", "SNNPR"],
    hasCrisisData: true,
    bbox: [33.0, 3.4, 48.0, 14.9],
  },
  "South Sudan": {
    center: [31.0, 7.0],
    zoom: 5.5,
    regions: ["All Regions", "Central Equatoria", "Jonglei", "Unity", "Upper Nile", "Lakes"],
    bbox: [24.0, 3.5, 36.0, 12.2],
  },
  Somalia: {
    center: [46.0, 5.0],
    zoom: 5,
    regions: ["All Regions", "Banadir", "Bay", "Gedo", "Lower Juba", "Middle Shabelle"],
    bbox: [40.9, -1.7, 51.4, 12.0],
  },
  Yemen: {
    center: [48.0, 15.5],
    zoom: 5.5,
    regions: ["All Regions", "Sana'a", "Aden", "Taiz", "Hodeidah", "Marib"],
    bbox: [42.5, 12.1, 54.5, 19.0],
  },
  Afghanistan: {
    center: [67.7, 33.9],
    zoom: 5.5,
    regions: ["All Regions", "Kabul", "Herat", "Kandahar", "Mazar-i-Sharif"],
    bbox: [60.5, 29.4, 74.9, 38.5],
  },
  Ukraine: {
    center: [31.2, 48.4],
    zoom: 5,
    regions: ["All Regions", "Kyiv", "Kharkiv", "Odesa", "Lviv"],
    bbox: [22.1, 44.4, 40.2, 52.4],
  },
  Iraq: {
    center: [44.4, 33.3],
    zoom: 5.5,
    regions: ["All Regions", "Baghdad", "Erbil", "Mosul", "Basra"],
    bbox: [38.8, 29.1, 48.6, 37.4],
  },
  Syria: {
    center: [38.9, 34.8],
    zoom: 6,
    regions: ["All Regions", "Damascus", "Aleppo", "Idlib", "Homs"],
    bbox: [35.7, 32.3, 42.4, 37.3],
  },
  Colombia: {
    center: [-74.3, 4.6],
    zoom: 5,
    regions: ["All Regions", "Bogota", "Medellin", "Cali"],
    bbox: [-79.0, -4.2, -66.9, 13.4],
  },
};

export const countries = Object.keys(countryConfig).sort();

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
