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

/** Sentence end: `.`/`!`/`?` then whitespace. Decimals ("13.8%", "USD 12.5")
 *  have no space after the dot, so they don't split. */
const SENTENCE_END = /(?<=[.!?])\s+/g;

/** Minimum sentences before a citation change is allowed to start a new
 *  paragraph. Without it, a run of singly-cited sentences becomes one-line
 *  paragraphs, which reads worse than the wall it replaces. */
const MIN_SENTENCES_PER_PARAGRAPH = 2;

/**
 * Break the summary into readable paragraphs.
 *
 * The pipeline used to emit `\n\n` but current generations return one
 * unbroken block (Venezuela monthly: 2,769 characters, zero breaks), which is
 * unreadable on screen. When the pipeline does provide breaks we keep them -
 * it knows the structure better than we can infer it.
 *
 * Otherwise we infer: start a new paragraph when the set of reports backing a
 * sentence changes. Sources cluster by theme, so a change of source is a
 * reasonable proxy for a change of subject, and it needs no NLP. Uncited
 * sentences attach to the paragraph they follow.
 *
 * Splitting is done by index and rejoined by slicing the original string, so
 * the concatenation of all paragraphs is exactly the input - no whitespace is
 * invented or lost.
 */
export function planSummaryParagraphs(
  text: string,
  lineRefs: Record<string, number[]>,
): string[] {
  const explicit = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (explicit.length > 1) return explicit;

  const body = text.trim();
  if (!body) return [];

  // Sentence start offsets, derived from the separators so slicing keeps the
  // original characters intact.
  const starts = [0];
  for (const m of body.matchAll(SENTENCE_END)) {
    starts.push(m.index! + m[0].length);
  }
  if (starts.length < 2) return [body];

  const sentences = starts.map((s, i) =>
    body.slice(s, i + 1 < starts.length ? starts[i + 1] : body.length),
  );

  const paragraphs: string[] = [];
  let current: string[] = [];
  let currentKey: string | null = null;

  for (const sentence of sentences) {
    const refs = lineRefs[sentence.trim()];
    const key = refs?.length ? refs.join(",") : null;
    if (key && currentKey && key !== currentKey && current.length >= MIN_SENTENCES_PER_PARAGRAPH) {
      paragraphs.push(current.join("").trim());
      current = [];
    }
    current.push(sentence);
    if (key) currentKey = key;
  }
  if (current.length) paragraphs.push(current.join("").trim());

  return paragraphs.filter(Boolean);
}
