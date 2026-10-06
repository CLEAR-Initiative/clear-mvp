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
  /** Direct parent location (A1 state for an A2 district, country for an A1 state). */
  parent?: { id: string; name: string } | null;
  /** Provenance of the location's geometry - 'landmark-geocoded' means the
   *  point was resolved from a landmark/place name in signal text via the
   *  geoparser, so its `name` field is meaningful for display (e.g.,
   *  "Nyala Airport") and should be shown instead of the A2 parent. */
  pointType?: string | null;
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
  /** Open Location challenge when clear-api exposes Signal.locationChallenge. */
  locationChallenge?: GqlSignalLocationChallenge | null;
}

/**
 * Location challenge (+ optional correction) queued for consideration.
 * See docs/clear-api-location-challenge.md.
 */
export interface GqlSignalLocationChallenge {
  id: string;
  signalId: string;
  status: string;
  note: string | null;
  proposedLng: number | null;
  proposedLat: number | null;
  proposedName: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  hasProposedPoint: boolean;
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
  validTo: string;
  firstSignalCreatedAt: string;
  lastSignalCreatedAt: string;
  populationAffected: string | null;
  populationDisplaced: string | null;
  casualties: number | null;
  originLocation: GqlLocation | null;
  destinationLocation: GqlLocation | null;
  generalLocation: GqlLocation | null;
  /**
   * Location of the event's first signal (origin → destination → general cascade).
   * Preferred map-marker point from clear-api — avoids nesting every signal's geometries.
   */
  representativePoint?: GqlLocation | null;
  signals: GqlSignal[];
  /** Non-empty = this event has been flagged as an alert */
  alerts: Array<{ id: string; status: string }>;
}

/* ─── Tasks and ImpactPriors (clear-api ADR-0010) ─── */

export type GqlTaskStatus = "PENDING" | "LEASED" | "COMPLETED" | "FAILED" | "CANCELLED";

