"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useIsDark } from "~/hooks/use-is-dark";
import { loadMapboxGL, type MapboxGL } from "~/lib/map/load-mapbox-gl";
import styles from "./location-challenge-map.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type LatLng = { lat: number; lng: number };

/** The Signal's pin now, the point the analyst proposed, a suggested place
 *  (an unresolved place name's candidates), and the point being placed (by
 *  the analyst changing the location, or the admin deciding). */
export type ChallengeMapPinKind = "source" | "proposed" | "suggestion" | "placed";
export type ChallengeMapPin = LatLng & { kind: ChallengeMapPinKind };

/** An area drawn as an outline: a GeoJSON Polygon or MultiPolygon. */
export type MapOutline = { type: string; coordinates: unknown };

/** The pins to draw, the Signal's own first so the others sit on top of it. */
export function challengeMapPins(points: {
  source?: LatLng | null;
  proposed?: LatLng | null;
  suggestions?: readonly LatLng[] | null;
  placed?: LatLng | null;
}): ChallengeMapPin[] {
  const pins: ChallengeMapPin[] = [];
  if (points.source) pins.push({ ...points.source, kind: "source" });
  if (points.proposed) pins.push({ ...points.proposed, kind: "proposed" });
  for (const s of points.suggestions ?? []) pins.push({ lat: s.lat, lng: s.lng, kind: "suggestion" });
  if (points.placed) pins.push({ ...points.placed, kind: "placed" });
  return pins;
}

/** Every [lng, lat] position in a GeoJSON coordinates tree, as points. */
export function outlinePoints(outlines: readonly MapOutline[]): LatLng[] {
  const points: LatLng[] = [];
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === "number" && typeof node[1] === "number") {
      points.push({ lng: node[0], lat: node[1] });
      return;
    }
    for (const child of node) walk(child);
  };
  for (const outline of outlines) walk(outline.coordinates);
  return points;
}

/** Whether pins that arrive after the first frame may move the view: not
 *  once the reader has moved the map, is placing a point, or has placed one. */
export function shouldRefit(state: { interacted: boolean; picking: boolean; placed: LatLng | null }): boolean {
  return !state.interacted && !state.picking && !state.placed;
}

const OUTLINE_SOURCE = "challenge-outline";
const OUTLINE_FILL = "challenge-outline-fill";
const OUTLINE_LINE = "challenge-outline-line";

