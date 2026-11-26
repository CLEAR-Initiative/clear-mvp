"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import ReactMapGL, { AttributionControl, type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import { useIsDark } from "~/hooks/use-is-dark";
import { BASEMAP_STYLES, PROJECTION, ZOOM_RANGE } from "./constants";
import { isSameView, useMapView, type LngLat } from "./hooks/use-map-view";
import { offsetCssVars, useEaseToOffset, useMapOffset, type MapOffset } from "./hooks/use-map-offset";
import { findLabelAnchorId } from "./label-anchor";
import { findReliefAnchorId } from "./basemaps/relief-anchor";
import { Topography } from "./basemaps/topography";
import { MapSettingsLayers } from "./basemaps/map-settings-layers";
import { AdminBoundaries } from "./boundaries/layer";
import { MapControls } from "./controls";
import { useBasemap } from "./hooks/use-basemap";
import { LayerManager } from "./layer-manager";
import { useLoadingLayerIds } from "./hooks/use-loading-layer-ids";
import { MapLoader } from "./loader";
import { TimeframeQueryProvider } from "./hooks/use-timeframe";
import { MapInteractionsProvider } from "./interactions";
import type { MapSelection, MapSelectTarget } from "./selection";

import "mapbox-gl/dist/mapbox-gl.css";

export type MapV2Props = {
  /** The part of the map covered by surrounding UI, per side, in pixels. */
  offset?: Partial<MapOffset>;
  /** What the embedding page has selected, highlighted on the map. */
  selection?: MapSelection | null;
  /** A click picked a target, or `null` for a click on empty map. */
  onSelect?: (target: MapSelectTarget | null) => void;
  children?: ReactNode;
};

export default function MapV2({
  offset: offsetProp,
  selection = null,
  onSelect,
  children,
}: MapV2Props) {
  const isDark = useIsDark();
  const offset = useMapOffset(offsetProp);
  const mapRef = useRef<MapRef>(null);
  const { center, zoom, setView } = useMapView();
  const [initialViewState] = useState(() => ({ longitude: center[0], latitude: center[1], zoom }));
  const [basemap] = useBasemap();
  const [labelAnchorId, setLabelAnchorId] = useState<string | undefined>();
  const [reliefAnchorId, setReliefAnchorId] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [loadingLayerIds, onLoadingChange] = useLoadingLayerIds();

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
    map.getMap().touchZoomRotate.disableRotation();
    map.getMap().keyboard.disableRotation();
    setLoaded(true);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const camera = { center: map.getCenter().toArray() as LngLat, zoom: map.getZoom() };
    if (isSameView(camera, { center, zoom })) return;
    map.flyTo({ center, zoom });
  }, [center, zoom, loaded]);

  useEaseToOffset(mapRef, offset, loaded);

  return (
    <TimeframeQueryProvider>
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
          {loaded && (
            <MapInteractionsProvider selection={selection} onSelect={onSelect}>
              <LayerManager labelAnchorId={labelAnchorId} onLoadingChange={onLoadingChange} />
            </MapInteractionsProvider>
          )}
          {loaded && <AdminBoundaries basemap={basemap} labelAnchorId={labelAnchorId} />}
          <MapControls />
        </ReactMapGL>
        {children}
        <MapLoader mapLoading={!loaded || loadingLayerIds === null} loadingLayerIds={loadingLayerIds ?? []} />
      </div>
    </TimeframeQueryProvider>
  );
}
