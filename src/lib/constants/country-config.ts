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

export const dateOptions = [
  "Feb 2026",
  "Jan 2026",
  "Dec 2025",
  "Nov 2025",
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
];
