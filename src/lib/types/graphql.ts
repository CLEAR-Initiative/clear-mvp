/* ─── GraphQL entity types matching the Apollo Server schema ─── */

/* ─── GeoJSON ─── */

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONGeometry {
  type: string; // "Point" | "Polygon" | "MultiPolygon" | etc.
  coordinates: unknown;
}

/* ─── Shared sub-types ─── */

export interface GqlDataSource {
  id: string;
  name: string;
  type: string;
}

export interface GqlLocation {
  id: string;
  name: string;
  level: number;
  geoId?: string | null;
  geometry: GeoJSONGeometry | null | undefined;
}

/* ─── Signal ─── */

export interface GqlSignal {
  id: string;
  source: GqlDataSource;
  title: string | null;
  description: string | null;
  url: string | null;
  publishedAt: string;
  collectedAt: string;
  originLocation: GqlLocation | null;
  destinationLocation: GqlLocation | null;
  generalLocation: GqlLocation | null;
  events: Array<{ id: string }>;
}

/* ─── Event ─── */

export interface GqlEvent {
  id: string;
  title: string | null;
  description: string | null;
  /** Free-text category tags e.g. "WASH", "Conflict", "Displacement" */
  types: string[];
  /** Relative urgency score — used as severity proxy until a dedicated field is added */
  rank: number;
  firstSignalCreatedAt: string;
  lastSignalCreatedAt: string;
  populationAffected: string | null;
  originLocation: GqlLocation | null;
  destinationLocation: GqlLocation | null;
  generalLocation: GqlLocation | null;
  signals: GqlSignal[];
  /** Non-empty = this event has been flagged as an alert */
  alerts: Array<{ id: string; status: string }>;
}

/* ─── Alert ─── */

export interface GqlAlert {
  id: string;
  event: GqlEvent;
  status: "draft" | "published" | "archived";
}

/* ─── Severity helpers ─── */

/** Map rank/severity score to a UI severity bucket */
export function mapSeverity(rank: number): "critical" | "high" | "medium" | "low" {
  if (rank >= 5) return "critical";
  if (rank >= 4) return "high";
  if (rank >= 3) return "medium";
  return "low";
}

/** Map rank/severity score to a display colour */
export function severityColor(rank: number): string {
  if (rank >= 5) return "#DC2626";
  if (rank >= 4) return "#D97706";
  if (rank >= 3) return "#F59E0B";
  return "#059669";
}
