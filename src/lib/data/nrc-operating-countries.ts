/**
 * Countries where NRC runs a country office, for the Overview world map.
 *
 * PUBLIC DATA ONLY. This repo is public, so nothing here may come from
 * NRC's internal country office fact sheet beyond which countries NRC
 * operates in (public knowledge). No staff, people-reached, budget or
 * donor figures, ever.
 *
 * - Membership: countries with an active country office in NRC's latest
 *   internal reporting period (2026 T1). Countries NRC has exited are left
 *   out.
 * - `pinLngLat` / `pinCity`: the capital's city centroid, NOT a surveyed
 *   office address. Exception: Sudan pins Port Sudan, where the country
 *   office moved (NRC Sudan Annual Report 2025, see sudan-nrc-offices.ts).
 * - `bbox` ([west, south, east, north]) frames the country on click. From
 *   Natural Earth 1:50m admin-0 boundaries (public domain), ignoring
 *   outlying islands smaller than 5% of the mainland (e.g. Galápagos).
 *   Somalia includes Somaliland.
 */

export interface NrcOperatingCountry {
  /** ISO 3166-1 alpha-2, matching Mapbox country-boundaries `iso_3166_1`. */
  iso2: string;
  /** ISO 3166-1 alpha-3, the key for INFORM, ACAPS and HDX HAPI. */
  iso3: string;
  name: string;
  pinCity: string;
  pinLngLat: [number, number];
  bbox: [number, number, number, number];
}

