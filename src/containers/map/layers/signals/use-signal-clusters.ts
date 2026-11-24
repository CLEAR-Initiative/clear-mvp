"use client";

import { useEffect, useMemo, useState } from "react";
import { useMap } from "react-map-gl/mapbox";
import {
  CLUSTER_MAX_ZOOM,
  createSignalIndex,
  viewClusters,
  worldPoints,
  type ClusterMarker,
  type SignalIndex,
  type ViewBounds,
} from "./clusters";
import { HEAT_POINTS_MIN_ZOOM } from "./density-fade";
import type { SignalFeatureCollection } from "./to-features";

type ClusterView = { clusters: ClusterMarker[]; points: SignalFeatureCollection; index: SignalIndex };
type Camera = { bounds: ViewBounds; zoom: number };
export type SignalGrouping = "none" | "clusters" | "stacked";

const MAX_LATITUDE = 85;
const MOVE_UPDATE_MS = 150;

function paddedBounds(west: number, south: number, east: number, north: number): ViewBounds {
  const width = east - west;
  const height = north - south;
  return {
    west: west - width,
    south: Math.max(south - height, -MAX_LATITUDE),
    east: east + width,
    north: Math.min(north + height, MAX_LATITUDE),
  };
}

export function useSignalClusters(collection: SignalFeatureCollection, grouping: SignalGrouping): ClusterView {
  const { current: mapRef } = useMap();
  const index = useMemo(() => createSignalIndex(collection), [collection]);
  const [camera, setCamera] = useState<Camera | null>(null);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    const update = () => {
      const bounds = map.getBounds();
      if (!bounds) return;
      setCamera({
        bounds: paddedBounds(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()),
        zoom: map.getZoom(),
      });
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const onMove = () => {
      timer ??= setTimeout(() => {
        timer = null;
        update();
      }, MOVE_UPDATE_MS);
    };
    const onMoveEnd = () => {
      cancel();
      update();
    };
    update();
    map.on("move", onMove);
    map.on("moveend", onMoveEnd);
    return () => {
      cancel();
      map.off("move", onMove);
      map.off("moveend", onMoveEnd);
    };
  }, [mapRef]);

  const zoomLevel = camera ? Math.floor(camera.zoom) : null;
  const points = useMemo(() => {
    if (grouping === "stacked") return worldPoints(index, CLUSTER_MAX_ZOOM);
    return grouping === "clusters" && zoomLevel !== null ? worldPoints(index, zoomLevel) : collection;
  }, [grouping, zoomLevel, index, collection]);
  const clusters = useMemo(() => {
    if (!camera || grouping === "none") return [];
    if (grouping === "clusters") return viewClusters(index, camera.bounds, camera.zoom);
    return camera.zoom >= HEAT_POINTS_MIN_ZOOM ? viewClusters(index, camera.bounds, CLUSTER_MAX_ZOOM) : [];
  }, [grouping, camera, index]);

  return { clusters, points, index };
}
