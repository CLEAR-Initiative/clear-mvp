/**
 * Where an ImpactPrior proposal came from (clear-api ADR-0010, V3).
 *
 * One enrichment request fans out into one Task per source kind, each
 * drained by its own Worker: `event.impact_prior.clear` is the Dagster drain
 * over CLEAR's own Events and knowledge base, `event.impact_prior.web` the
 * Claude routine over the web; any later source is a new kind under the same
 * family. clear-api stamps the Task's kind on the proposal as `sourceKind`,
 * so a decider can see who said what and proposals from different sources
 * sit side by side (supersession stays within a kind). The bare
 * `event.impact_prior` is the pre-fan-out kind, produced by whichever Worker
 * held it, so it reads "source not recorded"; anything unknown is shown by its
 * raw kind rather than guessed at.
 */

export const IMPACT_PRIOR_FAMILY = "event.impact_prior";

export type ImpactPriorSource = { key: "clear" | "web" | "legacy" } | { key: "other"; kind: string };

/** The source a kind names: `clear`, `web`, `legacy` for the bare
 *  pre-fan-out kind, or `other` with the raw kind. */
export function impactPriorSource(kind: string): ImpactPriorSource {
  if (kind === IMPACT_PRIOR_FAMILY) return { key: "legacy" };
  const suffix = kind.startsWith(`${IMPACT_PRIOR_FAMILY}.`) ? kind.slice(IMPACT_PRIOR_FAMILY.length + 1) : "";
  if (suffix === "clear" || suffix === "web") return { key: suffix };
  return { key: "other", kind };
}

/** What a search should match for a kind: the source word (`clear`, `web`),
 *  never the family prefix every prior shares. Empty for the bare kind. */
export function sourceSearchTerm(kind: string): string {
  const source = impactPriorSource(kind);
  return source.key === "other" ? source.kind : source.key === "legacy" ? "" : source.key;
}

/** The bare kind or a per-source kind under it. */
export function isImpactPriorKind(kind: string): boolean {
  return kind === IMPACT_PRIOR_FAMILY || kind.startsWith(`${IMPACT_PRIOR_FAMILY}.`);
}

/** The `eventDetail.enrichment` translator, as far as this module needs it
 *  (next-intl's typed translator is assignable to it). */
export type SourceTranslator = (key: "sourceKind.clear" | "sourceKind.web" | "sourceKind.legacy") => string;

/** The label a person reads: the translated source for the known ones, the
 *  raw kind otherwise. */
export function sourceLabel(kind: string, t: SourceTranslator): string {
  const source = impactPriorSource(kind);
  return source.key === "other" ? source.kind : t(`sourceKind.${source.key}`);
}

/** The translator keys a request's label needs, beyond the source's. */
export type RequestTranslator = SourceTranslator &
  ((key: "kinds.impactPrior" | "webSearch") => string);

/** What a request reads as beside its status: "Web search" for the web
 *  Worker's (it searches; its cases are decided one by one), the source
 *  label otherwise. */
export function requestSourceLabel(kind: string, t: RequestTranslator): string {
  return impactPriorSource(kind).key === "web" ? t("webSearch") : sourceLabel(kind, t);
}

/** A request's own line: "Web search", "Impact prior · CLEAR data", or the
 *  raw kind for anything outside the family. */
export function requestLabel(kind: string, t: RequestTranslator): string {
  if (impactPriorSource(kind).key === "web") return t("webSearch");
  return isImpactPriorKind(kind) ? `${t("kinds.impactPrior")} · ${sourceLabel(kind, t)}` : kind;
}
