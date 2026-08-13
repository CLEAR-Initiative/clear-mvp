/**
 * Idle globe spin at far zoom — Earth polar-axis rotation (longitude), not
 * camera bearing turntable. Speed ramps in during zoom-out so motion feels
 * natural as the world view settles.
 *
 * Projection: enable Mapbox `globe` once and leave it. Mapbox morphs
 * globe↔mercator with zoom; toggling `setProjection` on our spin threshold
 * caused a hard country↔global jump.
 *
 * Pattern from Mapbox globe-spin + prior CLEAR mobile QA (polar axis, ~4 min/turn).
 */

/** Above this zoom → no spin (country / regional view). */
export const IDLE_SPIN_START_ZOOM = 3.0;
/** At/below this → full spin speed. */
export const IDLE_SPIN_FULL_ZOOM = 1.5;
/** Full-speed period: one revolution ≈ 4 minutes. */
export const IDLE_SPIN_DEG_PER_SEC = 360 / 240;

export type IdleGlobeSpinMap = {
  getZoom: () => number;
  getCenter: () => { lng: number; lat: number };
  getBearing?: () => number;
  getPitch?: () => number;
  getProjection?: () => { name?: string } | string | null;
  setProjection?: (projection: string | { name: string }) => unknown;
  jumpTo?: (opts: {
    center: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
  }) => unknown;
  easeTo?: (opts: Record<string, unknown>) => unknown;
  stop?: () => unknown;
  /** Low-level transform when present (Mapbox internal) — optional. */
  transform?: { center?: { lng: number; lat: number }; setCenter?: (c: unknown) => void };
  on?: (type: string, handler: (...args: unknown[]) => void) => unknown;
  off?: (type: string, handler: (...args: unknown[]) => void) => unknown;
  isMoving?: () => boolean;
  isZooming?: () => boolean;
};

/** 0 at/above START, 1 at/below FULL, smoothstep between. */
export function idleSpinSpeedFactor(zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : IDLE_SPIN_START_ZOOM;
  if (z >= IDLE_SPIN_START_ZOOM) return 0;
  if (z <= IDLE_SPIN_FULL_ZOOM) return 1;
  const t =
    (IDLE_SPIN_START_ZOOM - z) / (IDLE_SPIN_START_ZOOM - IDLE_SPIN_FULL_ZOOM);
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function projectionName(map: IdleGlobeSpinMap): string {
  try {
    const p = map.getProjection?.();
    if (!p) return "mercator";
    if (typeof p === "string") return p;
    return p.name ?? "mercator";
  } catch {
    return "mercator";
  }
}

/** Enable globe once — never flip back on spin thresholds. */
export function ensureGlobeProjection(map: IdleGlobeSpinMap): void {
  try {
    if (projectionName(map) === "globe") return;
    map.setProjection?.("globe");
  } catch {
    /* ignore — older builds / unsupported */
  }
}

function nudgeLongitude(map: IdleGlobeSpinMap, deltaLng: number) {
  // Never interrupt an in-flight zoom animation (wheel / pinch / fitBounds).
  try {
    if (map.isZooming?.()) return;
  } catch {
    /* ignore */
  }

  const center = map.getCenter();
  let lng = center.lng + deltaLng;
  // Keep lng in a sane range for repeated spin.
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  const next: [number, number] = [lng, center.lat];

  // Prefer jumpTo so we don't call stop() and cancel camera animations.
  try {
    map.jumpTo?.({
      center: next,
      zoom: map.getZoom(),
      bearing: map.getBearing?.() ?? 0,
      pitch: map.getPitch?.() ?? 0,
    });
    return;
  } catch {
    /* fall through */
  }
  try {
    map.easeTo?.({
      center: next,
      duration: 0,
      essential: true,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Start idle polar-axis spin. Returns a disposer.
 * Pauses while the user pans/rotates; zooms do not pause (spin ramps with z).
 * Leaves Mapbox globe projection enabled so country↔global morph stays smooth.
 */
export function startIdleGlobeSpin(map: IdleGlobeSpinMap): () => void {
  let raf = 0;
  let lastTs = 0;
  let userInteracting = false;
  let disposed = false;

  // One-shot: Mapbox morphs globe↔mercator with zoom. Do not toggle per frame.
  ensureGlobeProjection(map);

  const onInteractionStart = () => {
    userInteracting = true;
  };
  const onInteractionEnd = () => {
    userInteracting = false;
    lastTs = 0;
  };

  const tick = (ts: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const factor = idleSpinSpeedFactor(map.getZoom());
    if (factor <= 0 || userInteracting) {
      lastTs = 0;
      return;
    }

    if (!lastTs) {
      lastTs = ts;
      return;
    }
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    const deltaLng = IDLE_SPIN_DEG_PER_SEC * factor * dt;
    if (deltaLng === 0) return;
    nudgeLongitude(map, deltaLng);
  };

  raf = requestAnimationFrame(tick);

  map.on?.("dragstart", onInteractionStart);
  map.on?.("dragend", onInteractionEnd);
  map.on?.("rotatestart", onInteractionStart);
  map.on?.("rotateend", onInteractionEnd);
  map.on?.("pitchstart", onInteractionStart);
  map.on?.("pitchend", onInteractionEnd);
  map.on?.("mousedown", onInteractionStart);
  map.on?.("mouseup", onInteractionEnd);
  map.on?.("touchstart", onInteractionStart);
  map.on?.("touchend", onInteractionEnd);

  return () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    map.off?.("dragstart", onInteractionStart);
    map.off?.("dragend", onInteractionEnd);
    map.off?.("rotatestart", onInteractionStart);
    map.off?.("rotateend", onInteractionEnd);
    map.off?.("pitchstart", onInteractionStart);
    map.off?.("pitchend", onInteractionEnd);
    map.off?.("mousedown", onInteractionStart);
    map.off?.("mouseup", onInteractionEnd);
    map.off?.("touchstart", onInteractionStart);
    map.off?.("touchend", onInteractionEnd);
    // Keep globe projection — resetting to mercator reintroduces the jump.
  };
}
