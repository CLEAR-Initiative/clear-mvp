/**
 * Deep links into the Map and Detection with filters, for Agent navigation.
 *
 * The Agent moves the user to `/map?country=…&region=…&timeframe=…` or
 * `/detection?country=…&region=…&date=…&severities=…&types=…&sources=…`. The
 * pages read these on load and they take precedence over stored state for
 * that visit only: a deep-linked country does not change the user's working
 * country, and picking anything in the page drops the parameters. Back
 * restores the exact previous URL.
 *
 * Pure functions, shared by the pages and the server-side navigate tool so
 * the URL the Agent builds is the URL the page reads.
 */

const MAX_TEXT = 120;
const MAX_LIST = 50;

export const MAP_TIMEFRAMES = ["7d", "30d", "90d", "all"] as const;
export type MapTimeframe = (typeof MAP_TIMEFRAMES)[number];

export interface MapDeepLink {
  /** Country name, as the Map's country picker shows it. */
  country?: string;
  /** Region name within the country. */
  region?: string;
  timeframe?: MapTimeframe;
}

export const DETECTION_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type DetectionSeverity = (typeof DETECTION_SEVERITIES)[number];

/** Detection's rolling windows; a calendar month is "Mon YYYY" (English). */
export const DETECTION_ROLLING_DATES = ["Last 7 days", "Last 30 days", "Last 90 days"] as const;
const MONTH_DATE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/;

export interface DetectionDeepLink {
  country?: string;
  /** Region location id. */
  region?: string;
  date?: string;
  severities?: DetectionSeverity[];
  /** Disaster type filters, as Detection's type picker keys them. */
  types?: string[];
  sources?: string[];
}

export const MAP_DEEP_LINK_PARAMS = ["country", "region", "timeframe"] as const;
export const DETECTION_DEEP_LINK_PARAMS = ["country", "region", "date", "severities", "types", "sources"] as const;

type Params = Pick<URLSearchParams, "get">;

function text(params: Params, key: string): string | undefined {
  const value = params.get(key)?.trim();
  return value && value.length <= MAX_TEXT ? value : undefined;
}

function list(params: Params, key: string): string[] | undefined {
  const raw = params.get(key);
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v && v.length <= MAX_TEXT)
    .slice(0, MAX_LIST);
  return values.length ? values : undefined;
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export function readMapDeepLink(params: Params): MapDeepLink {
  const timeframe = params.get("timeframe");
  return compact({
    country: text(params, "country"),
    region: text(params, "region"),
    timeframe: (MAP_TIMEFRAMES as readonly string[]).includes(timeframe ?? "")
      ? (timeframe as MapTimeframe)
      : undefined,
  });
}

export function readDetectionDeepLink(params: Params): DetectionDeepLink {
  const date = text(params, "date");
  const severities = list(params, "severities")?.filter((s): s is DetectionSeverity =>
    (DETECTION_SEVERITIES as readonly string[]).includes(s),
  );
  return compact({
    country: text(params, "country"),
    region: text(params, "region"),
    date:
      date && ((DETECTION_ROLLING_DATES as readonly string[]).includes(date) || MONTH_DATE.test(date))
        ? date
        : undefined,
    severities: severities?.length ? severities : undefined,
    types: list(params, "types"),
    sources: list(params, "sources"),
  });
}

export function hasDeepLink(link: object): boolean {
  return Object.keys(link).length > 0;
}

function query(entries: Array<[string, string | string[] | undefined]>): string {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value === undefined) continue;
    const joined = Array.isArray(value) ? value.join(",") : value;
    if (joined) params.set(key, joined);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function mapDeepLinkHref(link: MapDeepLink): string {
  return `/map${query([
    ["country", link.country],
    ["region", link.region],
    ["timeframe", link.timeframe],
  ])}`;
}

export function detectionDeepLinkHref(link: DetectionDeepLink): string {
  return `/detection${query([
    ["country", link.country],
    ["region", link.region],
    ["date", link.date],
    ["severities", link.severities],
    ["types", link.types],
    ["sources", link.sources],
  ])}`;
}

/** The current query without the deep-link parameters (the user took over). */
export function withoutDeepLink(params: URLSearchParams, keys: readonly string[]): string {
  const next = new URLSearchParams(params.toString());
  for (const key of keys) next.delete(key);
  const s = next.toString();
  return s ? `?${s}` : "";
}
