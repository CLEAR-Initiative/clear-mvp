"use client";

import { useEffect, useMemo, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import { createSignalIndex, viewClusters, type ClusterMarker } from "./clusters";
import type { SignalFeatureCollection } from "./to-features";

type ClusterView = { clusters: ClusterMarker[]; points: SignalFeatureCollection };

export function useSignalClusters(collection: SignalFeatureCollection, enabled: boolean): ClusterView {
  const { current: mapRef } = useMap();
  const index = useMemo(() => createSignalIndex(collection), [collection]);
  const [view, setView] = useState<ClusterView | null>(null);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !enabled) {
      setView(null);
      return;
    }
    const update = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      setView(
        viewClusters(
          index,
          { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() },
          map.getZoom(),
        ),
      );
    };
    if (map.loaded()) update();
    else map.once("load", update);
    map.on("moveend", update);
    return () => {
      map.off("load", update);
      map.off("moveend", update);
    };
  }, [mapRef, index, enabled]);

  return enabled && view ? view : { clusters: [], points: collection };
}
