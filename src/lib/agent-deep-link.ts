/**
 * Deep links into the Map and Detection with filters, for Agent navigation.
 *
 * The Agent moves the user to `/map?countryId=…&regionId=…&timeframe=…` or
 * `/detection?countryId=…&regionId=…&date=…&severities=…`. Places travel as
 * location ids, never names: the page maps an id to the name it shows from
 * its own locations tree, so a link can't drift from the page over a locale
 * or a translation, and a region can't be mistaken for a same-named one in
 * another country. `countryId=all` means all countries.
 *
 * `countryId` stays in the URL as the visit's override (it never changes the
 * user's working country); the other parameters are applied once and taken
 * out of the URL, after which they are the page's ordinary filter state.
 * Back restores the exact previous URL.
 *
 * Pure functions, shared by the pages and the server-side navigate tool so
 * the URL the Agent builds is the URL the page reads.
 */

import { ID_PATTERN } from "~/lib/agent-current-view-contract";
import { ALL_COUNTRIES } from "~/lib/constants/country-config";

/** `countryId` for "all countries". */
export const ALL_COUNTRIES_LINK = "all";

export const MAP_TIMEFRAMES = ["7d", "30d", "90d", "all"] as const;
export type MapTimeframe = (typeof MAP_TIMEFRAMES)[number];

export interface MapDeepLink {
  /** Country location id, or `all`. */
  countryId?: string;
  /** Region (state) location id within that country. */
  regionId?: string;
  timeframe?: MapTimeframe;
}

export const DETECTION_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type DetectionSeverity = (typeof DETECTION_SEVERITIES)[number];

/** Detection's rolling windows; a calendar month is "Mon YYYY" (English). */
export const DETECTION_ROLLING_DATES = ["Last 7 days", "Last 30 days", "Last 90 days"] as const;
const MONTH_DATE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/;

export interface DetectionDeepLink {
  /** Country location id, or `all`. */
  countryId?: string;
  /** Region (state) location id within that country. */
  regionId?: string;
  date?: string;
  severities?: DetectionSeverity[];
}

export const MAP_DEEP_LINK_PARAMS = ["countryId", "regionId", "timeframe"] as const;
export const DETECTION_DEEP_LINK_PARAMS = ["countryId", "regionId", "date", "severities"] as const;
/** Applied once, then taken out of the URL (`countryId` stays). */
export const MAP_ONE_SHOT_PARAMS = ["regionId", "timeframe"] as const;
export const DETECTION_ONE_SHOT_PARAMS = ["regionId", "date", "severities"] as const;

type Params = Pick<URLSearchParams, "get">;

function id(params: Params, key: string): string | undefined {
  const value = params.get(key)?.trim();
  return value && ID_PATTERN.test(value) ? value : undefined;
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

export function readMapDeepLink(params: Params): MapDeepLink {
  const timeframe = params.get("timeframe");
  return compact({
    countryId: id(params, "countryId"),
    regionId: id(params, "regionId"),
    timeframe: (MAP_TIMEFRAMES as readonly string[]).includes(timeframe ?? "")
      ? (timeframe as MapTimeframe)
      : undefined,
  });
}

export function readDetectionDeepLink(params: Params): DetectionDeepLink {
  const date = params.get("date")?.trim();
  const severities = params
    .get("severities")
    ?.split(",")
    .map((s) => s.trim())
    .filter((s): s is DetectionSeverity => (DETECTION_SEVERITIES as readonly string[]).includes(s));
  return compact({
    countryId: id(params, "countryId"),
    regionId: id(params, "regionId"),
    date:
      date && ((DETECTION_ROLLING_DATES as readonly string[]).includes(date) || MONTH_DATE.test(date))
        ? date
        : undefined,
    severities: severities?.length ? [...new Set(severities)] : undefined,
  });
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
    ["countryId", link.countryId],
    ["regionId", link.regionId],
    ["timeframe", link.timeframe],
  ])}`;
}

export function detectionDeepLinkHref(link: DetectionDeepLink): string {
  return `/detection${query([
    ["countryId", link.countryId],
    ["regionId", link.regionId],
    ["date", link.date],
    ["severities", link.severities],
  ])}`;
}

/** The current query without these parameters. */
export function withoutDeepLink(params: URLSearchParams, keys: readonly string[]): string {
  const next = new URLSearchParams(params.toString());
  for (const key of keys) next.delete(key);
  const s = next.toString();
  return s ? `?${s}` : "";
}

/** What the page makes of a deep link's place, given its locations tree and team scope. */
export type LinkScope =
  /** No `countryId`. */
  | { status: "none" }
  /** Team scope or the locations tree isn't loaded yet. */
  | { status: "pending" }
  /** The page can't show it: unknown id, or outside the active team's scope. */
  | { status: "refused"; country?: string }
  /** Show `country` (a picker name, or All Countries), and `region` if the link named one in it. */
  | { status: "honoured"; country: string; region?: { id: string; name: string } };

interface ScopeTreeCountry {
  id: string;
  name: string;
  states: ReadonlyArray<{ id: string; name: string }>;
}

export function resolveLinkScope({
  countryId,
  regionId,
  tree,
  teamCountryNames,
  scopeReady,
}: {
  countryId: string | undefined;
  regionId: string | undefined;
  tree: readonly ScopeTreeCountry[];
  /** The active team's country bindings; empty means global monitoring. */
  teamCountryNames: readonly string[];
  scopeReady: boolean;
}): LinkScope {
  if (!countryId) return { status: "none" };
  if (!scopeReady || tree.length === 0) return { status: "pending" };
  if (countryId === ALL_COUNTRIES_LINK) {
    // A team pinned to one country has no "all": its one country is all it sees.
    return { status: "honoured", country: teamCountryNames.length === 1 ? teamCountryNames[0]! : ALL_COUNTRIES };
  }
  const country = tree.find((c) => c.id === countryId);
  if (!country) return { status: "refused" };
  if (teamCountryNames.length > 0 && !teamCountryNames.includes(country.name)) {
    return { status: "refused", country: country.name };
  }
  const region = regionId ? country.states.find((s) => s.id === regionId) : undefined;
  return {
    status: "honoured",
    country: country.name,
    ...(region ? { region: { id: region.id, name: region.name } } : {}),
  };
}