/** South-west and north-east corners around the pins, or null without any. */
export function pinBounds(pins: LatLng[]): [[number, number], [number, number]] | null {
  if (pins.length === 0) return null;
  const lngs = pins.map((p) => p.lng);
  const lats = pins.map((p) => p.lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function mapStyle(isDark: boolean): string {
  return isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";
}

/**
 * A small map of a Signal's location change: where it is now, the proposed
 * point, and the point being placed. While `picking`, a click places that
 * point. It opens framed on the Signal and the proposal, and then only
 * follows a placed point that leaves the view (one found by search or typed).
 */
export function LocationChallengeMap({
  source,
  proposed,
  placed,
  picking,
  onPick,
  suggestions,
  outlines,
}: {
  source: LatLng | null;
  proposed: LatLng | null;
  placed: LatLng | null;
  picking: boolean;
  onPick: (at: LatLng) => void;
  /** Suggested places, drawn as their own pins. */
  suggestions?: readonly LatLng[] | null;
  /** Areas drawn as a tinted outline under the pins (a state, a district).
   *  The first frame fits them. */
  outlines?: readonly MapOutline[] | null;
}) {
  const t = useTranslations("locationChallenge");
  const isDark = useIsDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxGL>(null);
  const glRef = useRef<MapboxGL>(null);
  const markersRef = useRef<MapboxGL[]>([]);
  const framedRef = useRef(false);
  /** The reader moved or zoomed the map, or is placing a point: the view is
   *  theirs, and pins that load later no longer move it. */
  const interactedRef = useRef(false);
  const styleRef = useRef(isDark);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!MAPBOX_TOKEN);
  const pickRef = useRef({ picking, onPick });
  useEffect(() => {
    pickRef.current = { picking, onPick };
  });

  const pins = challengeMapPins({ source, proposed, suggestions, placed });
  const pinsKey = pins.map((p) => `${p.kind}:${p.lat},${p.lng}`).join("|");
  const areas = outlines ?? [];
  // The outlines arrive after the map (a query): their count and size stand for them.
  const outlinesKey = areas.map((o) => `${o.type}:${JSON.stringify(o.coordinates).length}`).join("|");
  const outlineFramedRef = useRef(false);

  // One map per mount: the pins, the style and the cursor follow below.
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    let cancelled = false;
    loadMapboxGL()
      .then((gl) => {
        if (cancelled || !containerRef.current) return;
        gl.accessToken = MAPBOX_TOKEN;
        const center = source ?? proposed;
        const map = new gl.Map({
          container: containerRef.current,
          style: mapStyle(styleRef.current),
          center: center ? [center.lng, center.lat] : [30, 15],
          zoom: center ? 9 : 3,
          attributionControl: false,
        });
        map.addControl(new gl.NavigationControl({ showCompass: false }), "top-right");
        map.on("click", (e: { lngLat: LatLng }) => {
          if (pickRef.current.picking) pickRef.current.onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
        // Only the reader's own gestures carry an originalEvent; fitBounds does not.
        const taken = (e: { originalEvent?: unknown }) => {
          if (e.originalEvent) interactedRef.current = true;
        };
        map.on("dragstart", taken);
        map.on("zoomstart", taken);
        map.on("load", () => {
          if (!cancelled) setReady(true);
        });
        glRef.current = gl;
        mapRef.current = map;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Created once; the starting center is only a first frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || styleRef.current === isDark) return;
    styleRef.current = isDark;
    mapRef.current?.setStyle(mapStyle(isDark));
  }, [ready, isDark]);

  useEffect(() => {
    const map = mapRef.current;
    const gl = glRef.current;
    if (!ready || !map || !gl) return;
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = pins.map((pin) => {
      const el = document.createElement("div");
      el.className = styles.pin!;
      el.dataset.kind = pin.kind;
      el.setAttribute("aria-label", t(`map.pins.${pin.kind}`));
      return new gl.Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map);
    });
    if (!framedRef.current) {
      framedRef.current = true;
      const bounds = pinBounds([...outlinePoints(areas), ...pins]);
      if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 0 });
    } else if (placed && !map.getBounds().contains([placed.lng, placed.lat])) {
      map.easeTo({ center: [placed.lng, placed.lat] });
    } else if (shouldRefit({ interacted: interactedRef.current, picking, placed })) {
      // Suggestions that load after the first frame (a query) would otherwise
      // sit off-screen: frame them with the outlines, until the reader takes
      // the map.
      const bounds = pinBounds([...outlinePoints(areas), ...pins]);
      if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 0 });
    }
    // pinsKey stands for the pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pinsKey]);

  // The outlines: a tinted fill and a line under the pins. A style change
  // drops every layer, so they are drawn again when the new style has loaded.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const draw = () => {
      const data = {
        type: "FeatureCollection",
        features: areas.map((geometry) => ({ type: "Feature", properties: {}, geometry })),
      };
      const existing = map.getSource?.(OUTLINE_SOURCE);
      if (existing) {
        existing.setData(data);
        return;
      }
      if (areas.length === 0) return;
      // Colours come from the theme tokens (ADR-0002), read where the map sits.
      const tokens = containerRef.current ? getComputedStyle(containerRef.current) : null;
      const color = tokens?.getPropertyValue("--color-info").trim();
      map.addSource(OUTLINE_SOURCE, { type: "geojson", data });
      map.addLayer({
        id: OUTLINE_FILL,
        type: "fill",
        source: OUTLINE_SOURCE,
        paint: { ...(color ? { "fill-color": color } : {}), "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: OUTLINE_LINE,
        type: "line",
        source: OUTLINE_SOURCE,
        paint: { ...(color ? { "line-color": color } : {}), "line-width": 1.5 },
      });
    };
    draw();
    map.on("style.load", draw);
    if (!outlineFramedRef.current && areas.length > 0) {
      outlineFramedRef.current = true;
      const bounds = pinBounds([...outlinePoints(areas), ...pins]);
      if (bounds) map.fitBounds(bounds, { padding: 24, maxZoom: 11, duration: 0 });
    }
    return () => {
      map.off("style.load", draw);
    };
    // outlinesKey stands for the outlines; the pins only widen the first frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, outlinesKey]);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas?.() as HTMLCanvasElement | undefined;
    if (ready && canvas) canvas.style.cursor = picking ? "crosshair" : "";
  }, [ready, picking]);

  return (
    <div className={styles.frame} data-testid="location-challenge-map" data-picking={picking || undefined}>
      <div ref={containerRef} className={styles.canvas} />
      {failed && <div className={styles.fallback}>{t("map.unavailable")}</div>}
      {pins.length > 0 && (
        <ul className={styles.legend}>
          {[...new Set(pins.map((pin) => pin.kind))].map((kind) => (
            <li key={kind}>
              <span className={styles.dot} data-kind={kind} aria-hidden />
              {t(`map.pins.${kind}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
