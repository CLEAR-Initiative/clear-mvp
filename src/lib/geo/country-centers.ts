/**
 * Approximate centres ([lon, lat]) of countries people flee to from the
 * countries CLEAR covers. Only the direction matters: the Displacement map
 * points an arrow from the analysed country towards the destination. Most of
 * these countries are not locations in clear-api, so they have no geometry.
 */
const CENTERS: Record<string, [number, number]> = {
  // Sudan
  chad: [18.7, 15.5],
  "south sudan": [30.2, 7.3],
  egypt: [30.8, 26.8],
  libya: [17.2, 26.3],
  ethiopia: [40.5, 9.1],
  eritrea: [39.8, 15.2],
  "central african republic": [20.9, 6.6],
  uganda: [32.3, 1.4],
  kenya: [37.9, 0.0],
  "saudi arabia": [45.1, 23.9],
  // Afghanistan
  pakistan: [69.3, 30.4],
  iran: [53.7, 32.4],
  tajikistan: [71.3, 38.9],
  turkmenistan: [59.6, 38.9],
  uzbekistan: [64.6, 41.4],
  turkey: [35.2, 39.0],
  germany: [10.5, 51.2],
  // Venezuela
  colombia: [-74.3, 4.6],
  brazil: [-51.9, -14.2],
  peru: [-75.0, -9.2],
  ecuador: [-78.2, -1.8],
  chile: [-71.5, -35.7],
  guyana: [-58.9, 4.9],
  "trinidad and tobago": [-61.2, 10.7],
  panama: [-80.8, 8.5],
  argentina: [-63.6, -38.4],
  spain: [-3.7, 40.5],
  "united states": [-98.6, 39.8],
};

const ALIASES: Record<string, string> = {
  "republic of south sudan": "south sudan",
  car: "central african republic",
  türkiye: "turkey",
  turkiye: "turkey",
  usa: "united states",
  "united states of america": "united states",
};

/** The centre of a destination country by name, or null when it is not listed. */
export function countryCenter(name: string | null | undefined): [number, number] | null {
  const key = name?.trim().toLowerCase();
  if (!key) return null;
  return CENTERS[ALIASES[key] ?? key] ?? null;
}
