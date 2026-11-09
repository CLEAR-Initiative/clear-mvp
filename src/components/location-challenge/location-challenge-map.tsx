"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useIsDark } from "~/hooks/use-is-dark";
import { loadMapboxGL, type MapboxGL } from "~/lib/map/load-mapbox-gl";
import styles from "./location-challenge-map.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type LatLng = { lat: number; lng: number };

/** The Signal's pin now, the point the analyst proposed, and the point being
 *  placed (by the analyst changing the location, or the admin deciding). */
export type ChallengeMapPinKind = "source" | "proposed" | "placed";
export type ChallengeMapPin = LatLng & { kind: ChallengeMapPinKind };

/** The pins to draw, the Signal's own first so the others sit on top of it. */
export function challengeMapPins(points: {
  source?: LatLng | null;
  proposed?: LatLng | null;
  placed?: LatLng | null;
}): ChallengeMapPin[] {
  const pins: ChallengeMapPin[] = [];
  if (points.source) pins.push({ ...points.source, kind: "source" });
  if (points.proposed) pins.push({ ...points.proposed, kind: "proposed" });
  if (points.placed) pins.push({ ...points.placed, kind: "placed" });
  return pins;
}

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
}: {
  source: LatLng | null;
  proposed: LatLng | null;
  placed: LatLng | null;
  picking: boolean;
  onPick: (at: LatLng) => void;
}) {
  const t = useTranslations("locationChallenge");
  const isDark = useIsDark();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxGL>(null);
  const glRef = useRef<MapboxGL>(null);
  const markersRef = useRef<MapboxGL[]>([]);
  const framedRef = useRef(false);
  const styleRef = useRef(isDark);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(!MAPBOX_TOKEN);
  const pickRef = useRef({ picking, onPick });
  useEffect(() => {
    pickRef.current = { picking, onPick };
  });

  const pins = challengeMapPins({ source, proposed, placed });
  const pinsKey = pins.map((p) => `${p.kind}:${p.lat},${p.lng}`).join("|");

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
      const bounds = pinBounds(pins);
      if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 0 });
    } else if (placed && !map.getBounds().contains([placed.lng, placed.lat])) {
      map.easeTo({ center: [placed.lng, placed.lat] });
    }
    // pinsKey stands for the pins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pinsKey]);

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
          {pins.map((pin) => (
            <li key={pin.kind}>
              <span className={styles.dot} data-kind={pin.kind} aria-hidden />
              {t(`map.pins.${pin.kind}`)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
