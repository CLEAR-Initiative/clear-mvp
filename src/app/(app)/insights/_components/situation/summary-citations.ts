/**
 * Split a paragraph into text runs and citation markers.
 *
 * The pipeline attributes whole sentences (`contributing_sources` maps a report
 * to the exact generated lines it supported). Rather than re-splitting the prose
 * - which risks drawing a different sentence boundary than the pipeline used, so
 * nothing would match - we locate each cited sentence verbatim and mark it.
 *
 * Pure so it can be tested without rendering; the component turns the returned
 * segments into text and <Citations> nodes.
 */
export type SummarySegment =
  | { kind: "text"; text: string }
  | { kind: "cite"; refs: number[] };

export function planSentenceSegments(
  para: string,
  lineRefs: Record<string, number[]>,
): SummarySegment[] | null {
  const hits = Object.entries(lineRefs)
    .map(([sentence, refs]) => ({ sentence, refs, at: para.indexOf(sentence) }))
    .filter((h) => h.at !== -1 && h.refs.length > 0)
    .sort((a, b) => a.at - b.at);

  if (hits.length === 0) return null;

  const out: SummarySegment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    // Overlapping attributions (the same clause credited twice) would rewind
    // the cursor and duplicate text - keep the first and skip the rest.
    if (hit.at < cursor) continue;
    if (hit.at > cursor) out.push({ kind: "text", text: para.slice(cursor, hit.at) });
    out.push({ kind: "text", text: hit.sentence });
    out.push({ kind: "cite", refs: hit.refs });
    cursor = hit.at + hit.sentence.length;
  }
  if (cursor < para.length) out.push({ kind: "text", text: para.slice(cursor) });
  return out;
}
