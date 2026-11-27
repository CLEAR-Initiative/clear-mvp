import { SEVERITY_BUCKETS, SEVERITY_TOKENS } from "./severity-tokens";
import type { SeverityBucket } from "./to-features";

export type SeverityCounts = Record<SeverityBucket, number>;

export type DonutSegment = { bucket: SeverityBucket; from: number; to: number };

export function emptySeverityCounts(): SeverityCounts {
  return { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
}

export function donutBand(diameter: number): number {
  return Math.round(diameter * 0.2);
}

export function donutSegments(counts: SeverityCounts): DonutSegment[] {
  const total = SEVERITY_BUCKETS.reduce((sum, bucket) => sum + counts[bucket], 0);
  if (total === 0) return [];
  const segments: DonutSegment[] = [];
  let seen = 0;
  for (const bucket of SEVERITY_BUCKETS) {
    if (counts[bucket] === 0) continue;
    const from = (seen / total) * 360;
    seen += counts[bucket];
    segments.push({ bucket, from, to: (seen / total) * 360 });
  }
  return segments;
}

export function donutGradient(counts: SeverityCounts): string {
  const stops = donutSegments(counts).map(
    ({ bucket, from, to }) => `var(${SEVERITY_TOKENS[bucket]}) ${from}deg ${to}deg`,
  );
  return `conic-gradient(${stops.join(", ")})`;
}
