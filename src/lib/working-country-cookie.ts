/**
 * Working country cookie — one L0 location per team.
 *
 * Client-readable (not httpOnly) so Map / Detection / Overview / Insights
 * can frame the last country before team bindings finish loading.
 */

export const WORKING_COUNTRY_COOKIE = "clear-working-country";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type WorkingCountryEntry = {
  id: string;
  name: string;
};

/** Per-team working country: `{ [teamId]: { id, name } }`. */
export type WorkingCountryMap = Record<string, WorkingCountryEntry>;

function asEntry(value: unknown): WorkingCountryEntry | null {
  if (typeof value === "string" && value.trim()) {
    return { id: value.trim(), name: "" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rec = value as { id?: unknown; name?: unknown };
  if (typeof rec.id !== "string" || !rec.id.trim()) return null;
  return {
    id: rec.id.trim(),
    name: typeof rec.name === "string" ? rec.name : "",
  };
}

function parseJsonMap(value: string): WorkingCountryMap {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const map: WorkingCountryMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      const entry = asEntry(v);
      if (entry) map[k] = entry;
    }
    return map;
  } catch {
    return {};
  }
}

export function parseWorkingCountryCookie(value: string | undefined): WorkingCountryMap {
  if (!value) return {};
  const direct = parseJsonMap(value);
  if (Object.keys(direct).length > 0) return direct;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) return parseJsonMap(decoded);
  } catch {
    /* ignore */
  }
  return {};
}

/** SSR cookie plus a synchronous `document.cookie` read so the first
 *  client paint already knows Venezuela — no post-mount All Countries flash. */
export function initialWorkingCountryMap(ssrValue?: string): WorkingCountryMap {
  return {
    ...parseWorkingCountryCookie(ssrValue),
    ...readWorkingCountryCookieFromDocument(),
  };
}

export function serializeWorkingCountryCookie(map: WorkingCountryMap): string {
  return JSON.stringify(map);
}

export function readWorkingCountryCookieFromDocument(): WorkingCountryMap {
  if (typeof document === "undefined") return {};
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${WORKING_COUNTRY_COOKIE}=`))
    ?.slice(WORKING_COUNTRY_COOKIE.length + 1);
  if (!raw) return {};
  try {
    return parseWorkingCountryCookie(decodeURIComponent(raw));
  } catch {
    return parseWorkingCountryCookie(raw);
  }
}

export function setWorkingCountryCookie(teamId: string, entry: WorkingCountryEntry): void {
  if (typeof document === "undefined") return;
  const map = readWorkingCountryCookieFromDocument();
  map[teamId] = { id: entry.id, name: entry.name };
  document.cookie = `${WORKING_COUNTRY_COOKIE}=${encodeURIComponent(
    serializeWorkingCountryCookie(map),
  )}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function storedWorkingCountry(
  map: WorkingCountryMap,
  teamId: string | null,
): WorkingCountryEntry | null {
  if (teamId && map[teamId]) return map[teamId]!;
  const entries = Object.values(map);
  if (!teamId && entries.length === 1) return entries[0]!;
  return null;
}

/**
 * Working country for the picker / map frame.
 *
 * While scope is not ready, hold the cookie entry (name included) so a
 * reload cannot flash "All Countries" then land on Afghanistan.
 * Once bindings are known, honour a still-in-scope store; otherwise the
 * alphabetically first country.
 */
export function resolveWorkingCountry(
  countries: readonly { id: string; name: string }[],
  stored: WorkingCountryEntry | null,
  scopeReady: boolean,
): { id: string; name: string } | null {
  if (stored && (stored.id || stored.name) && !scopeReady) return stored;
  if (!scopeReady) return null;
  if (countries.length === 0) {
    // Unscoped: keep the last pick so a reload does not snap to All Countries.
    if (stored && stored.name && stored.name !== "All Countries") return stored;
    return null;
  }
  if (stored) {
    const byId = countries.find((c) => c.id === stored.id);
    if (byId) return byId;
    if (stored.name) {
      const byName = countries.find((c) => c.name === stored.name);
      if (byName) return byName;
    }
  }
  return countries[0] ?? null;
}
