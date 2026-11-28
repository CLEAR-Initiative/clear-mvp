/**
 * A point from text a person pastes or types: coordinates, or a map link that
 * carries them. Pure text work: a link is read, never fetched, so a short
 * link (which holds its point behind a redirect) gives no point.
 */

export type PastedPoint =
  /** The text holds a point. */
  | { kind: "point"; lat: number; lng: number }
  /** A short map link: its coordinates are behind a redirect. */
  | { kind: "short_link" }
  /** A link, or text written like coordinates, with no usable point. */
  | { kind: "no_coordinates" }
  /** Other text: a place name to search for. */
  | { kind: "none" };

const NUM = String.raw`\d+(?:\.\d+)?`;
const HEMI = "[NSEW]";

/** Coordinates are short. Longer text is not parsed as a pair, which also
 *  bounds the work of the patterns below on any clipboard content. */
const COORDINATE_TEXT_MAX = 100;

/** Between the two values: a comma or semicolon, or spaces alone. Each run of
 *  spaces has one way to match, so a long run cannot make the match slow. */
const PAIR_SEPARATOR = String.raw`(?:\s*[,;]\s*|\s+)`;

/** Two decimal numbers, each with an optional hemisphere letter:
 *  `11.78, 34.36`, `11.78 34.36`, `11.78N 34.36E`, `N 11.78, E 34.36`. */
const DECIMAL_PART = String.raw`(?:(${HEMI})\s*)?([+-]?${NUM})(?:\s*(${HEMI}))?`;
const DECIMAL_PAIR = new RegExp(String.raw`^${DECIMAL_PART}${PAIR_SEPARATOR}${DECIMAL_PART}$`, "i");

/** One coordinate in degrees with optional minutes and seconds:
 *  `11°46'48"N`, `11° 46.8' N`, `N 11.78°`. The degree sign is required. */
const DMS_PART = String.raw`(?:(${HEMI})\s*)?([+-]?${NUM})\s*°(?:\s*(${NUM})\s*')?(?:\s*(${NUM})\s*")?(?:\s*(${HEMI}))?`;
const DMS_PAIR = new RegExp(String.raw`^${DMS_PART}${PAIR_SEPARATOR}${DMS_PART}$`, "i");

