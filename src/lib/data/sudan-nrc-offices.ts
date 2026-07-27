/**
 * NRC Sudan office / presence pins for the map "NRC locations" layer.
 *
 * COORDINATE PRECISION (read before changing):
 * Every lat/lng below is a **city or locality centroid** geocoded via OpenStreetMap
 * Nominatim from place names published in the **NRC Sudan Annual Report 2025**
 * operations map (pp. 8–9) and imprint. They are **not** surveyed NRC premises,
 * building footprints, or street-level addresses (except the Port Sudan imprint
 * text, which still uses the city centroid for the pin).
 *
 * Primary source:
 * https://www.nrc.no/globalassets/pdf/annual-reports/2025/sudan/nrc_2025-sudan-annual-report.pdf
 *
 * Supporting context (structure / status notes):
 * - NRC Sudan Annual Report 2024
 * - https://www.nrc.no/countries/africa/sudan/
 *
 * Note: https://www.nrc.no/where-we-work only lists Sudan at country level and
 * does not expose office coordinates.
 */

export type SudanNrcOfficeType =
  | "country_office"
  | "area_office"
  | "field_office"
  | "planned_or_expansion"
  | "former_country_office";

export type SudanNrcOfficeStatus =
  | "active"
  | "hibernating_remote"
  | "expansion"
  | "relocated";

export type SudanNrcOffice = {
  id: string;
  name: string;
  city: string;
  state: string;
  officeType: SudanNrcOfficeType;
  /** Parent area office label when known */
  areaOffice: string | null;
  status: SudanNrcOfficeStatus;
  /** Imprint / published street text when available (pin still uses city centroid) */
  address: string | null;
  notes: string;
  /** WGS84 — city/locality centroid, NOT a verified office building */
  latitude: number;
  longitude: number;
};

export const SUDAN_NRC_OFFICES_SOURCE = {
  report: "NRC Sudan Annual Report 2025",
  reportUrl:
    "https://www.nrc.no/globalassets/pdf/annual-reports/2025/sudan/nrc_2025-sudan-annual-report.pdf",
  pages: "8–9 (who we are and where we work) + imprint",
  asOf: "2025 (report published Apr 2026)",
  coordinatePrecision:
    "City/locality centroids geocoded from place names in the report — not verified street addresses or building footprints.",
} as const;

/** Marker fill by office type (legend + map HTML markers). */
export const SUDAN_NRC_OFFICE_COLORS: Record<SudanNrcOfficeType, string> = {
  country_office: "#0B3D5C",
  area_office: "#C45C26",
  field_office: "#2F8ABE",
  /** Bright yellow — must stay distinct from terracotta area-office. */
  planned_or_expansion: "#EAB308",
  former_country_office: "#737373",
};

/** Stable legend / filter order for office types. */
export const SUDAN_NRC_OFFICE_TYPE_ORDER = [
  "country_office",
  "area_office",
  "field_office",
  "planned_or_expansion",
  "former_country_office",
] as const satisfies readonly SudanNrcOfficeType[];

