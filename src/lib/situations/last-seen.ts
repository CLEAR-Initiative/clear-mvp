import { NEW_FALLBACK_MS, OVERVIEW_LAST_SEEN_KEY } from "./types";

/** Read Overview last-seen ISO string from localStorage (null if missing/invalid). */
export function readOverviewLastSeen(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined" ? window.localStorage : null,
): string | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(OVERVIEW_LAST_SEEN_KEY);
    if (!raw) return null;
    const t = Date.parse(raw);
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  } catch {
    return null;
  }
}

/** Persist Overview last-seen as ISO now (or provided time). */
export function writeOverviewLastSeen(
  now: Date = new Date(),
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined" ? window.localStorage : null,
): string {
  const iso = now.toISOString();
  if (storage) {
    try {
      storage.setItem(OVERVIEW_LAST_SEEN_KEY, iso);
    } catch {
      // Quota / private mode — ignore; next visit falls back to 24h.
    }
  }
  return iso;
}

/**
 * Effective cutoff for “new since last visit”.
 * Missing last-seen → now − 24h.
 */
export function newnessCutoff(
  lastSeenAt: string | null,
  now: Date = new Date(),
  fallbackMs: number = NEW_FALLBACK_MS,
): Date {
  if (lastSeenAt) {
    const t = Date.parse(lastSeenAt);
    if (Number.isFinite(t)) return new Date(t);
  }
  return new Date(now.getTime() - fallbackMs);
}