/** Text made only of what coordinates are written with. */
const COORDINATE_LIKE = /^[\d\s.,;:°'"NSEW+-]+$/i;

const URL_IN_TEXT = /https?:\/\/[^\s<>"]+/i;
/** A map link pasted without its scheme. */
const BARE_MAP_LINK =
  /^(?:www\.)?(?:maps\.app\.goo\.gl|goo\.gl|maps\.google\.[a-z.]+|google\.[a-z.]+\/maps|openstreetmap\.org|osm\.org)\/\S*$/i;

function inRange(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

type Axis = "lat" | "lng";

function axisOf(letter: string | undefined): Axis | null {
  if (!letter) return null;
  return /[NS]/i.test(letter) ? "lat" : "lng";
}

/** A value with its hemisphere letter applied: S and W are negative. */
function signed(value: number, letter: string | undefined): number {
  if (!letter) return value;
  return /[SW]/i.test(letter) ? -Math.abs(value) : Math.abs(value);
}

/** Two values, in the order written, as a point. Hemisphere letters say which
 *  is which (`34.36E 11.78N`); with none, latitude is first. */
function toPoint(
  first: number,
  firstLetter: string | undefined,
  second: number,
  secondLetter: string | undefined,
): { lat: number; lng: number } | null {
  const a = axisOf(firstLetter);
  const b = axisOf(secondLetter);
  // Two letters of the same axis ("11N 34S") name no point.
  if (a && b && a === b) return null;
  const swapped = a === "lng" || b === "lat";
  const x = signed(first, firstLetter);
  const y = signed(second, secondLetter);
  const lat = swapped ? y : x;
  const lng = swapped ? x : y;
  return inRange(lat, lng) ? { lat: round6(lat), lng: round6(lng) } : null;
}

/** Typographic degree, minute and second marks as the plain ones. */
function plainMarks(text: string): string {
  return text
    .replace(/[º˚]/g, "°")
    .replace(/[′’‘ʹ]/g, "'")
    .replace(/[″”“ʺ]|''/g, '"');
}

/** Degrees, minutes and seconds as decimal degrees; null when the minutes or
 *  seconds are not below 60. */
function dmsValue(deg: string, min: string | undefined, sec: string | undefined): number | null {
  const m = min ? Number(min) : 0;
  const s = sec ? Number(sec) : 0;
  if (m >= 60 || s >= 60) return null;
  const d = Number(deg);
  const magnitude = Math.abs(d) + m / 60 + s / 3600;
  return d < 0 || Object.is(d, -0) || deg.trim().startsWith("-") ? -magnitude : magnitude;
}

/** Coordinates written as text, in decimal degrees or degrees-minutes-seconds. */
export function parseCoordinateText(input: string): { lat: number; lng: number } | null {
  const text = plainMarks(input).trim();
  if (!text || text.length > COORDINATE_TEXT_MAX) return null;

  const decimal = DECIMAL_PAIR.exec(text);
  if (decimal) {
    const [, pre1, n1, post1, pre2, n2, post2] = decimal;
    // A letter on both sides of one number ("N 11.78 N") is not a coordinate.
    if ((pre1 && post1) || (pre2 && post2)) return null;
    return toPoint(Number(n1), pre1 ?? post1, Number(n2), pre2 ?? post2);
  }

  const dms = DMS_PAIR.exec(text);
  if (dms) {
    const [, pre1, d1, m1, s1, post1, pre2, d2, m2, s2, post2] = dms;
    if ((pre1 && post1) || (pre2 && post2)) return null;
    const first = dmsValue(d1!, m1, s1);
    const second = dmsValue(d2!, m2, s2);
    if (first == null || second == null) return null;
    return toPoint(first, pre1 ?? post1, second, pre2 ?? post2);
  }
  return null;
}

function pair(lat: string | null | undefined, lng: string | null | undefined): { lat: number; lng: number } | null {
  if (lat == null || lng == null || lat.trim() === "" || lng.trim() === "") return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  return inRange(point.lat, point.lng) ? point : null;
}

function decoded(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

const SIGNED = String.raw`-?\d+(?:\.\d+)?`;
const GOOGLE_PIN = new RegExp(String.raw`!3d(${SIGNED})!4d(${SIGNED})`);
const GOOGLE_VIEW = new RegExp(String.raw`@(${SIGNED}),(${SIGNED})`);
const GOOGLE_PLACE_SEGMENT = /\/maps\/(?:place|search)\/([^/@?#]+)/;
const OSM_HASH = new RegExp(String.raw`map=\d+(?:\.\d+)?/(${SIGNED})/(${SIGNED})`);

/** A Google Maps link's point. The place's own pin comes before the middle of
 *  the view: `?q=lat,lng`, then `!3d<lat>!4d<lng>`, then coordinates in the
 *  path, then `@lat,lng`. A directions link holds a start, an end and the
 *  middle of the route: only a destination it names (`destination`, `daddr`)
 *  is a point, never its start or its view. */
function googlePoint(url: URL): { lat: number; lng: number } | null {
  const directions = /\/maps\/dir(?:\/|$)/.test(url.pathname) || url.searchParams.has("saddr") || url.searchParams.has("origin");
  for (const key of directions ? ["destination", "daddr"] : ["q", "query", "ll", "destination", "daddr", "center"]) {
    const value = url.searchParams.get(key);
    const point = value ? parseCoordinateText(value) : null;
    if (point) return point;
  }
  if (directions) return null;
  const rest = url.pathname + url.hash;
  const pin = GOOGLE_PIN.exec(rest);
  if (pin) {
    const point = pair(pin[1], pin[2]);
    if (point) return point;
  }
  const segment = GOOGLE_PLACE_SEGMENT.exec(url.pathname);
  if (segment) {
    const point = parseCoordinateText(decoded(segment[1]!.replace(/\+/g, " ")));
    if (point) return point;
  }
  const view = GOOGLE_VIEW.exec(rest);
  return view ? pair(view[1], view[2]) : null;
}

/** An OpenStreetMap link's point: its marker (`mlat`, `mlon`), else the middle
 *  of the view (`#map=zoom/lat/lng`). */
function osmPoint(url: URL): { lat: number; lng: number } | null {
  const marker = pair(url.searchParams.get("mlat"), url.searchParams.get("mlon"));
  if (marker) return marker;
  const view = OSM_HASH.exec(url.hash);
  if (view) return pair(view[1], view[2]);
  return pair(url.searchParams.get("lat"), url.searchParams.get("lon"));
}

function linkPoint(link: string): PastedPoint {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return { kind: "no_coordinates" };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const isOsm = host === "osm.org" || host === "openstreetmap.org" || host.endsWith(".openstreetmap.org");
  if (host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.co" || (isOsm && url.pathname.startsWith("/go/"))) {
    return { kind: "short_link" };
  }
  const isGoogle = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
  const point = isGoogle ? googlePoint(url) : isOsm ? osmPoint(url) : null;
  return point ? { kind: "point", ...point } : { kind: "no_coordinates" };
}

/**
 * What pasted or typed text gives the point picker: a point, a reason there is
 * none, or `none` for text that is a place name to search for.
 */
export function parsePastedPoint(input: string): PastedPoint {
  const text = input.trim();
  if (!text) return { kind: "none" };

  const link = URL_IN_TEXT.exec(text)?.[0] ?? (BARE_MAP_LINK.test(text) ? `https://${text}` : null);
  if (link) return linkPoint(link);

  const point = parseCoordinateText(text);
  if (point) return { kind: "point", ...point };

  // Numbers that give no point ("95, 200", or a half-typed pair) are not a
  // place name: say so instead of searching for them.
  const plain = plainMarks(text);
  if (plain.length >= 3 && /\d/.test(plain) && COORDINATE_LIKE.test(plain) && !/^[\d\s]+$/.test(plain)) {
    return { kind: "no_coordinates" };
  }
  return { kind: "none" };
}
