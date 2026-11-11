"use client";

import { memo, useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Box } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import type { CrisisMapApi, MapMarker } from "~/components/map/crisis-map";
import type { BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { MapPanelBar } from "~/app/(app)/map/_components/map-panel-bar";
import { PlaceLabels, type PlaceLabel, type PlaceLabelsHandle } from "./place-labels";
import css from "./map-first.module.css";

/** District labels start at zoom 6 (for picked states) and 7. */
const DISTRICT_ZOOM = 6;

const CrisisMap = dynamic(() => import("~/components/map/crisis-map").then((m) => m.CrisisMap), {
  ssr: false,
  loading: () => <Box w="100%" h="100%" bg="var(--color-bg-primary)" />,
});

interface MapStageProps {
  markers: MapMarker[];
  hoveredMarkerId: number | null;
  onMarkerHover: (marker: MapMarker | null) => void;
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
    markers, hoveredMarkerId, onMarkerHover, center, zoom, fitBoundsGeometry, adminBoundaries, adminBoundaryLevel,
    scopeCountryIsos, mapboxAdmin1Isos, boundaryLevel, onBoundaryLevelChange, focusCountryPCode, focusCountryName,
    focusCountryGeometry, listHidden, onToggleList, placeLabels, onPickPlace, onDistrictZoom, children,
  } = props;
  const t = useTranslations("detection.mapFirst");
  const apiRef = useRef<CrisisMapApi | null>(null);
  const labelsRef = useRef<PlaceLabelsHandle>(null);
  const zoomedIn = useRef(false);
  const onDistrictZoomRef = useRef(onDistrictZoom);
  useEffect(() => {
    onDistrictZoomRef.current = onDistrictZoom;
  }, [onDistrictZoom]);
  // Every camera frame: move the labels, and note the first zoom-in.
  const onMapMove = useCallback(() => {
    labelsRef.current?.layout();
    if (zoomedIn.current) return;
    const zoom = apiRef.current?.getViewCamera()?.zoom;
    if (zoom != null && zoom >= DISTRICT_ZOOM) {
      zoomedIn.current = true;
      onDistrictZoomRef.current();
    }
  }, []);

  return (
    <div className={css.map}>
      <MapLayer
        mapApiRef={apiRef}
        onMapMove={onMapMove}
        hideStateLabels={placeLabels.some((l) => l.level === 1)}
        markers={markers}
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

      <PlaceLabels ref={labelsRef} labels={placeLabels} apiRef={apiRef} onPick={onPickPlace} />

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
    </div>
  );
}

type MapLayerProps = Omit<MapStageProps, "listHidden" | "onToggleList" | "children" | "placeLabels" | "onPickPlace" | "onDistrictZoom"> & {
  mapApiRef: MutableRefObject<CrisisMapApi | null>;
  onMapMove: () => void;
  hideStateLabels: boolean;
};

/**
 * CrisisMap and its MapPanelBar, memoised so opening a filter popover or
 * typing in the list doesn't re-render the map.
 */
const MapLayer = memo(function MapLayer(props: MapLayerProps) {
  const {
    markers, hoveredMarkerId, onMarkerHover, center, zoom, fitBoundsGeometry, adminBoundaries, adminBoundaryLevel,
    scopeCountryIsos, mapboxAdmin1Isos, boundaryLevel, onBoundaryLevelChange, focusCountryPCode, focusCountryName,
    focusCountryGeometry, mapApiRef, onMapMove, hideStateLabels,
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
        onMarkerHover={onMarkerHover}
        mapApiRef={mapApiRef}
        onMapMove={onMapMove}
        onCameraChange={onMapMove}
        hideStateLabels={hideStateLabels}
      />
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
