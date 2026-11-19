"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMapGL, { AttributionControl, type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import { useIsDark } from "~/hooks/use-is-dark";
import { setMapPanelCollapsedCookie } from "~/lib/map-panel-collapsed-cookie";
import { BASEMAP_STYLES, PROJECTION, ZOOM_RANGE } from "./constants";
import { isSameView, useMapView, type LngLat } from "./hooks/use-map-view";
import { useEaseToInset, useInsetLeft } from "./hooks/use-inset-padding";
import { findLabelAnchorId } from "./label-anchor";
import { findReliefAnchorId } from "./basemaps/relief-anchor";
import { Topography } from "./basemaps/topography";
import { MapControls } from "./controls";
import { useBasemap } from "./hooks/use-basemap";
import { LayerManager } from "./layer-manager";
import { MapPanel } from "./panel";

import "mapbox-gl/dist/mapbox-gl.css";

export default function MapV2({ initialPanelCollapsed }: { initialPanelCollapsed: boolean }) {
  const isDark = useIsDark();
  const [panelCollapsed, setPanelCollapsed] = useState(initialPanelCollapsed);
  const togglePanel = useCallback(() => {
    setPanelCollapsed(!panelCollapsed);
    setMapPanelCollapsedCookie(!panelCollapsed);
  }, [panelCollapsed]);
  const mapRef = useRef<MapRef>(null);
  const insetProbeRef = useRef<HTMLDivElement>(null);
  const insetLeft = useInsetLeft(insetProbeRef);
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

  useEaseToInset(mapRef, insetLeft, loaded);

  return (
    <div className="map-v2-root" data-panel-collapsed={panelCollapsed ? "true" : undefined}>
      <div ref={insetProbeRef} className="map-v2-inset-probe" aria-hidden />
      <MapPanel collapsed={panelCollapsed} />
      {insetLeft != null && (
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
          initialViewState={{ ...initialViewState, padding: { top: 0, right: 0, bottom: 0, left: insetLeft } }}
          onMoveEnd={onMoveEnd}
          onLoad={onLoad}
          style={{ width: "100%", height: "100%" }}
        >
          <AttributionControl position="bottom-right" compact />
          {loaded && basemap === "topography" && <Topography beforeId={reliefAnchorId} />}
          {loaded && <LayerManager labelAnchorId={labelAnchorId} />}
          <MapControls panelCollapsed={panelCollapsed} onPanelToggle={togglePanel} />
        </ReactMapGL>
      )}
    </div>
  );
}
