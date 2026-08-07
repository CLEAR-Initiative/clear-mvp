/**
 * Pure prev/next helpers for detail / marker list navigation.
 * Shared by event detail, signal detail, and map marker panels.
 */

export interface ListNavState {
  prevId: string | null;
  nextId: string | null;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  /** e.g. "3 / 47", or "—" when current id is not in the list */
  position: string;
}

/**
 * Step one slot in an ordered id list. Used by keyboard scrub so key-repeat
 * can advance without waiting on React-rendered neighbor ids.
 */
export function stepListId(
  ids: readonly string[],
  currentId: string,
  delta: -1 | 1,
): string | null {
  const i = ids.indexOf(currentId);
  if (i < 0) return null;
  const next = i + delta;
  if (next < 0 || next >= ids.length) return null;
  return ids[next] ?? null;
}

/** Resolve adjacent ids and chrome for a string-keyed ordered list. */
export function getListNavigation(
  ids: readonly string[],
  currentId: string,
): ListNavState {
  const totalCount = ids.length;
  const currentIndex = ids.indexOf(currentId);

  if (currentIndex < 0) {
    return {
      prevId: null,
      nextId: null,
      hasPrev: false,
      hasNext: false,
      currentIndex: -1,
      totalCount,
      position: "—",
    };
  }

  const prevId = currentIndex > 0 ? (ids[currentIndex - 1] ?? null) : null;
  const nextId =
    currentIndex < totalCount - 1 ? (ids[currentIndex + 1] ?? null) : null;

  return {
    prevId,
    nextId,
    hasPrev: prevId != null,
    hasNext: nextId != null,
    currentIndex,
    totalCount,
    position: `${currentIndex + 1} / ${totalCount}`,
  };
}

/**
 * Adjacent items in an ordered list keyed by an arbitrary id extractor.
 * Returns null neighbors at boundaries; safe for empty / singleton lists.
 */
export function getAdjacentItem<T>(
  items: readonly T[],
  currentKey: string | number,
  getKey: (item: T) => string | number,
): { prev: T | null; next: T | null; currentIndex: number; totalCount: number } {
  const totalCount = items.length;
  const currentIndex = items.findIndex((item) => getKey(item) === currentKey);

  if (currentIndex < 0) {
    return { prev: null, next: null, currentIndex: -1, totalCount };
  }

  return {
    prev: currentIndex > 0 ? (items[currentIndex - 1] ?? null) : null,
    next:
      currentIndex < totalCount - 1 ? (items[currentIndex + 1] ?? null) : null,
    currentIndex,
    totalCount,
  };
}

export interface GeoPoint {
  lng: number;
  lat: number;
}

/** Squared planar distance — fine for local marker proximity ordering. */
export function geoDistance2(a: GeoPoint, b: GeoPoint): number {
  const dLng = a.lng - b.lng;
  const dLat = a.lat - b.lat;
  return dLng * dLng + dLat * dLat;
}

/**
 * Order markers for map panel arrow nav: origin first, then everyone else by
 * distance to that origin (nearest → farthest). Nearby clusters are exhausted
 * before jumping to distant markers. Freeze this list while stepping.
 */
export function orderByProximityTo<T extends GeoPoint>(
  items: readonly T[],
  originKey: string | number,
  getKey: (item: T) => string | number,
): T[] {
  const origin = items.find((item) => getKey(item) === originKey);
  if (!origin) return [...items];

  const others = items.filter((item) => getKey(item) !== originKey);
  others.sort((a, b) => {
    const da = geoDistance2(origin, a);
    const db = geoDistance2(origin, b);
    if (da !== db) return da - db;
    // Stable tie-break so equal coords don't reshuffle.
    const ka = String(getKey(a));
    const kb = String(getKey(b));
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  return [origin, ...others];
}

/** True when keyboard arrows should not hijack typing / form focus. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return target.closest("[contenteditable]") != null;
}
