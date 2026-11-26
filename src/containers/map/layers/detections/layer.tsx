"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Layer, Source } from "react-map-gl/mapbox";
import { useDetectionsForMap } from "../../hooks/use-detections-for-map";
import { useThemeColors } from "../../hooks/use-theme-color";
import { useMapInteractions } from "../../interactions";
import type { DetectionKind } from "../../selection";
import type { LayerProps } from "../types";
import { DetectionClusterMarker } from "./cluster-marker";
import { clusterLeafIds, type ClusterMarker } from "./clusters";
import { FADE_END, HEAT_POINTS_MIN_ZOOM, heatOpacity, pointOpacity } from "./density-fade";
import { selectionHighlight } from "./selection-highlight";
import { parseSignalsSettings } from "./settings";
import { HEATMAP_TOKENS, SELECTION_TOKENS, SEVERITY_TOKENS, SURFACE_TOKENS } from "./severity-tokens";
import { detectionsToFeatures } from "./to-features";
import { DetectionTooltip } from "./tooltip";
import { useSelectableDetections } from "./use-selectable-signals";
import { useSelectionBlink } from "./use-selection-blink";
import { useSignalClusters } from "./use-signal-clusters";
import { useSignalTooltip } from "./use-signal-tooltip";

const POINT_RADIUS = 5;

export function DetectionsLayer({
  id,
  kind,
  beforeId,
  opacity,
  visible,
  settings,
  onStatusChange,
}: LayerProps & { kind: DetectionKind }) {
  const shown = visible && opacity > 0;
  const { density } = parseSignalsSettings(settings);
  const heat = density === "heatmap";
  const { selection, select } = useMapInteractions();
  const query = useDetectionsForMap(kind);
  const severity = useThemeColors(SEVERITY_TOKENS);
  const surface = useThemeColors(SURFACE_TOKENS);
  const selectionColors = useThemeColors(SELECTION_TOKENS);
  const heatColors = useThemeColors(HEATMAP_TOKENS);
  const data = useMemo(() => detectionsToFeatures(query.data ?? []), [query.data]);
  const { clusters, points, index } = useSignalClusters(data, !shown ? "none" : heat ? "stacked" : "clusters");
  const pointIds = useMemo(() => new Set(points.features.map((feature) => feature.properties.id)), [points]);
  const hovered = useSignalTooltip(id, shown, density);
  useSelectableDetections(id, kind);

  const highlight = useMemo(
    () => selectionHighlight({ kind, selection, data, pointIds, clusters, index }),
    [kind, selection, data, pointIds, clusters, index],
  );

  useSelectionBlink(`${id}-selected`, opacity, shown && highlight.pointId !== null);

  const onSelectStack = useCallback(
    (cluster: ClusterMarker) =>
      select({
        type: "stack",
        kind,
        coordinates: cluster.coordinates,
        ids: clusterLeafIds(index, cluster.clusterId),
      }),
    [select, index, kind],
  );

  const loading = shown && (query.isPending || query.isPlaceholderData);

  useEffect(() => {
    onStatusChange({ loading, error: query.isError });
  }, [loading, query.isError, onStatusChange]);

  return (
    <>
      <Source id={`${id}-heat`} type="geojson" data={data}>
        <Layer
          id={`${id}-heat`}
          type="heatmap"
          beforeId={beforeId}
          maxzoom={FADE_END}
          layout={{ visibility: shown && heat ? "visible" : "none" }}
          paint={{
            "heatmap-weight": ["match", ["get", "severity"], "critical", 1, "high", 0.85, 0.65],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.15, heatColors.low,
              1, heatColors.high,
            ],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 5, 1.35],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 12, 5, 28],
            "heatmap-opacity": heatOpacity(opacity),
          }}
        />
      </Source>
      <Source id={id} type="geojson" data={points}>
        <Layer
          id={id}
          type="circle"
          beforeId={beforeId}
          minzoom={heat ? HEAT_POINTS_MIN_ZOOM : 0}
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
            "circle-opacity": heat ? pointOpacity(opacity) : opacity,
            "circle-stroke-opacity": heat ? pointOpacity(opacity) : opacity,
          }}
        />
        <Layer
          id={`${id}-selected`}
          type="circle"
          beforeId={beforeId}
          minzoom={heat ? HEAT_POINTS_MIN_ZOOM : 0}
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
          <DetectionClusterMarker
            key={cluster.key}
            layerId={id}
            cluster={cluster}
            opacity={opacity}
            selected={cluster.key === highlight.clusterKey}
            onSelectStack={onSelectStack}
          />
        ))}
      {hovered && pointIds.has(hovered.id) && <DetectionTooltip layerId={id} detection={hovered} />}
    </>
  );
}
