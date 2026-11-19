import Supercluster from "supercluster";
import type { SignalFeature, SignalFeatureCollection } from "./to-features";

export const CLUSTER_MAX_ZOOM = 22;

export type SignalIndex = Supercluster<SignalFeature["properties"]>;

export type ViewBounds = { west: number; south: number; east: number; north: number };

export type ClusterMarker = {
  key: string;
  clusterId: number;
  count: number;
  coordinates: [number, number];
  expansionZoom: number;
  stacked: boolean;
};

export function createSignalIndex(collection: SignalFeatureCollection): SignalIndex {
  const index: SignalIndex = new Supercluster({ radius: 60, maxZoom: CLUSTER_MAX_ZOOM });
  index.load(collection.features);
  return index;
}

function worldCopyOffset(lng: number): number {
  return Math.floor((lng + 180) / 360);
}

export function viewClusters(
  index: SignalIndex,
  { west, south, east, north }: ViewBounds,
  zoom: number,
): { clusters: ClusterMarker[]; points: SignalFeatureCollection } {
  const clusters: ClusterMarker[] = [];
  const points: SignalFeature[] = [];
  const firstCopy = worldCopyOffset(west);
  const lastCopy = worldCopyOffset(east);

  for (const feature of index.getClusters([west, south, east, north], zoom)) {
    const properties = feature.properties;
    if (!("cluster" in properties) || !properties.cluster) {
      points.push(feature as SignalFeature);
      continue;
    }
    const clusterId = properties.cluster_id;
    const expansionZoom = index.getClusterExpansionZoom(clusterId);
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    for (let copy = firstCopy; copy <= lastCopy; copy++) {
      const shifted = lng + 360 * copy;
      if (shifted < west || shifted > east) continue;
      clusters.push({
        key: `${clusterId}:${copy}`,
        clusterId,
        count: properties.point_count,
        coordinates: [shifted, lat],
        expansionZoom,
        stacked: expansionZoom > CLUSTER_MAX_ZOOM,
      });
    }
  }

  return { clusters, points: { type: "FeatureCollection", features: points } };
}

export function clusterSize(count: number): { outer: number; inner: number } {
  if (count < 10) return { outer: 23, inner: 15 };
  if (count < 25) return { outer: 31, inner: 17 };
  if (count < 100) return { outer: 53, inner: 21 };
  return { outer: 60, inner: 22 };
}

export function abbreviateCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10000) return `${Math.round(count / 100) / 10}k`;
  return `${Math.round(count / 1000)}k`;
}
