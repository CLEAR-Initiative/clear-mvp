import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox";
import { WORLD_BOUNDS } from "../constants";
import { isSameView, useMapView, type LngLat, type MapView } from "./use-map-view";

const FIT_WORLD_EVENT = { fitWorld: true };

function currentView(map: MapRef): MapView {
  return { center: map.getCenter().toArray() as LngLat, zoom: map.getZoom() };
}

export function useUrlView(mapRef: RefObject<MapRef | null>, loaded: boolean) {
  const { view, setView } = useMapView();
  const [initialViewState] = useState(() =>
    view ? { longitude: view.center[0], latitude: view.center[1], zoom: view.zoom } : { bounds: WORLD_BOUNDS },
  );
  const worldViewRef = useRef<MapView | null>(null);

  const onMoveEnd = useCallback(
    (event: ViewStateChangeEvent & Partial<typeof FIT_WORLD_EVENT>) => {
      const { viewState } = event;
      const camera: MapView = { center: [viewState.longitude, viewState.latitude], zoom: viewState.zoom };
      if (event.fitWorld) worldViewRef.current = camera;
      if (!view && worldViewRef.current && isSameView(camera, worldViewRef.current)) return;
      setView(camera);
    },
    [setView, view],
  );

  const fitWorldOnLoad = useCallback(() => {
    const map = mapRef.current;
    // react-map-gl sets the padding after the constructor's fitBounds, so refit to the inset.
    if (map && "bounds" in initialViewState) map.fitBounds(WORLD_BOUNDS, { duration: 0 }, FIT_WORLD_EVENT);
  }, [mapRef, initialViewState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (!view) {
      const world = worldViewRef.current;
      if (!world || !isSameView(currentView(map), world)) map.fitBounds(WORLD_BOUNDS, undefined, FIT_WORLD_EVENT);
      return;
    }
    if (!isSameView(currentView(map), view)) map.flyTo(view);
  }, [mapRef, view, loaded]);

  return { initialViewState, onMoveEnd, fitWorldOnLoad };
}
