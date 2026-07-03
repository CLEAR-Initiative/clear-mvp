import { useEffect, useRef, useState } from "react";
import type { MapMarker } from "~/components/map/crisis-map";
import type { GqlLocation } from "~/lib/types/graphql";

const MAP_UI_SETTLE_MS = 650;

interface UseNavigationMapDisplayOptions {
  isPending: boolean;
  mapMarkers: MapMarker[];
  primaryLocation: GqlLocation | null | undefined;
  sevColor: string;
  navigationMapCenter: [number, number] | undefined;
  resolvedMapCenter: [number, number];
}

/**
 * Keeps minimap markers/region stable while navigating, flies to list coordinates
 * immediately, and defers marker/region updates until after the fly animation.
 */
export function useNavigationMapDisplay({
  isPending,
  mapMarkers,
  primaryLocation,
  sevColor,
  navigationMapCenter,
  resolvedMapCenter,
}: UseNavigationMapDisplayOptions) {
  const stableMarkersRef = useRef(mapMarkers);
  const stableLocationRef = useRef(primaryLocation);
  const stableSevColorRef = useRef(sevColor);
  const [deferMapUi, setDeferMapUi] = useState(false);

  useEffect(() => {
    if (isPending) {
      setDeferMapUi(true);
      return;
    }

    const timer = window.setTimeout(() => {
      stableMarkersRef.current = mapMarkers;
      stableLocationRef.current = primaryLocation;
      stableSevColorRef.current = sevColor;
      setDeferMapUi(false);
    }, MAP_UI_SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [isPending, mapMarkers, primaryLocation, sevColor]);

  const mapFrozen = isPending || deferMapUi;

  return {
    displayMarkers: mapFrozen ? stableMarkersRef.current : mapMarkers,
    displayLocation: mapFrozen ? stableLocationRef.current : primaryLocation,
    displaySevColor: mapFrozen ? stableSevColorRef.current : sevColor,
    displayCenter: navigationMapCenter ?? resolvedMapCenter,
    holdRegionFit: mapFrozen,
    flyDuration: 600,
  };
}
