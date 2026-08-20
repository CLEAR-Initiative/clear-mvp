/**
 * Score candidate events for reverse-path add on `/crisis/[id]`.
 * Reasons: location overlap, temporal proximity (±7d), severity tier,
 * shared disaster types, shared signal sources.
 */

export type RecommendReason =
  | "location"
  | "time"
  | "severity"
  | "type"
  | "source";

export interface RecommendEventLike {
  id: string;
  title?: string | null;
  description?: string | null;
  types?: string[] | null;
  severity?: number | null;
  firstSignalCreatedAt?: string | null;
  lastSignalCreatedAt?: string | null;
  generalLocation?: RecommendLocationLike | null;
  originLocation?: RecommendLocationLike | null;
  destinationLocation?: RecommendLocationLike | null;
  signals?: Array<{ source?: { name?: string | null } | null }> | null;
}

export interface RecommendLocationLike {
  id?: string | null;
  name?: string | null;
  ancestorIds?: string[] | null;
}

export interface ScoredEvent {
  event: RecommendEventLike;
  score: number;
  reasons: RecommendReason[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const RECOMMEND_TIME_WINDOW_MS = 7 * DAY_MS;

const WEIGHTS: Record<RecommendReason, number> = {
  location: 40,
  time: 25,
  type: 20,
  severity: 10,
  source: 5,
};

function pickLoc(e: RecommendEventLike): RecommendLocationLike | null {
  return e.generalLocation ?? e.originLocation ?? e.destinationLocation ?? null;
}

function locationTokenSet(e: RecommendEventLike): Set<string> {
  const loc = pickLoc(e);
  const tokens = new Set<string>();
  if (!loc) return tokens;
  if (loc.id) tokens.add(loc.id);
  for (const id of loc.ancestorIds ?? []) {
    if (id) tokens.add(id);
  }
  return tokens;
}

function eventTimeMs(e: RecommendEventLike): number | null {
  const raw = e.lastSignalCreatedAt ?? e.firstSignalCreatedAt;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

function sourceNames(e: RecommendEventLike): Set<string> {
  const names = new Set<string>();
  for (const s of e.signals ?? []) {
    const n = s.source?.name?.trim();
    if (n) names.add(n);
  }
  return names;
}

function setsOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const v of a) {
    if (b.has(v)) return true;
  }
  return false;
}

/** Build reference sets once from crisis-linked events. */
export function buildCrisisRecommendContext(crisisEvents: RecommendEventLike[]) {
  const locationTokens = new Set<string>();
  const types = new Set<string>();
  const sources = new Set<string>();
  const times: number[] = [];
  let maxSeverity = 0;

  for (const e of crisisEvents) {
    for (const id of locationTokenSet(e)) locationTokens.add(id);
    for (const t of e.types ?? []) {
      if (t) types.add(t);
    }
    for (const n of sourceNames(e)) sources.add(n);
    const tm = eventTimeMs(e);
    if (tm != null) times.push(tm);
    maxSeverity = Math.max(maxSeverity, e.severity ?? 0);
  }

  return { locationTokens, types, sources, times, maxSeverity };
}

export type CrisisRecommendContext = ReturnType<typeof buildCrisisRecommendContext>;

export function scoreEventAgainstCrisis(
  candidate: RecommendEventLike,
  ctx: CrisisRecommendContext,
): { score: number; reasons: RecommendReason[] } {
  const reasons: RecommendReason[] = [];

  if (ctx.locationTokens.size > 0 && setsOverlap(locationTokenSet(candidate), ctx.locationTokens)) {
    reasons.push("location");
  }

  const candTime = eventTimeMs(candidate);
  if (candTime != null && ctx.times.length > 0) {
    const near = ctx.times.some((t) => Math.abs(t - candTime) <= RECOMMEND_TIME_WINDOW_MS);
    if (near) reasons.push("time");
  }

  if (ctx.types.size > 0 && (candidate.types ?? []).some((t) => t && ctx.types.has(t))) {
    reasons.push("type");
  }

  if (ctx.maxSeverity > 0 && candidate.severity != null) {
    if (Math.abs(candidate.severity - ctx.maxSeverity) <= 1) {
      reasons.push("severity");
    }
  }

  if (ctx.sources.size > 0 && setsOverlap(sourceNames(candidate), ctx.sources)) {
    reasons.push("source");
  }

  const score = reasons.reduce((sum, r) => sum + WEIGHTS[r], 0);
  return { score, reasons };
}

export function rankEventsForCrisis(
  candidates: RecommendEventLike[],
  crisisEvents: RecommendEventLike[],
  opts?: { excludeIds?: Set<string>; limit?: number; minScore?: number },
): ScoredEvent[] {
  const exclude = opts?.excludeIds ?? new Set(crisisEvents.map((e) => e.id));
  const limit = opts?.limit ?? 10;
  const minScore = opts?.minScore ?? 1;
  const ctx = buildCrisisRecommendContext(crisisEvents);

  const scored: ScoredEvent[] = [];
  for (const event of candidates) {
    if (exclude.has(event.id)) continue;
    const { score, reasons } = scoreEventAgainstCrisis(event, ctx);
    if (score < minScore) continue;
    scored.push({ event, score, reasons });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const at = eventTimeMs(a.event) ?? 0;
    const bt = eventTimeMs(b.event) ?? 0;
    return bt - at;
  });

  return scored.slice(0, limit);
}

export function eventMatchesSearch(event: RecommendEventLike, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const title = (event.title ?? event.description ?? event.types?.[0] ?? "").toLowerCase();
  const loc = (pickLoc(event)?.name ?? "").toLowerCase();
  return title.includes(q) || loc.includes(q);
}