export const SUDAN_NRC_OFFICES: SudanNrcOffice[] = [
  {
    id: "port-sudan-co",
    name: "Port Sudan Country Office",
    city: "Port Sudan",
    state: "Red Sea",
    officeType: "country_office",
    areaOffice: null,
    status: "active",
    address: "Hai Almattar, Square 1, Port Sudan, Red Sea, Sudan",
    notes: "Formal country office imprint address; pin is Port Sudan city centroid.",
    latitude: 19.61922,
    longitude: 37.21171,
  },
  {
    id: "el-geneina-ao",
    name: "El Geneina Area Office",
    city: "El Geneina",
    state: "West Darfur",
    officeType: "area_office",
    areaOffice: "West and Central Darfur",
    status: "active",
    address: null,
    notes: "Area office for West and Central Darfur AO.",
    latitude: 13.44202,
    longitude: 22.44598,
  },
  {
    id: "zalingei-fo",
    name: "Zalingei Field Office",
    city: "Zalingei",
    state: "Central Darfur",
    officeType: "field_office",
    areaOffice: "West and Central Darfur",
    status: "active",
    address: null,
    notes: "Field office under West and Central Darfur AO.",
    latitude: 12.91341,
    longitude: 23.47381,
  },
  {
    id: "kreinik-fo",
    name: "Kreinik Field Office",
    city: "Kreinik",
    state: "West Darfur",
    officeType: "field_office",
    areaOffice: "West and Central Darfur",
    status: "active",
    address: null,
    notes: "Field office under West and Central Darfur AO. Geocoded as Kirendik/كرينك locality.",
    latitude: 13.2287187,
    longitude: 22.8250763,
  },
  {
    id: "gedaref-ao",
    name: "Gedaref Area Office",
    city: "Gedaref",
    state: "Gedaref",
    officeType: "area_office",
    areaOffice: "Nile",
    status: "active",
    address: null,
    notes: "Nile AO area office (East+Central merger, Jul 2024).",
    latitude: 14.04094,
    longitude: 35.39883,
  },
  {
    id: "kosti-fo",
    name: "Kosti Field Office",
    city: "Kosti",
    state: "White Nile",
    officeType: "field_office",
    areaOffice: "Nile",
    status: "active",
    address: null,
    notes: "Field office under Nile AO.",
    latitude: 12.6457,
    longitude: 32.23388,
  },
  {
    id: "kauda-ao",
    name: "Kauda Area Office",
    city: "Kauda",
    state: "South Kordofan",
    officeType: "area_office",
    areaOffice: "Kordofan",
    status: "active",
    address: null,
    notes: "Kordofan AO area office.",
    latitude: 11.09227,
    longitude: 30.56418,
  },
  {
    id: "kadugli-fo",
    name: "Kadugli Field Office",
    city: "Kadugli",
    state: "South Kordofan",
    officeType: "field_office",
    areaOffice: "Kordofan",
    status: "active",
    address: null,
    notes: "Field office under Kordofan AO.",
    latitude: 11.00859,
    longitude: 29.71558,
  },
  {
    id: "al-liri-fo",
    name: "Al Liri Field Presence",
    city: "Al Liri",
    state: "South Kordofan",
    officeType: "field_office",
    areaOffice: "Kordofan",
    status: "active",
    address: null,
    notes: "Shown on AR 2025 ops map under Kordofan cluster.",
    latitude: 10.25711,
    longitude: 30.68499,
  },
  {
    id: "tawila-ao",
    name: "Tawila Area Hub",
    city: "Tawila",
    state: "North Darfur",
    officeType: "area_office",
    areaOffice: "Jebel Marra and North Darfur",
    status: "active",
    address: null,
    notes: "Office opened Jan 2025; AO separated Feb 2025. Pin is Tawila city centroid.",
    latitude: 13.51387,
    longitude: 24.86123,
  },
  {
    id: "nyala-ao",
    name: "Nyala Area Office",
    city: "Nyala",
    state: "South Darfur",
    officeType: "area_office",
    areaOffice: "South Darfur",
    status: "active",
    address: null,
    notes: "South Darfur became a separate AO in 2025.",
    latitude: 12.01067,
    longitude: 24.81641,
  },
  {
    id: "el-fasher-fo",
    name: "El Fasher Field Office",
    city: "El Fasher",
    state: "North Darfur",
    officeType: "field_office",
    areaOffice: "Jebel Marra and North Darfur",
    status: "hibernating_remote",
    address: null,
    notes: "AR 2024: hibernation with remote partnerships; AR 2025 remote assistance until city takeover.",
    latitude: 13.62382,
    longitude: 25.35556,
  },
  {
    id: "atbara-expansion",
    name: "Atbara (expansion)",
    city: "Atbara",
    state: "River Nile",
    officeType: "planned_or_expansion",
    areaOffice: "Nile",
    status: "expansion",
    address: null,
    notes: "Labeled on AR 2025 ops map near Nile / Port Sudan corridor.",
    latitude: 17.69072,
    longitude: 33.98073,
  },
  {
    id: "khartoum-former",
    name: "Khartoum (former country office)",
    city: "Khartoum",
    state: "Khartoum",
    officeType: "former_country_office",
    areaOffice: null,
    status: "relocated",
    address: "Al Nile Tower, Khartoum (pre-war imprint)",
    notes: "Pre-April 2023 country office; relocated to Port Sudan.",
    latitude: 15.5636,
    longitude: 32.53491,
  },
];
