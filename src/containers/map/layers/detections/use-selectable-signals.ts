"use client";

import type { GeoJSONFeature } from "mapbox-gl";
import { useEffect } from "react";
import { useMap } from "react-map-gl/mapbox";
import { useMapInteractions } from "../../interactions";
import type { DetectionKind, MapSelectTarget } from "../../selection";

/** Makes a click on a point select its detection, and shows a pointer cursor over the points. */
export function useSelectableDetections(layerId: string, kind: DetectionKind) {
  const { current: mapRef } = useMap();
  const { registerSelectableLayer } = useMapInteractions();

  useEffect(
    () =>
      registerSelectableLayer(layerId, (feature: GeoJSONFeature): MapSelectTarget | null => {
        const id: unknown = feature.properties?.id;
        return typeof id === "string" ? { type: "detection", kind, id } : null;
      }),
    [layerId, kind, registerSelectableLayer],
  );

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const canvas = map.getCanvas();
    const onEnter = () => {
      canvas.style.cursor = "pointer";
    };
    const onLeave = () => {
      canvas.style.cursor = "";
    };
    map.on("mouseenter", layerId, onEnter);
    map.on("mouseleave", layerId, onLeave);
    return () => {
      map.off("mouseenter", layerId, onEnter);
      map.off("mouseleave", layerId, onLeave);
      canvas.style.cursor = "";
    };
  }, [mapRef, layerId]);
}
