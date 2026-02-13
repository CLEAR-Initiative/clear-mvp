export interface CountryConfig {
  center: [number, number];
  zoom: number;
  regions: string[];
  hasCrisisData?: boolean;
}

export const countryConfig: Record<string, CountryConfig> = {
  Sudan: {
    center: [30.0, 15.5],
    zoom: 5,
    regions: ["All Regions", "Khartoum", "North Darfur", "South Darfur", "West Darfur", "Central Darfur", "Blue Nile", "Red Sea", "Kassala"],
    hasCrisisData: true,
  },
  Ethiopia: {
    center: [40.5, 8.5],
    zoom: 5.5,
    regions: ["All Regions", "Somali", "Oromia", "Afar", "Amhara", "Tigray", "SNNPR"],
    hasCrisisData: true,
  },
  "South Sudan": {
    center: [31.0, 7.0],
    zoom: 5.5,
    regions: ["All Regions", "Central Equatoria", "Jonglei", "Unity", "Upper Nile", "Lakes"],
  },
  Somalia: {
    center: [46.0, 5.0],
    zoom: 5,
    regions: ["All Regions", "Banadir", "Bay", "Gedo", "Lower Juba", "Middle Shabelle"],
  },
  Yemen: {
    center: [48.0, 15.5],
    zoom: 5.5,
    regions: ["All Regions", "Sana'a", "Aden", "Taiz", "Hodeidah", "Marib"],
  },
  Afghanistan: {
    center: [67.7, 33.9],
    zoom: 5.5,
    regions: ["All Regions", "Kabul", "Herat", "Kandahar", "Mazar-i-Sharif"],
  },
  Ukraine: {
    center: [31.2, 48.4],
    zoom: 5,
    regions: ["All Regions", "Kyiv", "Kharkiv", "Odesa", "Lviv"],
  },
  Iraq: {
    center: [44.4, 33.3],
    zoom: 5.5,
    regions: ["All Regions", "Baghdad", "Erbil", "Mosul", "Basra"],
  },
  Syria: {
    center: [38.9, 34.8],
    zoom: 6,
    regions: ["All Regions", "Damascus", "Aleppo", "Idlib", "Homs"],
  },
  Colombia: {
    center: [-74.3, 4.6],
    zoom: 5,
    regions: ["All Regions", "Bogota", "Medellin", "Cali"],
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
