import type { GqlCaseFigure, GqlCaseProposal } from "~/lib/types/graphql";

/**
 * Web cases (clear-api V4, CaseProposal): one historical case a web Worker
 * found while enriching an Event — a past incident like it, the source that
 * reports it, the figures it gives — decided by an admin or analyst on its
 * own. These helpers mirror clear-api's rules for the UI only; the server
 * is the gate.
 */

/** clear-api's cap on a decision rationale. */
export const MAX_RATIONALE_LENGTH = 4000;

/** A Worker-supplied URL is rendered as a link only when it is http(s);
 *  anything else (javascript:, data:, garbage) is shown as text. */
export function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The Domain Ontology's seven metric types; anything else is shown raw. */
export const CASE_METRICS = [
  "people_affected",
  "people_displaced_new",
  "people_displaced_cumulative",
  "people_in_need",
  "people_targeted",
  "people_reached",
  "households_affected",
] as const;
export type CaseMetric = (typeof CASE_METRICS)[number];

export function isCaseMetric(metric: string): metric is CaseMetric {
  return (CASE_METRICS as readonly string[]).includes(metric);
}

/** The figures a case carries, dropping anything malformed (figures is
 * JSON on the wire, so its shape is not guaranteed). */
export function caseFigures(proposal: Pick<GqlCaseProposal, "figures">): GqlCaseFigure[] {
  if (!Array.isArray(proposal.figures)) return [];
  return proposal.figures.filter(
    (f): f is GqlCaseFigure =>
      !!f && typeof f === "object" && typeof f.metric === "string" && typeof f.value === "number" && Number.isFinite(f.value),
  );
}

/** "12,000 (10,000–15,000) households · IDPs": value, range when given,
 * unit and population group. `num` formats a number in the reader's locale. */
export function figureText(figure: GqlCaseFigure, num: (n: number) => string): string {
  const hasRange = typeof figure.lowerBound === "number" && typeof figure.upperBound === "number";
  return [
    num(figure.value),
    hasRange ? ` (${num(figure.lowerBound!)}–${num(figure.upperBound!)})` : "",
    figure.unit ? ` ${figure.unit}` : "",
    figure.populationGroup ? ` · ${figure.populationGroup}` : "",
  ].join("");
}

/** Whether a decision is still to be taken on the case. */
export function isUndecided(proposal: Pick<GqlCaseProposal, "state">): boolean {
  return proposal.state === "proposed";
}
