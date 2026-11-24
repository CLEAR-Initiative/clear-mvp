import type { SeverityBucket } from "./to-features";

export const SEVERITY_BUCKETS: SeverityBucket[] = ["critical", "high", "medium", "low", "unknown"];

export const SEVERITY_TOKENS: Record<SeverityBucket, string> = {
  critical: "--color-severity-critical",
  high: "--color-severity-high",
  medium: "--color-severity-medium",
  low: "--color-severity-low",
  unknown: "--color-text-muted",
};

export const SURFACE_TOKENS = { stroke: "--color-bg-primary" } as const;

export const SELECTION_TOKENS = { ring: "--map-selection" } as const;

export const HEATMAP_TOKENS = { low: "--map-heatmap-low", high: "--map-heatmap-high" } as const;
