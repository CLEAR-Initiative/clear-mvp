import Supercluster from "supercluster";
import { emptySeverityCounts, type SeverityCounts } from "./donut";
import { SEVERITY_BUCKETS } from "./severity-tokens";
import type { DetectionFeature, DetectionFeatureCollection } from "./to-features";

export const CLUSTER_MAX_ZOOM = 22;
const CLUSTER_RADIUS_PX = 60;
const CLUSTER_EXTENT = 512;

/**
 * Signals Supercluster still groups at the deepest zoom form a stack. They lie within its cluster radius at
 * that zoom: `radius / (extent * 2^zoom)` of the world's width, ~0.00001° (~1.1 m). A stack's point is rounded
 * to 5 decimals in the URL (±0.000005°), so membership allows for both and stays below the gap between two
 * stacks that show as separate clusters.
 */
const STACK_TOLERANCE_DEG = (360 * CLUSTER_RADIUS_PX) / (CLUSTER_EXTENT * 2 ** CLUSTER_MAX_ZOOM) + 0.000005;

export function isSamePoint(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) <= STACK_TOLERANCE_DEG && Math.abs(a[1] - b[1]) <= STACK_TOLERANCE_DEG;
}

export type SignalIndex = Supercluster<DetectionFeature["properties"], SeverityCounts>;

export type ViewBounds = { west: number; south: number; east: number; north: number };

export type ClusterMarker = {
  key: string;
  clusterId: number;
  count: number;
  coordinates: [number, number];
  expansionZoom: number;
  stacked: boolean;
  severity: SeverityCounts;
};

export function createSignalIndex(collection: DetectionFeatureCollection): SignalIndex {
  const index: SignalIndex = new Supercluster({
    radius: CLUSTER_RADIUS_PX,
    extent: CLUSTER_EXTENT,
    maxZoom: CLUSTER_MAX_ZOOM,
    map: ({ severity }) => ({ ...emptySeverityCounts(), [severity]: 1 }),
    reduce: (accumulated, counts) => {
      for (const bucket of SEVERITY_BUCKETS) accumulated[bucket] += counts[bucket];
    },
  });
  index.load(collection.features);
  return index;
}

function inLngRange(lng: number, west: number, east: number): boolean {
  if (east - west >= 360) return true;
  return lng + Math.ceil((west - lng) / 360) * 360 <= east;
}

const WORLD_BBOX: [number, number, number, number] = [-180, -90, 180, 90];

export function worldPoints(index: SignalIndex, zoom: number): DetectionFeatureCollection {
  const points = index
    .getClusters(WORLD_BBOX, zoom)
    .filter((feature) => !("cluster" in feature.properties) || !feature.properties.cluster) as DetectionFeature[];
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
      severity: pickSeverityCounts(properties),
    });
  }

  return clusters;
}

function pickSeverityCounts(properties: SeverityCounts): SeverityCounts {
  const counts = emptySeverityCounts();
  for (const bucket of SEVERITY_BUCKETS) counts[bucket] = properties[bucket];
  return counts;
}

export function clusterLeafIds(index: SignalIndex, clusterId: number): string[] {
  return index.getLeaves(clusterId, Infinity).map((leaf) => leaf.properties.id);
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