export const NRC_OPERATING_COUNTRIES: readonly NrcOperatingCountry[] = [
  { iso2: "AF", iso3: "AFG", name: "Afghanistan", pinCity: "Kabul", pinLngLat: [69.2075, 34.5553], bbox: [60.49, 29.39, 74.89, 38.46] },
  { iso2: "BD", iso3: "BGD", name: "Bangladesh", pinCity: "Dhaka", pinLngLat: [90.4125, 23.8103], bbox: [88.02, 20.79, 92.63, 26.57] },
  { iso2: "BF", iso3: "BFA", name: "Burkina Faso", pinCity: "Ouagadougou", pinLngLat: [-1.5616, 12.2383], bbox: [-5.52, 9.42, 2.39, 15.08] },
  { iso2: "CM", iso3: "CMR", name: "Cameroon", pinCity: "Yaoundé", pinLngLat: [11.5021, 3.848], bbox: [8.53, 1.68, 16.18, 13.08] },
  { iso2: "CF", iso3: "CAF", name: "Central African Republic", pinCity: "Bangui", pinLngLat: [18.5582, 4.3947], bbox: [14.43, 2.27, 27.4, 11.0] },
  { iso2: "TD", iso3: "TCD", name: "Chad", pinCity: "N'Djamena", pinLngLat: [15.0557, 12.1348], bbox: [13.45, 7.48, 23.98, 23.45] },
  { iso2: "CO", iso3: "COL", name: "Colombia", pinCity: "Bogotá", pinLngLat: [-74.0721, 4.711], bbox: [-79.03, -4.24, -66.88, 12.43] },
  { iso2: "CD", iso3: "COD", name: "Democratic Republic of the Congo", pinCity: "Kinshasa", pinLngLat: [15.2663, -4.4419], bbox: [12.21, -13.45, 31.27, 5.31] },
  { iso2: "DJ", iso3: "DJI", name: "Djibouti", pinCity: "Djibouti City", pinLngLat: [43.1456, 11.5886], bbox: [41.76, 10.94, 43.41, 12.71] },
  { iso2: "EC", iso3: "ECU", name: "Ecuador", pinCity: "Quito", pinLngLat: [-78.4678, -0.1807], bbox: [-80.96, -4.99, -75.25, 1.46] },
  { iso2: "SV", iso3: "SLV", name: "El Salvador", pinCity: "San Salvador", pinLngLat: [-89.2182, 13.6929], bbox: [-90.11, 13.16, -87.72, 14.43] },
  { iso2: "ET", iso3: "ETH", name: "Ethiopia", pinCity: "Addis Ababa", pinLngLat: [38.7469, 9.032], bbox: [33.0, 3.46, 47.98, 14.85] },
  { iso2: "GT", iso3: "GTM", name: "Guatemala", pinCity: "Guatemala City", pinLngLat: [-90.5069, 14.6349], bbox: [-92.24, 13.74, -88.23, 17.82] },
  { iso2: "HN", iso3: "HND", name: "Honduras", pinCity: "Tegucigalpa", pinLngLat: [-87.1921, 14.0723], bbox: [-89.36, 12.98, -83.16, 16.02] },
  { iso2: "IR", iso3: "IRN", name: "Iran", pinCity: "Tehran", pinLngLat: [51.389, 35.6892], bbox: [44.02, 25.1, 63.31, 39.77] },
  { iso2: "IQ", iso3: "IRQ", name: "Iraq", pinCity: "Baghdad", pinLngLat: [44.3615, 33.3128], bbox: [38.77, 29.06, 48.55, 37.37] },
  { iso2: "JO", iso3: "JOR", name: "Jordan", pinCity: "Amman", pinLngLat: [35.9284, 31.9454], bbox: [34.95, 29.19, 39.29, 33.37] },
  { iso2: "KE", iso3: "KEN", name: "Kenya", pinCity: "Nairobi", pinLngLat: [36.8219, -1.2921], bbox: [33.9, -4.69, 41.88, 5.49] },
  { iso2: "LB", iso3: "LBN", name: "Lebanon", pinCity: "Beirut", pinLngLat: [35.5018, 33.8938], bbox: [35.11, 33.08, 36.58, 34.68] },
  { iso2: "LY", iso3: "LBY", name: "Libya", pinCity: "Tripoli", pinLngLat: [13.1913, 32.8872], bbox: [9.31, 19.5, 25.15, 33.18] },
  { iso2: "ML", iso3: "MLI", name: "Mali", pinCity: "Bamako", pinLngLat: [-8.0029, 12.6392], bbox: [-12.28, 10.14, 4.23, 25.0] },
  { iso2: "MX", iso3: "MEX", name: "Mexico", pinCity: "Mexico City", pinLngLat: [-99.1332, 19.4326], bbox: [-117.13, 14.55, -86.77, 32.72] },
  { iso2: "MD", iso3: "MDA", name: "Moldova", pinCity: "Chișinău", pinLngLat: [28.8638, 47.0105], bbox: [26.62, 45.45, 30.13, 48.48] },
  { iso2: "MZ", iso3: "MOZ", name: "Mozambique", pinCity: "Maputo", pinLngLat: [32.5732, -25.9692], bbox: [30.22, -26.86, 40.84, -10.46] },
  { iso2: "MM", iso3: "MMR", name: "Myanmar", pinCity: "Naypyidaw", pinLngLat: [96.0785, 19.7633], bbox: [92.18, 10.03, 101.15, 28.52] },
  { iso2: "NE", iso3: "NER", name: "Niger", pinCity: "Niamey", pinLngLat: [2.1098, 13.5137], bbox: [0.16, 11.7, 15.96, 23.52] },
  { iso2: "NG", iso3: "NGA", name: "Nigeria", pinCity: "Abuja", pinLngLat: [7.3986, 9.0765], bbox: [2.69, 4.28, 14.63, 13.87] },
  { iso2: "PS", iso3: "PSE", name: "Palestine", pinCity: "Ramallah", pinLngLat: [35.2034, 31.9038], bbox: [34.2, 31.21, 35.57, 32.53] },
  { iso2: "PA", iso3: "PAN", name: "Panama", pinCity: "Panama City", pinLngLat: [-79.4029, 9.1012], bbox: [-83.03, 7.22, -77.2, 9.6] },
  { iso2: "SO", iso3: "SOM", name: "Somalia", pinCity: "Mogadishu", pinLngLat: [45.3182, 2.0469], bbox: [40.96, -1.7, 51.39, 11.98] },
  { iso2: "SS", iso3: "SSD", name: "South Sudan", pinCity: "Juba", pinLngLat: [31.5713, 4.8594], bbox: [24.15, 3.49, 35.27, 12.22] },
  { iso2: "SD", iso3: "SDN", name: "Sudan", pinCity: "Port Sudan", pinLngLat: [37.21171, 19.61922], bbox: [21.83, 8.67, 38.61, 22.2] },
  { iso2: "SY", iso3: "SYR", name: "Syria", pinCity: "Damascus", pinLngLat: [36.2765, 33.5138], bbox: [35.76, 32.32, 42.36, 37.3] },
  { iso2: "UG", iso3: "UGA", name: "Uganda", pinCity: "Kampala", pinLngLat: [32.5825, 0.3476], bbox: [29.56, -1.47, 34.98, 4.22] },
  { iso2: "UA", iso3: "UKR", name: "Ukraine", pinCity: "Kyiv", pinLngLat: [30.5234, 50.4501], bbox: [22.13, 45.23, 40.13, 52.35] },
  { iso2: "VE", iso3: "VEN", name: "Venezuela", pinCity: "Caracas", pinLngLat: [-66.9036, 10.4806], bbox: [-73.37, 0.69, -59.83, 12.18] },
  { iso2: "YE", iso3: "YEM", name: "Yemen", pinCity: "Sana'a", pinLngLat: [44.191, 15.3694], bbox: [42.66, 12.61, 53.09, 19.0] },
];

export function nrcOperatingCountry(iso2: string | null | undefined): NrcOperatingCountry | undefined {
  if (!iso2) return undefined;
  const upper = iso2.toUpperCase();
  return NRC_OPERATING_COUNTRIES.find((c) => c.iso2 === upper);
}

/** Rectangle polygon for a country's bbox, for map framing (never painted). */
export function bboxPolygon([w, s, e, n]: NrcOperatingCountry["bbox"]) {
  return {
    type: "Polygon" as const,
    coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
  };
}
