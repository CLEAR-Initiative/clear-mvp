import { useState, useCallback } from "react";
import type { MapMarker } from "~/components/map/crisis-map";
import type { CrisisMarker } from "~/app/(app)/map/_components/map-markers-data";

interface UseMarkerHoverReturn {
  hoveredMarkerId: number | null;
  hoveredSourceId: string | null;
  getCardProps: (sourceId: string) => {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    style: { background?: string; transition: string };
  };
  onMarkerHover: (mk: MapMarker | null) => void;
}

export function useMarkerHover(mapMarkers: MapMarker[]): UseMarkerHoverReturn {
  const [hoveredMarkerId, setHoveredMarkerId] = useState<number | null>(null);
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);

  const getCardProps = useCallback((sourceId: string) => ({
    onMouseEnter: () => {
      const mk = mapMarkers.find((m) => (m as CrisisMarker).eventId === sourceId);
      setHoveredMarkerId(mk?.id ?? null);
    },
    onMouseLeave: () => setHoveredMarkerId(null),
    style: {
      background: hoveredSourceId === sourceId ? "var(--color-info-light)" : undefined,
      transition: "background 0.15s ease",
    } as { background?: string; transition: string },
  }), [mapMarkers, hoveredSourceId]);

  const onMarkerHover = useCallback((mk: MapMarker | null) => {
    setHoveredSourceId(mk ? ((mk as CrisisMarker).eventId ?? null) : null);
  }, []);

  return { hoveredMarkerId, hoveredSourceId, getCardProps, onMarkerHover };
}
