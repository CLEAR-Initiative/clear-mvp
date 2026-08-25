/**
 * Map view round-trip snapshot (sessionStorage).
 *
 * Minimum viable: camera (center/zoom/pitch/bearing) + basemap + open marker
 * ids so map → View details → Back lands where the analyst left off.
 *
 * Follows the Detection nav-context pattern (session, not localStorage):
 * same-tab soft nav only; dies with the tab.
 *
 * ## Gaps for a later ticket (not in this MVP)
 * - Filters: country / region / timeframe / crisis type / timeline month
 * - Layers: roads, NRC locations, blockages, boundaries, data view
 *   (Hazards → seismic activity *is* snapshotted — same-tab reload)
 * - Keep-panels-open + multi-panel stack order / z-index / drag offsets
 * - Solo-focus deep links (`?event=`) vs restore coexistence polish
 * - Cross-tab durable prefs (would need localStorage + TTL UX)
 * - Product Tour / force-fly interaction matrix
 */

export const MAP_VIEW_STATE_STORAGE_KEY = "clear.map.viewState.v1";

/** Drop snapshots older than this (ms). */
export const MAP_VIEW_STATE_TTL_MS = 30 * 60 * 1000;

export type MapViewCamera = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

export type MapViewBaseMapType = "simple" | "topography" | "satellite";

export type MapViewStateV1 = {
  v: 1;
  camera: MapViewCamera;
  baseMapType: MapViewBaseMapType;
  /** Crisis marker numeric ids that had open detail panels. */
  openMarkerIds: number[];
  /** Hazards → seismic activity overlay. Missing on older snapshots = off. */
  showSeismic: boolean;
  savedAt: number;
};

export type MapViewStateStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function defaultSessionStorage(): MapViewStateStorage | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export function isMapViewBaseMapType(v: unknown): v is MapViewBaseMapType {
  return v === "simple" || v === "topography" || v === "satellite";
}

/** Validate/normalize a parsed payload; returns null if unusable. */
export function parseMapViewState(raw: unknown): MapViewStateV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (!isMapViewBaseMapType(o.baseMapType)) return null;
  if (!isFiniteNumber(o.savedAt)) return null;

  const cam = o.camera;
  if (!cam || typeof cam !== "object") return null;
  const c = cam as Record<string, unknown>;
  const center = c.center;
  if (
    !Array.isArray(center) ||
    center.length !== 2 ||
    !isFiniteNumber(center[0]) ||
    !isFiniteNumber(center[1])
  ) {
    return null;
  }
  if (
    !isFiniteNumber(c.zoom) ||
    !isFiniteNumber(c.pitch) ||
    !isFiniteNumber(c.bearing)
  ) {
    return null;
  }

  const idsRaw = o.openMarkerIds;
  if (!Array.isArray(idsRaw)) return null;
  const openMarkerIds = idsRaw.filter((id): id is number => isFiniteNumber(id));

  return {
    v: 1,
    camera: {
      center: [center[0], center[1]],
      zoom: c.zoom,
      pitch: c.pitch,
      bearing: c.bearing,
    },
    baseMapType: o.baseMapType,
    openMarkerIds,
    showSeismic: o.showSeismic === true,
    savedAt: o.savedAt,
  };
}

export function isMapViewStateFresh(
  state: MapViewStateV1,
  now = Date.now(),
  ttlMs = MAP_VIEW_STATE_TTL_MS,
): boolean {
  return now - state.savedAt >= 0 && now - state.savedAt <= ttlMs;
}

export function writeMapViewState(
  state: Omit<MapViewStateV1, "v" | "savedAt" | "showSeismic"> & {
    savedAt?: number;
    showSeismic?: boolean;
  },
  storage: MapViewStateStorage | null | undefined = defaultSessionStorage(),
): void {
  if (!storage) return;
  const payload: MapViewStateV1 = {
    v: 1,
    camera: state.camera,
    baseMapType: state.baseMapType,
    openMarkerIds: state.openMarkerIds,
    showSeismic: state.showSeismic === true,
    savedAt: state.savedAt ?? Date.now(),
  };
  try {
    storage.setItem(MAP_VIEW_STATE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

export function readMapViewState(
  storage: MapViewStateStorage | null | undefined = defaultSessionStorage(),
  now = Date.now(),
): MapViewStateV1 | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(MAP_VIEW_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseMapViewState(JSON.parse(raw) as unknown);
    if (!parsed || !isMapViewStateFresh(parsed, now)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMapViewState(
  storage: MapViewStateStorage | null | undefined = defaultSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(MAP_VIEW_STATE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Back from event/signal/crisis detail when `from=map` — restore snapshot, no solo-focus wipe. */
export function mapReturnHref(): string {
  return "/map";
}
