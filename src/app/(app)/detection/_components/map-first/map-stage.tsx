"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type MutableRefObject, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Box } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { CrisisMapApi, MapMarker, MarkerScreenPoint } from "~/components/map/crisis-map";
import { clientRectCenterInContainer } from "~/lib/map/pin-elevation";
import type { BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { MapPanelBar } from "~/app/(app)/map/_components/map-panel-bar";
import { MapPanelConnectors, type PanelGeometry } from "~/app/(app)/map/_components/map-panel-connectors";
import { PlaceLabels, type PlaceLabel, type PlaceLabelsHandle } from "./place-labels";
import { DetectionMarkerPreview } from "./detection-marker-preview";
import css from "./map-first.module.css";

/** District labels start at zoom 6 (for picked states) and 7. */
const DISTRICT_ZOOM = 6;

const CrisisMap = dynamic(() => import("~/components/map/crisis-map").then((m) => m.CrisisMap), {
  ssr: false,
  loading: () => <Box w="100%" h="100%" bg="var(--color-bg-primary)" />,
});

interface MapStageProps {
  mapApiRef: MutableRefObject<CrisisMapApi | null>;
  markers: MapMarker[];
  hoveredMarkerId: number | null;
  selectedMarkerId: number | null;
  onMarkerClick: (marker: MapMarker) => void;
  onMarkerHover: (marker: MapMarker | null) => void;
  preview?: Omit<ComponentProps<typeof DetectionMarkerPreview>, "anchor" | "onGeometryChange">;
  center: [number, number];
  zoom: number;
  fitBoundsGeometry?: unknown;
  adminBoundaries?: { id: string; name: string; geometry: unknown }[];
  adminBoundaryLevel?: 0 | 1 | 2;
  scopeCountryIsos?: string[];
  mapboxAdmin1Isos?: string[];
  boundaryLevel?: BoundaryLevel;
  onBoundaryLevelChange?: (level: BoundaryLevel) => void;
  focusCountryPCode?: string;
  focusCountryName?: string;
  focusCountryGeometry?: unknown;
  listHidden: boolean;
  onToggleList: () => void;
  /** Clickable state and district names. */
  placeLabels: readonly PlaceLabel[];
  onPickPlace: (id: string, additive: boolean) => void;
  /** Fired once, the first time the map zooms in far enough for district labels. */
  onDistrictZoom: () => void;
  /** The timeline. */
  children: ReactNode;
}

/**
 * The full-height map: the same CrisisMap and MapPanelBar (layers, legend)
 * the detection tabs used before, plus the list handle and the timeline on top.
 */
export function MapStage(props: MapStageProps) {
  const {
    markers, selectedMarkerId, hoveredMarkerId, onMarkerClick, onMarkerHover, preview, center, zoom, fitBoundsGeometry, adminBoundaries, adminBoundaryLevel,
    scopeCountryIsos, mapboxAdmin1Isos, boundaryLevel, onBoundaryLevelChange, focusCountryPCode, focusCountryName,
    focusCountryGeometry, listHidden, onToggleList, placeLabels, onPickPlace, onDistrictZoom, children, mapApiRef,
  } = props;
  const t = useTranslations("detection.mapFirst");
  const stageRef = useRef<HTMLDivElement>(null);
  const selectedElement = useRef<{ id: number | null; el?: HTMLElement | null }>({ id: null });
  const [markerAnchor, setMarkerAnchor] = useState<{ id: number | null; point?: MarkerScreenPoint | null }>({ id: null });
  const [panelGeometry, setPanelGeometry] = useState<PanelGeometry | null>(null);
  const updateAnchor = useCallback(() => {
    const bounds = stageRef.current?.getBoundingClientRect();
    const { id, el } = selectedElement.current;
    const point = el?.isConnected && bounds ? clientRectCenterInContainer(el.getBoundingClientRect(), bounds) : null;
    const visible = point && bounds && point.x >= 0 && point.y >= 0 && point.x <= bounds.width && point.y <= bounds.height ? point : null;
    const next = el === undefined ? undefined : visible;
    setMarkerAnchor((prev) => {
      const samePoint = prev.point === next ||
        (prev.point && next && prev.point.x === next.x && prev.point.y === next.y);
      return prev.id === id && samePoint ? prev : { id, point: next };
    });
  }, []);
  const onSelectedElement = useCallback((id: number | null, el: HTMLElement | null | undefined) => {
    if (selectedElement.current.id === id && selectedElement.current.el === el) return;
    selectedElement.current = { id, el };
    updateAnchor();
  }, [updateAnchor]);
  const anchor = selectedMarkerId === markerAnchor.id ? markerAnchor.point : undefined;
  const connector = useMemo(() => {
    if (!anchor || !panelGeometry || selectedMarkerId == null) return null;
    return <MapPanelConnectors links={[{ id: selectedMarkerId, pin: anchor, panel: panelGeometry }]} />;
  }, [selectedMarkerId, anchor, panelGeometry]);
  const labelsRef = useRef<PlaceLabelsHandle>(null);
  const zoomedIn = useRef(false);
  const onDistrictZoomRef = useRef(onDistrictZoom);
  useEffect(() => {
    onDistrictZoomRef.current = onDistrictZoom;
  }, [onDistrictZoom]);
  // Every camera frame: move the labels and the connector's pin endpoint, and note the first zoom-in.
  const onMapMove = useCallback(() => {
    labelsRef.current?.layout();
    if (selectedElement.current.el) updateAnchor();
    if (zoomedIn.current) return;
    const zoom = mapApiRef.current?.getViewCamera()?.zoom;
    if (zoom != null && zoom >= DISTRICT_ZOOM) {
      zoomedIn.current = true;
      onDistrictZoomRef.current();
    }
  }, [mapApiRef, updateAnchor]);

  return (
    <div ref={stageRef} className={css.map}>
      <MapLayer
        mapApiRef={mapApiRef}
        onMapMove={onMapMove}
        connector={connector}
        hideStateLabels={placeLabels.some((l) => l.level === 1)}
        markers={markers}
        selectedMarkerId={selectedMarkerId}
        onMarkerClick={onMarkerClick}
        onSelectedElement={onSelectedElement}
        hoveredMarkerId={hoveredMarkerId}
        onMarkerHover={onMarkerHover}
        center={center}
        zoom={zoom}
        fitBoundsGeometry={fitBoundsGeometry}
        adminBoundaries={adminBoundaries}
        adminBoundaryLevel={adminBoundaryLevel}
        scopeCountryIsos={scopeCountryIsos}
        mapboxAdmin1Isos={mapboxAdmin1Isos}
        boundaryLevel={boundaryLevel}
        onBoundaryLevelChange={onBoundaryLevelChange}
        focusCountryPCode={focusCountryPCode}
        focusCountryName={focusCountryName}
        focusCountryGeometry={focusCountryGeometry}
      />

      <PlaceLabels ref={labelsRef} labels={placeLabels} apiRef={mapApiRef} onPick={onPickPlace} />

      <button
        type="button"
        className={`${css.frost} ${css.listHandle}`}
        title={listHidden ? t("showList") : t("hideList")}
        aria-label={listHidden ? t("showList") : t("hideList")}
        onClick={onToggleList}
      >
        {listHidden ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
      </button>

      {children}
      {preview && <DetectionMarkerPreview {...preview} anchor={preview.hasMarker ? anchor : null} onGeometryChange={setPanelGeometry} />}
    </div>
  );
}

type MapLayerProps = Omit<MapStageProps, "listHidden" | "onToggleList" | "children" | "placeLabels" | "onPickPlace" | "onDistrictZoom" | "preview"> & {
  onMapMove: () => void;
  hideStateLabels: boolean;
  onSelectedElement: (id: number | null, el: HTMLElement | null | undefined) => void;
  connector: ReactNode;
};

/**
 * CrisisMap and its MapPanelBar, memoised so opening a filter popover or
 * typing in the list doesn't re-render the map.
 */
const MapLayer = memo(function MapLayer(props: MapLayerProps) {
  const {
    markers, selectedMarkerId, hoveredMarkerId, onMarkerClick, onMarkerHover, onSelectedElement, center, zoom, fitBoundsGeometry, adminBoundaries, adminBoundaryLevel,
    scopeCountryIsos, mapboxAdmin1Isos, boundaryLevel, onBoundaryLevelChange, focusCountryPCode, focusCountryName,
    focusCountryGeometry, mapApiRef, onMapMove, hideStateLabels, connector,
  } = props;
  const [showPopulation, setShowPopulation] = useState(false);
  return (
    <>
      <CrisisMap
        markers={markers}
        center={center}
        zoom={zoom}
        className="w-full h-full"
        showDensityHeatmap={false}
        focusCountryPCode={focusCountryPCode}
        focusCountryName={focusCountryName}
        focusCountryGeometry={focusCountryGeometry}
        fitBoundsGeometry={fitBoundsGeometry}
        adminBoundaries={adminBoundaries}
        adminBoundaryLevel={adminBoundaryLevel}
        scopeCountryIsos={scopeCountryIsos}
        mapboxAdmin1Isos={mapboxAdmin1Isos}
        hoveredMarkerId={hoveredMarkerId}
        selectedMarkerId={selectedMarkerId}
        onSelectedMarkerElement={onSelectedElement}
        onMarkerClick={onMarkerClick}
        onMarkerHover={onMarkerHover}
        mapApiRef={mapApiRef}
        onMapMove={onMapMove}
        onCameraChange={onMapMove}
        hideStateLabels={hideStateLabels}
      >
        {connector}
      </CrisisMap>
      <MapPanelBar
        showPopulation={showPopulation}
        onShowPopulationChange={setShowPopulation}
        boundaryLevel={boundaryLevel}
        onBoundaryLevelChange={onBoundaryLevelChange}
        placement="right"
      />
    </>
  );
});
