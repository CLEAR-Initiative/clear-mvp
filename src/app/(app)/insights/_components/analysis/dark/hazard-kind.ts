/** What a hazard card's icon tile shows. Matches the design's hazard tiles. */
export type HazardKind = "conflict" | "health" | "food" | "drought" | "water" | "fire" | "other";

// Checked in order, so "Attacks on healthcare" is conflict and "low rainfall" is drought.
const KINDS: [HazardKind, RegExp][] = [
  ["conflict", /conflict|clash|fight|battle|attack|strike|drone|\bshell(s|ing|ed)?\b|bomb|explosi|ordnance|landmine|militia|armed|siege|violence|killing/],
  ["health", /cholera|dengue|measles|malaria|hepatitis|polio|diphtheria|mpox|disease|outbreak|epidemic|health/],
  ["food", /famine|hunger|food|locust|crop|harvest|livestock|malnutrition/],
  ["drought", /drought|\bheat|dry spell|low rainfall|below[- ](normal|average)/],
  ["water", /flood|\brain|storm|cyclone|landslide|wadi|weather/],
  ["fire", /\b(wild)?fires?\b/],
];

/** The label decides; the detail only when the label names no known kind. */
export function hazardKind(label: string, detail = ""): HazardKind {
  for (const text of [label, detail]) {
    const s = text.toLowerCase();
    const hit = KINDS.find(([, pattern]) => pattern.test(s));
    if (hit) return hit[0];
  }
  return "other";
}
