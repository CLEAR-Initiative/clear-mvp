"use client";

import type { MapMouseEvent } from "mapbox-gl";
import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import { toHoveredSignal, type HoveredSignal } from "./hovered-signal";
import type { DensityDisplay } from "./settings";

export function useSignalTooltip(layerId: string, visible: boolean, density: DensityDisplay): HoveredSignal | null {
  const { current: mapRef } = useMap();
  const [signal, setSignal] = useState<HoveredSignal | null>(null);

  useEffect(() => {
    setSignal(null);
  }, [visible, density]);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const container = map.getCanvasContainer();
    let pointerType = "mouse";

    const show = (next: HoveredSignal | null) => setSignal((prev) => (prev?.id === next?.id ? prev : next));
    // Mapbox's MapMouseEvent wraps a MouseEvent, which has no pointerType.
    const onPointer = (event: PointerEvent) => {
      pointerType = event.pointerType;
    };
    const onMouseMove = (event: MapMouseEvent) => {
      if (pointerType === "touch") return;
      show(toHoveredSignal(event.features?.[0]));
    };
    const onMouseLeave = () => {
      if (pointerType === "touch") return;
      show(null);
    };
    const onClick = (event: MapMouseEvent) => {
      if (pointerType !== "touch" || !map.getLayer(layerId)) return;
      show(toHoveredSignal(map.queryRenderedFeatures(event.point, { layers: [layerId] })[0]));
    };
    const onMoveStart = () => show(null);

    container.addEventListener("pointerdown", onPointer, true);
    container.addEventListener("pointermove", onPointer, true);
    map.on("mousemove", layerId, onMouseMove);
    map.on("mouseleave", layerId, onMouseLeave);
    map.on("click", onClick);
    map.on("movestart", onMoveStart);
    return () => {
      container.removeEventListener("pointerdown", onPointer, true);
      container.removeEventListener("pointermove", onPointer, true);
      map.off("mousemove", layerId, onMouseMove);
      map.off("mouseleave", layerId, onMouseLeave);
      map.off("click", onClick);
      map.off("movestart", onMoveStart);
    };
  }, [mapRef, layerId]);

  return signal;
}
