/* ─── GraphQL entity types matching the Apollo Server schema ─── */

/* ─── GeoJSON types ─── */

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

/* ─── Location ─── */

export interface GqlDetectionLocation {
  id: string;
  location: {
    id: string;
    name: string;
    geoId: string;
    level: number;
    geometry: GeoJSONPoint | null | undefined;
  };
  createdAt: string;
}

export interface GqlDataSource {
  id: string;
  name: string;
  type: string;
}

export interface GqlSource {
  id: string;
  title: string;
  confidence: number | null;
  status: "raw" | "processed" | "ignored";
  detectedAt: string;
  rawData: unknown;
  dataSource: GqlDataSource | null;
  locations: GqlDetectionLocation[];
  createdAt: string;
  updatedAt: string;
}

export interface GqlSignal {
  id: string;
  source: GqlSource;
  publishedAt: string;
  collectedAt: string;
  description: string | null;
  events: Array<{ id: string }>;
  primaryOf: Array<{ id: string }>;
  // TODO: uncomment after Prisma migration adds these fields
  // title?: string | null;
}

export interface GqlAlertLocation {
  id: string;
  location: {
    id: string;
    name: string;
    level: number;
    geometry: GeoJSONPoint | null | undefined;
  };
  createdAt: string;
}

export interface GqlEvent {
  id: string;
  description: string | null;
  eventType: string;
  severity: number;
  status: "draft" | "published" | "archived";
  rank: number;
  isAlert: boolean;
  populationAffected: string | null;
  metadata: unknown;
  signals: GqlSignal[];
  primarySignal: GqlSignal | null;
  firstSignalCreatedAt: string;
  lastSignalCreatedAt: string;
  locations: GqlAlertLocation[];
  createdAt: string;
  updatedAt: string;
  // TODO: uncomment after Prisma migration adds these fields
  // title?: string | null;
  // types?: string[] | null;        // replaces single eventType
  // validFrom?: string | null;
  // validTo?: string | null;
  // descriptionSignals?: unknown;   // JSON blob of per-signal descriptions
}

/** @deprecated Use GqlSource — the API renamed Detection to Source */
export type GqlDetection = GqlSource;

export interface GqlAlert {
  id: string;
  description: string | null;
  eventType: string;
  severity: number;
  status: "draft" | "published" | "archived";
  signals: GqlSignal[];
  primarySignal: GqlSignal | null;
  locations: GqlAlertLocation[];
  metadata: unknown;
  firstSignalCreatedAt: string;
  lastSignalCreatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/* ─── Severity helpers ─── */

/** Map severity (1-5) to UI severity labels */
export function mapSeverity(severity: number): "critical" | "high" | "medium" | "low" {
  if (severity >= 5) return "critical";
  if (severity >= 4) return "high";
  if (severity >= 3) return "medium";
  return "low";
}

/** Map severity to display color */
export function severityColor(severity: number): string {
  if (severity >= 5) return "#DC2626";
  if (severity >= 4) return "#D97706";
  if (severity >= 3) return "#F59E0B";
  return "#059669";
}
