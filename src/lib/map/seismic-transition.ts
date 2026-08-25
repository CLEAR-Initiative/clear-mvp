/**
 * Month/timeframe transitions for Seismic activity.
 *
 * Mapbox `setData` replaces GeoJSON in one frame (pop). This interpolates
 * epicenter points and ShakeMap contours so bands travel to the next month
 * instead of tearing down. Living shockwave expand/pulse is Expo #500.
 */

import type {
  SeismicMapCollection,
  SeismicMapFeature,
  ShakeMapContourFeature,
  ShakeMapContours,
} from "~/lib/map/usgs-earthquakes";

export const SEISMIC_TRANSITION_MS = 220;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

type Epicenter = {
  id: string;
  lng: number;
  lat: number;
  feature: SeismicMapFeature;
};

export type SeismicSlotPair = {
  from: Epicenter | null;
  to: Epicenter | null;
};

function pointEpicenter(feature: SeismicMapFeature): Epicenter | null {
  const g = feature.geometry;
  if (!g || g.type !== "Point") return null;
  const [lng, lat] = g.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { id: feature.properties.id, lng, lat, feature };
}

function epicentersOf(collection: SeismicMapCollection): Epicenter[] {
  const out: Epicenter[] = [];
  for (const f of collection.features) {
    const e = pointEpicenter(f);
    if (e) out.push(e);
  }
  return out;
}

function dist2(a: Epicenter, b: Epicenter): number {
  const dLng = a.lng - b.lng;
  const dLat = a.lat - b.lat;
  return dLng * dLng + dLat * dLat;
}

