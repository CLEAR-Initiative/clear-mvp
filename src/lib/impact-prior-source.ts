/**
 * Enrichment Task kinds (clear-api ADR-0010).
 *
 * One enrichment request fans out into one Task per configured source kind
 * under the `event.impact_prior` family, each drained by its own Worker.
 * Today that is `event.impact_prior.web` alone: the web Worker searches
 * CLEAR's Events and knowledge base, then the web, and proposes cases
 * (CaseProposals, "proposed signals") that deciders accept one by one. The
 * ImpactPrior itself is computed from CLEAR's accepted history, never
 * proposed.
 *
 * Older kinds (the bare `event.impact_prior`, the retired
 * `event.impact_prior.clear`) can still sit in an Event's Task history:
 * they read as a generic "Impact prior" request, never as a source of
 * their own.
 */

export const IMPACT_PRIOR_FAMILY = "event.impact_prior";

/** The web Worker's kind: its requests read "Web search". */
export const WEB_SEARCH_KIND = `${IMPACT_PRIOR_FAMILY}.web`;

/** The bare kind or a per-source kind under it. */
export function isImpactPriorKind(kind: string): boolean {
  return kind === IMPACT_PRIOR_FAMILY || kind.startsWith(`${IMPACT_PRIOR_FAMILY}.`);
}

/** What a search should match for a kind: the source word after the family
 *  (`web`), never the prefix every enrichment kind shares; the raw kind
 *  outside the family; empty for the bare kind. */
export function sourceSearchTerm(kind: string): string {
  if (kind === IMPACT_PRIOR_FAMILY) return "";
  return isImpactPriorKind(kind) ? kind.slice(IMPACT_PRIOR_FAMILY.length + 1) : kind;
}

/** The `eventDetail.enrichment` translator, as far as this module needs it
 *  (next-intl's typed translator is assignable to it). */
export type RequestTranslator = (key: "kinds.impactPrior" | "webSearch") => string;

/** What a request reads as: "Web search" for the web Worker's, "Impact
 *  prior" for any other kind in the family (history only), the raw kind
 *  outside it. */
export function requestLabel(kind: string, t: RequestTranslator): string {
  if (kind === WEB_SEARCH_KIND) return t("webSearch");
  return isImpactPriorKind(kind) ? t("kinds.impactPrior") : kind;
}
