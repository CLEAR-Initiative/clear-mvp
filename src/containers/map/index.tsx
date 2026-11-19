"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMapGL, { AttributionControl, type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import { useIsDark } from "~/hooks/use-is-dark";
import { BASEMAP_STYLES, PROJECTION, ZOOM_RANGE } from "./constants";
import { isSameView, useMapView, type LngLat } from "./hooks/use-map-view";
import { useResizeOnContainerChange } from "./hooks/use-resize-on-container-change";
import { findLabelAnchorId } from "./label-anchor";
import { findReliefAnchorId } from "./basemaps/relief-anchor";
import { Topography } from "./basemaps/topography";
import { MapControls } from "./controls";
import { useBasemap } from "./hooks/use-basemap";
import { LayerManager } from "./layer-manager";

import "mapbox-gl/dist/mapbox-gl.css";

export default function MapV2() {
  const isDark = useIsDark();
  const mapRef = useRef<MapRef>(null);
  const { center, zoom, setView } = useMapView();
  const [initialViewState] = useState(() => ({ longitude: center[0], latitude: center[1], zoom }));
  const [basemap] = useBasemap();
  const [labelAnchorId, setLabelAnchorId] = useState<string | undefined>();
  const [reliefAnchorId, setReliefAnchorId] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);

  const onMoveEnd = useCallback(
    ({ viewState }: ViewStateChangeEvent) => {
      setView({ center: [viewState.longitude, viewState.latitude], zoom: viewState.zoom });
    },
    [setView],
  );

  const onLoad = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const updateAnchors = () => {
      const layers = map.getStyle()?.layers;
      setLabelAnchorId(findLabelAnchorId(layers));
      setReliefAnchorId(findReliefAnchorId(layers));
    };
    updateAnchors();
    map.on("style.load", updateAnchors);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const camera = { center: map.getCenter().toArray() as LngLat, zoom: map.getZoom() };
    if (isSameView(camera, { center, zoom })) return;
    map.flyTo({ center, zoom });
  }, [center, zoom, loaded]);

  useResizeOnContainerChange(mapRef, loaded);

  return (
    <ReactMapGL
      ref={mapRef}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      mapStyle={BASEMAP_STYLES[basemap][isDark ? "dark" : "light"]}
      // Mapbox's diffed setStyle never fires style.load, which the label anchor relies on.
      styleDiffing={false}
      projection={PROJECTION}
      attributionControl={false}
      minZoom={ZOOM_RANGE.min}
      maxZoom={ZOOM_RANGE.max}
      initialViewState={initialViewState}
      onMoveEnd={onMoveEnd}
      onLoad={onLoad}
      style={{ width: "100%", height: "100%" }}
    >
      <AttributionControl position="bottom-right" compact />
      {loaded && basemap === "topography" && <Topography beforeId={reliefAnchorId} />}
      {loaded && <LayerManager labelAnchorId={labelAnchorId} />}
      <MapControls />
    </ReactMapGL>
  );
}
