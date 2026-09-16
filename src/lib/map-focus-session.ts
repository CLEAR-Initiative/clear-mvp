/**
 * In-session solo-focus context for map ↔ Insights ↔ Map-tab round-trips.
 *
 * Survives bare `/map` (sidebar Map tab) and drives Insights → crisis detail
 * when a crisis chip is still active. Session-only (same tab), like map-view-state.
 */

import { mapFocusHref, type MapFocusKind } from "~/lib/map-focus-href";

export const MAP_FOCUS_SESSION_STORAGE_KEY = "clear.map.focusSession.v1";

export type MapEntityFocusSession = {
  kind: MapFocusKind;
  id: string;
  label?: string;
};

export type MapPlaceFocusSession = {
  kind: "place";
  id: string;
  label: string;
  center: [number, number];
  zoom: number;
};

export type MapFocusSession = MapEntityFocusSession | MapPlaceFocusSession;

export type MapFocusSessionStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function defaultSessionStorage(): MapFocusSessionStorage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

function isFocusKind(v: unknown): v is MapFocusKind {
  return v === "event" || v === "signal" || v === "crisis";
}

export function parseMapFocusSession(raw: unknown): MapFocusSession | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.kind === "place") {
    const center = o.center;
    if (
      typeof o.id !== "string" ||
      !o.id ||
      typeof o.label !== "string" ||
      !o.label.trim() ||
      !Array.isArray(center) ||
      center.length !== 2 ||
      typeof center[0] !== "number" ||
      typeof center[1] !== "number" ||
      typeof o.zoom !== "number" ||
      !Number.isFinite(o.zoom)
    ) {
      return null;
    }
    return {
      kind: "place",
      id: o.id,
      label: o.label.trim(),
      center: [center[0], center[1]],
      zoom: o.zoom,
    };
  }
  if (!isFocusKind(o.kind) || typeof o.id !== "string" || !o.id) return null;
  const label =
    typeof o.label === "string" && o.label.trim() ? o.label.trim() : undefined;
  return { kind: o.kind, id: o.id, ...(label ? { label } : {}) };
}

export function writeMapFocusSession(
  session: MapFocusSession,
  storage: MapFocusSessionStorage | null | undefined = defaultSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(MAP_FOCUS_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* private mode / quota */
  }
}

export function readMapFocusSession(
  storage: MapFocusSessionStorage | null | undefined = defaultSessionStorage(),
): MapFocusSession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(MAP_FOCUS_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return parseMapFocusSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function clearMapFocusSession(
  storage: MapFocusSessionStorage | null | undefined = defaultSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(MAP_FOCUS_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Sidebar Map tab — keep entity focus query when a session chip is active. */
export function mapNavHrefFromFocusSession(
  session: MapFocusSession | null,
): string {
  if (!session || session.kind === "place") return "/map";
  return mapFocusHref(session.kind, session.id);
}

/** Sidebar Insights — return to the focused crisis detail when still active. */
export function insightsNavHrefFromFocusSession(
  session: MapFocusSession | null,
): string {
  if (session?.kind === "crisis") {
    return `/crisis/${encodeURIComponent(session.id)}`;
  }
  return "/insights";
}
