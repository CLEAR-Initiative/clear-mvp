"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Layer, Source } from "react-map-gl/mapbox";
import { api } from "~/trpc/react";
import { useThemeColors } from "../../hooks/use-theme-color";
import { useMapInteractions } from "../../interactions";
import { SelectionIndicator } from "../../selection-indicator";
import type { LayerProps } from "../types";
import { SignalClusterMarker } from "./cluster-marker";
import { clusterLeafIds, type ClusterMarker } from "./clusters";
import { selectionHighlight } from "./selection-highlight";
import { SELECTION_TOKENS, SEVERITY_TOKENS, SURFACE_TOKENS } from "./severity-tokens";
import { signalsToFeatures } from "./to-features";
import { SignalTooltip } from "./tooltip";
import { useSelectableSignals } from "./use-selectable-signals";
import { useSelectionBlink } from "./use-selection-blink";
import { useSignalClusters } from "./use-signal-clusters";
import { useSignalTooltip } from "./use-signal-tooltip";
import { useSignalsWindow } from "./use-signals-window";

const POINT_RADIUS = 5;

export function SignalsLayer({ id, beforeId, opacity, visible, onStatusChange }: LayerProps) {
  const shown = visible && opacity > 0;
  const range = useSignalsWindow();
  const { selection, select } = useMapInteractions();
  const query = api.signals.forMap.useQuery(
    { ...range, includeDummy: true },
    { placeholderData: (prev) => prev },
  );
  const severity = useThemeColors(SEVERITY_TOKENS);
  const surface = useThemeColors(SURFACE_TOKENS);
  const selectionColors = useThemeColors(SELECTION_TOKENS);
  const data = useMemo(() => signalsToFeatures(query.data ?? []), [query.data]);
  const { clusters, points, index } = useSignalClusters(data, shown);
  const pointIds = useMemo(() => new Set(points.features.map((feature) => feature.properties.id)), [points]);
  const hovered = useSignalTooltip(id, shown);
  useSelectableSignals(id);

  const highlight = useMemo(
    () => selectionHighlight({ selection, data, pointIds, clusters, index }),
    [selection, data, pointIds, clusters, index],
  );

  useSelectionBlink(`${id}-selected`, opacity, shown && highlight.pointId !== null);

  const onSelectStack = useCallback(
    (cluster: ClusterMarker) =>
      select({ type: "signal-stack", coordinates: cluster.coordinates, signalIds: clusterLeafIds(index, cluster.clusterId) }),
    [select, index],
  );

  const loading = shown && (query.isPending || query.isPlaceholderData);

  useEffect(() => {
    onStatusChange({ loading, error: query.isError });
  }, [loading, query.isError, onStatusChange]);

  return (
    <>
      <Source id={id} type="geojson" data={points}>
        <Layer
          id={id}
          type="circle"
          beforeId={beforeId}
          layout={{ visibility: shown ? "visible" : "none" }}
          paint={{
            "circle-color": [
              "match",
              ["get", "severity"],
              "critical", severity.critical,
              "high", severity.high,
              "medium", severity.medium,
              "low", severity.low,
              severity.unknown,
            ],
            "circle-radius": POINT_RADIUS,
            "circle-stroke-width": 1,
            "circle-stroke-color": surface.stroke,
            "circle-opacity": opacity,
            "circle-stroke-opacity": opacity,
          }}
        />
        <Layer
          id={`${id}-selected`}
          type="circle"
          beforeId={beforeId}
          filter={["==", ["get", "id"], highlight.pointId ?? ""]}
          layout={{ visibility: shown && highlight.pointId ? "visible" : "none" }}
          paint={{
            "circle-color": "rgba(0, 0, 0, 0)",
            "circle-radius": POINT_RADIUS + 3,
            "circle-stroke-width": 4,
            "circle-stroke-color": selectionColors.ring,
            "circle-stroke-opacity": opacity,
          }}
        />
      </Source>
      {shown &&
        clusters.map((cluster) => (
          <SignalClusterMarker
            key={cluster.key}
            cluster={cluster}
            opacity={opacity}
            selected={cluster.key === highlight.clusterKey}
            onSelectStack={onSelectStack}
          />
        ))}
      {shown && highlight.coordinates && <SelectionIndicator coordinates={highlight.coordinates} />}
      {hovered && pointIds.has(hovered.id) && <SignalTooltip signal={hovered} />}
    </>
  );
}
