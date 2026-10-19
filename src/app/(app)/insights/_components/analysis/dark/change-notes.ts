/** Sections the dark Overview can scroll to. */
export type ChangeSection =
  | "summary"
  | "figures"
  | "contexts"
  | "hazards"
  | "vulnerabilities"
  | "displacement"
  | "forecast";

export const CHANGE_ANCHOR: Record<ChangeSection, string> = {
  summary: "analysis-summary",
  figures: "analysis-figures",
  contexts: "analysis-contexts",
  hazards: "analysis-hazards",
  vulnerabilities: "analysis-vulnerabilities",
  displacement: "analysis-displacement",
  forecast: "analysis-forecast",
};

const ORDER: ChangeSection[] = [
  "summary",
  "figures",
  "contexts",
  "hazards",
  "vulnerabilities",
  "displacement",
  "forecast",
];

/** Map a pipeline change-note key onto a section. Null when we cannot place it. */
export function sectionForChangeKey(key: string): ChangeSection | null {
  if (key === "summary" || key.startsWith("summary.")) return "summary";
  if (key.startsWith("context_risks")) return "contexts";
  if (key === "hazards" || key.startsWith("hazards.")) return "hazards";
  if (key.startsWith("vulnerab")) return "vulnerabilities";
  if (key.startsWith("displacement")) return "displacement";
  if (key.startsWith("forecast") || key.startsWith("scenarios")) return "forecast";
  if (
    key.startsWith("sectors") ||
    key.startsWith("figures") ||
    key.includes("funding") ||
    key.includes("displaced") ||
    key.includes("in_need") ||
    key.includes("pin")
  ) {
    return "figures";
  }
  return null;
}

export interface ChangeChip {
  section: ChangeSection;
  note: string;
}

/** One chip per section that has a non-empty note. The first note wins. */
export function changeChips(notes: Record<string, string>): ChangeChip[] {
  const by = new Map<ChangeSection, string>();
  for (const [key, note] of Object.entries(notes)) {
    const text = note.trim();
    if (!text) continue;
    const section = sectionForChangeKey(key);
    if (!section || by.has(section)) continue;
    by.set(section, text);
  }
  return ORDER.filter((section) => by.has(section)).map((section) => ({
    section,
    note: by.get(section)!,
  }));
}

/**
 * Session key for a dismissed what-changed band. A new note, or a different
 * scope, is a different key, so the next update shows again.
 */
export function changeSessionKey(scopeId: string, notes: Record<string, string>): string {
  const body = Object.entries(notes)
    .filter(([, note]) => note.trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, note]) => `${key}=${note.trim()}`)
    .join("\n");
  return `analysis-changes-seen:${scopeId}:${body}`;
}

/** Notes we cannot attach to a section, still shown so nothing is dropped. */
export function looseChangeNotes(notes: Record<string, string>): { key: string; note: string }[] {
  return Object.entries(notes)
    .filter(([key, note]) => note.trim() && !sectionForChangeKey(key))
    .map(([key, note]) => ({ key, note: note.trim() }));
}