/** Same USGS id first, then greedy nearest for the rest. */
export function matchSeismicSlots(
  from: SeismicMapCollection | null,
  to: SeismicMapCollection | null,
): SeismicSlotPair[] {
  const fromE = from ? epicentersOf(from) : [];
  const toE = to ? epicentersOf(to) : [];
  const usedFrom = new Set<number>();
  const usedTo = new Set<number>();
  const slots: SeismicSlotPair[] = [];

  for (let ti = 0; ti < toE.length; ti++) {
    const target = toE[ti]!;
    const fi = fromE.findIndex((e, i) => !usedFrom.has(i) && e.id === target.id);
    if (fi >= 0) {
      usedFrom.add(fi);
      usedTo.add(ti);
      slots.push({ from: fromE[fi]!, to: target });
    }
  }

  for (let ti = 0; ti < toE.length; ti++) {
    if (usedTo.has(ti)) continue;
    const target = toE[ti]!;
    let best = -1;
    let bestD = Infinity;
    for (let fi = 0; fi < fromE.length; fi++) {
      if (usedFrom.has(fi)) continue;
      const d = dist2(fromE[fi]!, target);
      if (d < bestD) {
        bestD = d;
        best = fi;
      }
    }
    if (best >= 0) {
      usedFrom.add(best);
      usedTo.add(ti);
      slots.push({ from: fromE[best]!, to: target });
    } else {
      usedTo.add(ti);
      slots.push({ from: null, to: target });
    }
  }

  for (let fi = 0; fi < fromE.length; fi++) {
    if (usedFrom.has(fi)) continue;
    slots.push({ from: fromE[fi]!, to: null });
  }

  return slots;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function resampleLine(line: number[][], n: number): number[][] {
  if (n < 2) return line.slice();
  if (line.length === 0) return Array.from({ length: n }, () => [0, 0]);
  if (line.length === 1) return Array.from({ length: n }, () => [...line[0]!]);

  const lengths: number[] = [0];
  for (let i = 1; i < line.length; i++) {
    const dx = line[i]![0]! - line[i - 1]![0]!;
    const dy = line[i]![1]! - line[i - 1]![1]!;
    lengths.push(lengths[i - 1]! + Math.hypot(dx, dy));
  }
  const total = lengths[lengths.length - 1]!;
  if (total === 0) return Array.from({ length: n }, () => [...line[0]!]);

  const out: number[][] = [];
  for (let s = 0; s < n; s++) {
    const target = (s / (n - 1)) * total;
    let i = 1;
    while (i < lengths.length && lengths[i]! < target) i++;
    const i0 = i - 1;
    const seg = lengths[i]! - lengths[i0]!;
    const u = seg > 0 ? (target - lengths[i0]!) / seg : 0;
    const a = line[i0]!;
    const b = line[i] ?? a;
    out.push([lerp(a[0]!, b[0]!, u), lerp(a[1]!, b[1]!, u)]);
  }
  return out;
}

function interpolateLine(from: number[][], to: number[][], t: number): number[][] {
  const n = Math.max(from.length, to.length, 8);
  const a = resampleLine(from, n);
  const b = resampleLine(to, n);
  return a.map((p, i) => [lerp(p[0]!, b[i]![0]!, t), lerp(p[1]!, b[i]![1]!, t)]);
}

function asMultiLine(geom: ShakeMapContourFeature["geometry"]): number[][][] {
  if (geom.type === "LineString") return [geom.coordinates as number[][]];
  return (geom.coordinates as number[][][]) ?? [];
}

function scaleLinesToward(
  lines: number[][][],
  lng: number,
  lat: number,
  tTowardCenter: number,
): number[][][] {
  return lines.map((line) =>
    line.map((c) => [
      lerp(c[0]!, lng, tTowardCenter),
      lerp(c[1]!, lat, tTowardCenter),
    ]),
  );
}

function interpolateContourGeometry(
  fromGeom: ShakeMapContourFeature["geometry"] | null,
  toGeom: ShakeMapContourFeature["geometry"] | null,
  t: number,
  fromEpic: { lng: number; lat: number } | null,
  toEpic: { lng: number; lat: number } | null,
): ShakeMapContourFeature["geometry"] {
  const fromLines = fromGeom ? asMultiLine(fromGeom) : [];
  const toLines = toGeom ? asMultiLine(toGeom) : [];
  if (fromLines.length === 0 && toLines.length === 0) {
    return { type: "MultiLineString", coordinates: [] };
  }
  if (fromLines.length === 0 && toEpic) {
    const grown = scaleLinesToward(toLines, toEpic.lng, toEpic.lat, 1 - t);
    return { type: "MultiLineString", coordinates: grown };
  }
  if (toLines.length === 0 && fromEpic) {
    const shrunk = scaleLinesToward(fromLines, fromEpic.lng, fromEpic.lat, t);
    return { type: "MultiLineString", coordinates: shrunk };
  }
  const n = Math.max(fromLines.length, toLines.length);
  const coordinates: number[][][] = [];
  for (let i = 0; i < n; i++) {
    const a = fromLines[i] ?? fromLines[fromLines.length - 1] ?? [];
    const b = toLines[i] ?? toLines[toLines.length - 1] ?? [];
    coordinates.push(interpolateLine(a, b, t));
  }
  return { type: "MultiLineString", coordinates };
}

function mmiKey(value: number): string {
  return String(value);
}

function contoursByMmi(sm: ShakeMapContours | undefined): Map<string, ShakeMapContourFeature> {
  const map = new Map<string, ShakeMapContourFeature>();
  for (const f of sm?.features ?? []) {
    map.set(mmiKey(f.properties.value), f);
  }
  return map;
}

function interpolateShakeMap(
  slot: number,
  fromSm: ShakeMapContours | undefined,
  toSm: ShakeMapContours | undefined,
  fromEpic: Epicenter | null,
  toEpic: Epicenter | null,
  t: number,
  opacity: number,
): ShakeMapContours | null {
  const fromMap = contoursByMmi(fromSm);
  const toMap = contoursByMmi(toSm);
  const keys = new Set([...fromMap.keys(), ...toMap.keys()]);
  if (keys.size === 0) return null;
  const features: ShakeMapContourFeature[] = [];
  for (const key of keys) {
    const a = fromMap.get(key);
    const b = toMap.get(key);
    const value = b?.properties.value ?? a?.properties.value ?? Number(key);
    features.push({
      type: "Feature",
      properties: {
        value,
        units: b?.properties.units ?? a?.properties.units ?? "intensity",
        color: b?.properties.color ?? a?.properties.color,
        weight: b?.properties.weight ?? a?.properties.weight,
        transition_opacity: opacity,
      },
      geometry: interpolateContourGeometry(
        a?.geometry ?? null,
        b?.geometry ?? null,
        t,
        fromEpic,
        toEpic,
      ),
    });
  }
  return {
    eventId: `slot-${slot}`,
    anchorId: (toEpic ?? fromEpic)?.id,
    type: "FeatureCollection",
    features,
  };
}

function lerpFeature(
  from: Epicenter | null,
  to: Epicenter | null,
  t: number,
  opacity: number,
): SeismicMapFeature | null {
  const src = to?.feature ?? from?.feature;
  if (!src) return null;
  const lng = lerp(from?.lng ?? to!.lng, to?.lng ?? from!.lng, t);
  const lat = lerp(from?.lat ?? to!.lat, to?.lat ?? from!.lat, t);
  const depth =
    src.geometry?.coordinates[2] ??
    from?.feature.geometry?.coordinates[2] ??
    0;
  return {
    ...src,
    geometry: {
      type: "Point",
      coordinates: [lng, lat, depth],
    },
    properties: {
      ...src.properties,
      transition_opacity: opacity,
    },
  };
}

function emptyMeta(source: SeismicMapCollection["meta"]["source"]): SeismicMapCollection["meta"] {
  return {
    source,
    feature_count: 0,
    min_magnitude: null,
    window_days: null,
    bbox: null,
    pulled_at: new Date().toISOString(),
    bytes_in: 0,
    bytes_out: 0,
    reduction_ratio: 1,
  };
}

/**
 * Interpolate two map collections. `eventId` on contours is `slot-N` so Mapbox
 * sources stay stable while rings travel. `t=1` still uses slot ids (callers
 * that want the raw `to` collection should pass t>=1 and then paint `to` only
 * when not syncing layers by slot).
 */
export function interpolateSeismicMapCollection(
  from: SeismicMapCollection | null,
  to: SeismicMapCollection | null,
  tRaw: number,
): SeismicMapCollection | null {
  if (!from && !to) return null;
  const t = easeInOutCubic(tRaw);
  const slots = matchSeismicSlots(from, to);
  const fromSm = new Map<string, ShakeMapContours>();
  for (const s of from?.shakemaps ?? []) {
    fromSm.set(s.eventId, s);
    if (s.anchorId) fromSm.set(s.anchorId, s);
  }
  const toSm = new Map<string, ShakeMapContours>();
  for (const s of to?.shakemaps ?? []) {
    toSm.set(s.eventId, s);
    if (s.anchorId) toSm.set(s.anchorId, s);
  }

  const features: SeismicMapFeature[] = [];
  const shakemaps: ShakeMapContours[] = [];

  slots.forEach((slot, i) => {
    const opacity =
      slot.from && slot.to ? 1 : slot.to ? t : 1 - t;
    const feature = lerpFeature(slot.from, slot.to, t, opacity);
    if (feature) features.push(feature);

    const sm = interpolateShakeMap(
      i,
      slot.from ? fromSm.get(slot.from.id) : undefined,
      slot.to ? toSm.get(slot.to.id) : undefined,
      slot.from,
      slot.to,
      t,
      opacity,
    );
    if (sm) shakemaps.push(sm);
  });

  const metaBase = to?.meta ?? from?.meta ?? emptyMeta("usgs-spike");
  return {
    type: "FeatureCollection",
    features,
    shakemaps,
    meta: {
      ...metaBase,
      feature_count: features.length,
    },
  };
}
