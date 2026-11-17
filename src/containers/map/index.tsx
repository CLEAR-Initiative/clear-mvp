"use client";

import { useCallback, useRef, useState } from "react";
import ReactMapGL, { AttributionControl, type MapRef } from "react-map-gl/mapbox";
import { useIsDark } from "~/hooks/use-is-dark";
import { BASEMAP_STYLES, PROJECTION, ZOOM_RANGE } from "./constants";
import { offsetCssVars, useEaseToOffset, useMapOffset, type MapOffset } from "./hooks/use-map-offset";
import { findLabelAnchorId } from "./label-anchor";
import { findReliefAnchorId } from "./basemaps/relief-anchor";
import { Topography } from "./basemaps/topography";
import { MapSettingsLayers } from "./basemaps/map-settings-layers";
import { MapControls } from "./controls";
import { useBasemap } from "./hooks/use-basemap";
import { useUrlView } from "./hooks/use-url-view";
import { LayerManager } from "./layer-manager";

import "mapbox-gl/dist/mapbox-gl.css";

export default function MapV2({ offset: offsetProp }: { offset?: Partial<MapOffset> }) {
  const isDark = useIsDark();
  const offset = useMapOffset(offsetProp);
  const mapRef = useRef<MapRef>(null);
  const [basemap] = useBasemap();
  const [labelAnchorId, setLabelAnchorId] = useState<string | undefined>();
  const [reliefAnchorId, setReliefAnchorId] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const { initialViewState, onMoveEnd, fitWorldOnLoad } = useUrlView(mapRef, loaded);

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
    map.getMap().touchZoomRotate.disableRotation();
    map.getMap().keyboard.disableRotation();
    fitWorldOnLoad();
    setLoaded(true);
  }, [fitWorldOnLoad]);

  useEaseToOffset(mapRef, offset, loaded);

  return (
    <div className="map-v2-root" style={offsetCssVars(offset)}>
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
        dragRotate={false}
        initialViewState={{ ...initialViewState, padding: offset }}
        onMoveEnd={onMoveEnd}
        onLoad={onLoad}
        style={{ width: "100%", height: "100%" }}
      >
        <AttributionControl position="bottom-right" compact />
        {loaded && basemap === "topography" && <Topography beforeId={reliefAnchorId} />}
        {loaded && <MapSettingsLayers basemap={basemap} />}
        {loaded && <LayerManager labelAnchorId={labelAnchorId} />}
        <MapControls />
      </ReactMapGL>
    </div>
  );
}
