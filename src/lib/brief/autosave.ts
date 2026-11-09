/** The text of a draft Brief the composer autosaves. */
export interface BriefText {
  title: string;
  summary: string;
  closingNotes: string;
}

const FIELDS = ["title", "summary", "closingNotes"] as const;

/** The fields of `next` that differ from `saved`; a blank title is never sent (clear-api refuses it). */
export function textPatch(next: BriefText, saved: BriefText): Partial<BriefText> | null {
  const patch: Partial<BriefText> = {};
  for (const f of FIELDS) {
    if (next[f] === saved[f]) continue;
    if (f === "title" && next.title.trim() === "") continue;
    patch[f] = next[f];
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