/** One unit of Worker-performed work about an Event (first kind: `event.impact_prior`). */
export interface GqlTask {
  id: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  status: GqlTaskStatus;
  origin: "user" | "rule" | "api";
  requesterId: string | null;
  requester: { id: string; name: string | null } | null;
  teamId: string | null;
  attempts: number;
  maxAttempts: number;
  /** Requester and platform admins only; null for everyone else. */
  lastError: string | null;
  cancelRequestedAt: string | null;
  /** `produced` | `no_prior_found` for an ImpactPrior Task; null until completed. */
  outcome: string | null;
  model: string | null;
  costUsd: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GqlImpactPriorState = "proposed" | "accepted" | "rejected";

export interface GqlImpactPriorCase {
  tier: "clear" | "web";
  eventId?: string;
  reportId?: string;
  sourceUrl?: string;
  quote?: string;
  occurredAt?: string;
  locationLabel?: string;
  scope: "district" | "country";
  note?: string;
}

/** What has typically happened before for an Event's hazard and country, proposed by a Worker. */
export interface GqlImpactPrior {
  id: string;
  eventId: string;
  taskId: string;
  state: GqlImpactPriorState;
  hazardType: string;
  countryLocationId: string;
  geographicScope: string;
  horizonYears: number;
  populationGroup: string | null;
  metric: string | null;
  lowerBound: number | null;
  upperBound: number | null;
  numberOfCases: number;
  basis: GqlImpactPriorCase[];
  methodVersion: string;
  supersedesId: string | null;
  decidedById: string | null;
  decidedAt: string | null;
  decisionRationale: string | null;
  createdAt: string;
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
  /** Same first-signal location as `event.representativePoint` (clear-api convenience). */
  representativePoint?: GqlLocation | null;
}

/* ─── Crisis ─── */

export interface GqlCrisis {
  id: string;
  title: string | null;
  summary: string | null;
  severity: number;
  generalLocation: GqlLocation | null;
  events: Array<{
    id: string;
    title?: string | null;
    description?: string | null;
    types: string[];
    severity?: number | null;
    rank?: number;
    firstSignalCreatedAt?: string;
    lastSignalCreatedAt?: string;
    representativePoint?: GqlLocation | null;
    generalLocation?: GqlLocation | null;
    originLocation?: GqlLocation | null;
    destinationLocation?: GqlLocation | null;
    signals?: GqlSignal[];
    alerts?: Array<{ id: string; status: string }>;
  }>;
}

/* ─── Ground intel staging tier ─── */

/** Message classification labels ("unclassified" = pipeline hasn't labeled yet). */
export const GROUND_CLASSIFICATIONS = [
  "field_report",
  "news_digest",
  "operational",
  "chatter",
] as const;
export type GroundClassification = (typeof GROUND_CLASSIFICATIONS)[number];

export interface GqlGroundSource {
  id: string;
  name: string;
  /** "staff_group" | "partner_group" | "hotline". */
  kind: string;
  /** Global roles allowed to review threads from this source. */
  reviewerRoles: string[];
  privacyDefault: string;
  isActive: boolean;
}

export interface GqlGroundThread {
  id: string;
  groundSourceId: string;
  title: string | null;
  /** "reported" | "updated" | "confirmed" | "corrected" | "retracted". */
  lifecycleState: string;
  /** "unverified" | "approved_private" | "approved_public" | "rejected". */
  reviewState: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  /** "spam" | "not_report" | "unusable" | "duplicate" while rejected, else null. */
  rejectReason: string | null;
  promotedSignalId: string | null;
  createdAt: string;
}

export interface GqlGroundThreadDetail extends GqlGroundThread {
  source: GqlGroundSource;
  messages: GqlGroundMessage[];
}

/**
 * A staged ground message. PRIVATE TIER: `senderName` may be rendered in
 * the detection Ground-intel tab ONLY — never anywhere else, and never in
 * anything promoted to the signals graph. Text is phone-number-redacted
 * at persistence by clear-api.
 */
export interface GqlGroundMessage {
  id: string;
  groundSourceId: string;
  externalId: string;
  sentAt: string;
  /** Pseudonymous per-(source, sender) ref, e.g. "s_ab12cd34". */
  senderRef: string;
  /** Raw sender display name. Private tier only. */
  senderName: string | null;
  text: string;
  mediaKeys: string[];
  mediaRefs: string[];
  omittedMediaCount: number;
  classification: string | null;
  uncertainty: string | null;
  isEdited: boolean;
  threadId: string | null;
}

/** Ground message as the hotline inbox receives it: presigned media URLs
 * (1 h expiry, generated at read time) and NO senderName. Hotline sources
 * store no name, and the private-tier field must not travel to the inbox
 * client even as null. */
export type GqlGroundInboxMessage = Omit<GqlGroundMessage, "senderName"> & {
  mediaUrls: string[];
  /** True when any attachment is a voice note. Set at ingest, so it is
   * true even while the voice media is still being stored. */
  hasVoice: boolean;
  /** Machine transcript of the message's voice note(s); null until the
   * pipeline transcribes it, always null without a voice note. */
  transcript: string | null;
  /** Language of `text` detected at intake ("ar", "en", "fr", "es"); null
   * when unknown (clear-api#627), and always null while the
   * `hotline_translation` flag is off (not selected then). */
  language: string | null;
  /** Set when clear-pipeline's enrichment drain (classification + thread
   * draft) gave up on the message. While set the message is out of the
   * queue for good; retryGroundMessage(stage: ENRICH) clears it. */
  enrichFailedAt: string | null;
  /** Last enrichment error (truncated, phone-redacted). */
  enrichError: string | null;
  /** Set when the transcription drain gave up on the voice note. The
   * message then also leaves the enrichment queue (nothing to classify);
   * retryGroundMessage(stage: TRANSCRIBE) clears it. */
  transcribeFailedAt: string | null;
  /** Last transcription error (truncated, phone-redacted). */
  transcribeError: string | null;
};

/** Ground thread as the hotline inbox receives it: the base fields plus the
 * hotline-enrichment drafts. Drafts are LLM suggestions (never applied
 * automatically); every one is null until the enrichment job has run. */
export interface GqlGroundInboxThread extends GqlGroundThread {
  draftTitle: string | null;
  /** 1-5. */
  draftSeverity: number | null;
  /** `locations` row id (any admin level, incl. L3/L4 landmarks). */
  draftLocationId: string | null;
  draftDisasterType: string | null;
}

/** Hotline inbox payload: every hotline source with its open (unverified)
 * threads and all staged messages, joined client-side. */
export interface GqlHotlineInbox {
  sources: GqlGroundSource[];
  threads: GqlGroundInboxThread[];
  messages: GqlGroundInboxMessage[];
}

/* ─── Severity helpers ─── */

/** Map severity (1-5) to a UI severity bucket. Null/undefined = pipeline hasn't set it yet. */
export function mapSeverity(severity: number | null | undefined): "critical" | "high" | "medium" | "low" | "unknown" {
  if (severity == null) return "unknown";
  if (severity >= 5) return "critical";
  if (severity >= 4) return "high";
  if (severity >= 3) return "medium";
  return "low";
}

/** Map severity (1-5) to a display colour. */
export function severityColor(severity: number | null | undefined): string {
  if (severity == null) return "#A3A3A3";
  if (severity >= 5) return "#DC2626";
  if (severity >= 4) return "#D97706";
  if (severity >= 3) return "#F59E0B";
  return "#059669";
}
