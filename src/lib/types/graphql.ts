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
  baseUrl?: string | null;
  infoUrl?: string | null;
}

export interface GqlLocationMetadata {
  type: string;
  data: Record<string, unknown>;
}

export interface GqlLocation {
  id: string;
  name: string;
  level: number;
  geoId?: string | null;
  ancestorIds?: string[];
  geometry: GeoJSONGeometry | null | undefined;
  population?: string | null;
  metadata?: GqlLocationMetadata[] | null;
  ancestors?: Array<{ id: string; name: string; level: number; population?: string | null; metadata?: GqlLocationMetadata[] | null }>;
}

/* ─── Signal ─── */

export interface GqlSignal {
  id: string;
  source: GqlDataSource;
  title: string | null;
  description: string | null;
  severity: number | null;
  url: string | null;
  publishedAt: string;
  collectedAt: string;
  media?: string[] | null;
  originLocation: GqlLocation | null;
  destinationLocation: GqlLocation | null;
  generalLocation: GqlLocation | null;
  events: Array<{ id: string }>;
}

/** Signal detail - richer events list returned by the `signal(id)` query */
export interface GqlSignalDetail extends Omit<GqlSignal, "events"> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData: Record<string, any>;
  events: Array<{
    id: string;
    title: string | null;
    types: string[];
    rank: number;
    severity: number | null;
    firstSignalCreatedAt: string;
    signals: Array<{
      id: string;
      title: string | null;
      description: string | null;
      publishedAt: string;
      source: { id: string; name: string; type: string };
    }>;
  }>;
}

/* ─── Event ─── */

export interface GqlEvent {
  id: string;
  title: string | null;
  description: string | null;
  /** Free-text category tags e.g. "WASH", "Conflict", "Displacement" */
  types: string[];
  /** Severity score 1-5 from pipeline classification */
  severity: number | null;
  /** Relative urgency score (0-1) */
  rank: number;
  validFrom: string;
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

/* ─── Comments ─── */

export interface GqlCommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

export interface GqlUserComment {
  id: string;
  comment: string;
  createdAt: string;
  isCommentReply: boolean;
  repliedToCommentId: string | null;
  user: GqlCommentUser;
  tags: Array<{ user: GqlCommentUser }>;
}

/* ─── Alert ─── */

export interface GqlAlert {
  id: string;
  event: GqlEvent;
  status: "draft" | "published" | "archived";
}

/* ─── Situation ─── */

export interface GqlSituation {
  id: string;
  title: string | null;
  summary: string | null;
  severity: number;
  generalLocation: GqlLocation | null;
  events: Array<{ id: string; types: string[] }>;
}

/* ─── Severity helpers ─── */

/** Map severity (1-5) to a UI severity bucket. */
export function mapSeverity(severity: number | null | undefined): "critical" | "high" | "medium" | "low" {
  const s = severity ?? 0;
  if (s >= 5) return "critical";
  if (s >= 4) return "high";
  if (s >= 3) return "medium";
  return "low";
}

/** Map severity (1-5) to a display colour. */
export function severityColor(severity: number | null | undefined): string {
  const s = severity ?? 0;
  if (s >= 5) return "#DC2626";
  if (s >= 4) return "#D97706";
  if (s >= 3) return "#F59E0B";
  return "#059669";
}
