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
    latitude: number | null;
    longitude: number | null;
  };
  createdAt: string;
}

export interface GqlDataSource {
  id: string;
  name: string;
  type: string;
}

export interface GqlDetection {
  id: string;
  title: string;
  confidence: number | null;
  status: "raw" | "processed" | "ignored";
  detectedAt: string;
  rawData: unknown;
  source: GqlDataSource | null;
  locations: GqlDetectionLocation[];
  createdAt: string;
  updatedAt: string;
}

export interface GqlSignal {
  id: string;
  detection: GqlDetection;
  events: Array<{ id: string }>;
  primaryOf: Array<{ id: string }>;
}

export interface GqlEvent {
  id: string;
  signals: GqlSignal[];
  primarySignal: GqlSignal | null;
  alerts: Array<{ id: string; title: string }>;
}

export interface GqlAlertLocation {
  id: string;
  location: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  createdAt: string;
}

export interface GqlAlert {
  id: string;
  title: string;
  description: string;
  severity: number;
  status: "draft" | "published" | "archived";
  events: GqlEvent[];
  locations: GqlAlertLocation[];
  metadata: unknown;
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
