"use client";

import type { GeoJSONFeature, MapMouseEvent } from "mapbox-gl";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useMap } from "react-map-gl/mapbox";
import type { MapSelection, MapSelectTarget } from "./selection";

/** Turns a clicked feature of a selectable layer into what the map reports, or null to ignore it. */
export type FeatureToTarget = (feature: GeoJSONFeature) => MapSelectTarget | null;

export type MapInteractions = {
  selection: MapSelection | null;
  select: (target: MapSelectTarget | null) => void;
  /** Lets a layer's clicked features become selections. Returns the unregister function. */
  registerSelectableLayer: (layerId: string, toTarget: FeatureToTarget) => () => void;
};

const MapInteractionsContext = createContext<MapInteractions | null>(null);

/** True for a click on an HTML marker: the marker handles it, the map underneath does not. */
function isMarkerClick(event: MapMouseEvent): boolean {
  const target = event.originalEvent.target;
  return target instanceof Element && target.closest(".mapboxgl-marker") !== null;
}

type MapInteractionsProviderProps = {
  selection: MapSelection | null;
  onSelect: ((target: MapSelectTarget | null) => void) | undefined;
  children: React.ReactNode;
};

/**
 * Reports clicks on the map through `onSelect`: a feature of a selectable layer, or null for empty map.
 * Render it inside the map, around the layers that read the selection.
 */
export function MapInteractionsProvider({ selection, onSelect, children }: MapInteractionsProviderProps) {
  const { current: mapRef } = useMap();
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const select = useCallback((target: MapSelectTarget | null) => onSelectRef.current?.(target), []);

  const selectableLayers = useRef(new Map<string, FeatureToTarget>());
  const registerSelectableLayer = useCallback((layerId: string, toTarget: FeatureToTarget) => {
    selectableLayers.current.set(layerId, toTarget);
    return () => {
      if (selectableLayers.current.get(layerId) === toTarget) selectableLayers.current.delete(layerId);
    };
  }, []);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const onClick = (event: MapMouseEvent) => {
      if (isMarkerClick(event)) return;
      const layers = [...selectableLayers.current.keys()].filter((id) => map.getLayer(id));
      const feature = layers.length > 0 ? map.queryRenderedFeatures(event.point, { layers })[0] : undefined;
      const toTarget = feature ? selectableLayers.current.get(feature.layer?.id ?? "") : undefined;
      select(feature && toTarget ? toTarget(feature) : null);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [mapRef, select]);

  const value = useMemo<MapInteractions>(
    () => ({ selection, select, registerSelectableLayer }),
    [selection, select, registerSelectableLayer],
  );

  return <MapInteractionsContext.Provider value={value}>{children}</MapInteractionsContext.Provider>;
}

export function useMapInteractions(): MapInteractions {
  const value = useContext(MapInteractionsContext);
  if (!value) throw new Error("useMapInteractions must be used inside MapInteractionsProvider");
  return value;
}
