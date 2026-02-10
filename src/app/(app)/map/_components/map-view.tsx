"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapFilters } from "./map-filters";

const CrisisMap = dynamic(
  () =>
    import("~/components/map/crisis-map").then((mod) => ({
      default: mod.CrisisMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted/50">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    ),
  },
);

interface Crisis {
  id: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  severity: string;
  type: string;
  status: string;
  affectedPopulation: number;
}

interface MapViewProps {
  crises: Crisis[];
}

export function MapView({ crises }: MapViewProps) {
  const [filters, setFilters] = useState<{
    severity?: string;
    type?: string;
    status?: string;
  }>({});

  const visibleCount = useMemo(() => {
    let filtered = crises.filter(
      (c) => c.latitude != null && c.longitude != null,
    );
    if (filters.severity)
      filtered = filtered.filter((c) => c.severity === filters.severity);
    if (filters.type)
      filtered = filtered.filter((c) => c.type === filters.type);
    if (filters.status)
      filtered = filtered.filter((c) => c.status === filters.status);
    return filtered.length;
  }, [crises, filters]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crisis Map</h1>
          <p className="text-sm text-muted-foreground">
            Geospatial crisis visualization
          </p>
        </div>
        <MapFilters
          filters={filters}
          onFiltersChange={setFilters}
          crisisCount={crises.filter((c) => c.latitude != null && c.longitude != null).length}
          visibleCount={visibleCount}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Severity:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
          Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-orange-600" />
          High
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-600" />
          Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-green-600" />
          Low
        </span>
      </div>

      <div className="min-h-0 flex-1">
        <CrisisMap crises={crises} filters={filters} />
      </div>
    </div>
  );
}
