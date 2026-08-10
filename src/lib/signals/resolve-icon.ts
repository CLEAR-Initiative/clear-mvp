/**
 * Maps event/signal types to CLEAR Signals SVG slugs under
 * `/images/ui-kit/signals/icons/`.
 *
 * Resolution order:
 * 1. Structured GLIDE codes / category keys (`event.types`)
 * 2. Keyword match on free-text title/description (signals without types)
 * 3. Default glyph
 */

/** GLIDE / category code → icon slug. Conflict codes share one glyph. */
const GLIDE_TO_SLUG: Record<string, string> = {
  // Natural hazards
  dr: "drought",
  eq: "earthquake",
  ff: "flood",
  fl: "flood",
  fr: "wildfire",
  wf: "wildfire",
  ls: "landslide",
  ms: "landslide",
  sl: "landslide",
  st: "storm",
  tc: "cyclone",
  ec: "cyclone",
  to: "storm",
  ss: "storm",
  vw: "storm",
  cw: "weather",
  ht: "weather",
  et: "weather",
  // Conflict family
  ba: "conflict",
  bg: "conflict",
  bo: "conflict",
  rb: "explosive-hazard",
  rc: "explosive-hazard",
  rg: "explosive-hazard",
  rl: "explosive-hazard",
  rm: "explosive-hazard",
  rs: "explosive-hazard",
  rv: "explosive-hazard",
  pf: "conflict",
  pi: "conflict",
  pp: "conflict",
  pr: "conflict",
  rd: "conflict",
  ri: "conflict",
  pa: "gov-policy",
  pg: "gov-policy",
  ph: "gov-policy",
  pl: "conflict",
  po: "conflict",
  pt: "gov-policy",
  pv: "gov-policy",
  pw: "explosive-hazard",
  va: "conflict",
  vc: "human-rights",
  vd: "human-rights",
  vs: "gbv-risk",
  // Other
  fa: "food-insecurity",
  fc: "econ-shock",
  ep: "disease",
  ac: "explosive-hazard",
  // Free-text / layer names sometimes appear as types
  conflict: "conflict",
  displacement: "refugees",
  flooding: "flood",
  flood: "flood",
  wash: "water-wash",
  drought: "drought",
  cholera: "disease",
  disease: "disease",
  health: "disease",
  food_insecurity: "food-insecurity",
  famine: "food-insecurity",
};

const KEYWORD_RULES: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /\bflood/i, slug: "flood" },
  { pattern: /\bdrought/i, slug: "drought" },
  { pattern: /\bwildfire|bush\s*fire|\bfire\b/i, slug: "wildfire" },
  { pattern: /\bearthquake|seismic/i, slug: "earthquake" },
  { pattern: /\bcyclone|hurricane|typhoon|storm\b/i, slug: "cyclone" },
  { pattern: /\bland\s*slide|mud\s*slide/i, slug: "landslide" },
  { pattern: /\bconflict|fighting|attack|airstrike|shelling|clash/i, slug: "conflict" },
  { pattern: /\bexplosive|ied|bomb/i, slug: "explosive-hazard" },
  { pattern: /\brefugee|displacement|idp|migrat/i, slug: "refugees" },
  { pattern: /\bdisease|outbreak|cholera|measles|epidemic/i, slug: "disease" },
  { pattern: /\bfood\s*insecurity|famine|hunger/i, slug: "food-insecurity" },
  { pattern: /\bhospital|clinic|health\s*facility/i, slug: "hospital" },
  { pattern: /\bschool/i, slug: "school-closure" },
  { pattern: /\broad|bridge|transport/i, slug: "road-closure" },
  { pattern: /\bwater|wash|sanitation/i, slug: "water-wash" },
  { pattern: /\bweather|rainfall/i, slug: "weather" },
  { pattern: /\beconomic|market|inflation/i, slug: "econ-shock" },
  { pattern: /\bmovement|migration/i, slug: "movement" },
];

/** Default when nothing resolves — neutral movement glyph. */
export const DEFAULT_ICON_SLUG = "movement";

/** Event pins without usable types. */
export const EVENT_MARKER_ICON = "sample-event-core";

export function signalIconUrl(slug: string): string {
  return `/images/ui-kit/signals/icons/${slug}.svg`;
}

/** Prefer structured type codes; fall back to keyword haystack. */
export function resolveMarkerIconSlug(opts: {
  types?: Array<string | null | undefined>;
  texts?: Array<string | null | undefined>;
  markerKind?: "event" | "signal" | "crisis";
}): string {
  for (const raw of opts.types ?? []) {
    if (!raw?.trim()) continue;
    const key = raw.trim().toLowerCase();
    const fromGlide = GLIDE_TO_SLUG[key];
    if (fromGlide) return fromGlide;
  }

  const haystack = (opts.texts ?? []).filter(Boolean).join(" ");
  if (haystack.trim()) {
    for (const { pattern, slug } of KEYWORD_RULES) {
      if (pattern.test(haystack)) return slug;
    }
  }

  if (opts.markerKind === "event" || opts.markerKind === "crisis") {
    return EVENT_MARKER_ICON;
  }
  return DEFAULT_ICON_SLUG;
}

/** @deprecated Prefer resolveMarkerIconSlug — kept for call-site migration. */
export function resolveSignalIcon(...texts: Array<string | null | undefined>): string {
  return resolveMarkerIconSlug({ texts });
}
