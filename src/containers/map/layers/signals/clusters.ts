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

function inLngRange(lng: number, west: number, east: number): boolean {
  if (east - west >= 360) return true;
  return lng + Math.ceil((west - lng) / 360) * 360 <= east;
}

const WORLD_BBOX: [number, number, number, number] = [-180, -90, 180, 90];

export function worldPoints(index: SignalIndex, zoom: number): SignalFeatureCollection {
  const points = index
    .getClusters(WORLD_BBOX, zoom)
    .filter((feature) => !("cluster" in feature.properties) || !feature.properties.cluster) as SignalFeature[];
  return { type: "FeatureCollection", features: points };
}

export function viewClusters(index: SignalIndex, { west, south, east, north }: ViewBounds, zoom: number): ClusterMarker[] {
  const clusters: ClusterMarker[] = [];

  for (const feature of index.getClusters(WORLD_BBOX, zoom)) {
    const properties = feature.properties;
    if (!("cluster" in properties) || !properties.cluster) continue;
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    if (lat < south || lat > north || !inLngRange(lng, west, east)) continue;
    const clusterId = properties.cluster_id;
    const expansionZoom = index.getClusterExpansionZoom(clusterId);
    clusters.push({
      key: String(clusterId),
      clusterId,
      count: properties.point_count,
      coordinates: [lng, lat],
      expansionZoom,
      stacked: expansionZoom > CLUSTER_MAX_ZOOM,
    });
  }

  return clusters;
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
