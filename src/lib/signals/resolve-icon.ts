/** Maps signal text to CLEAR Signals icon slugs under /images/ui-kit/signals/icons/ */

const KEYWORD_RULES: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /\bflood/i, slug: "flood" },
  { pattern: /\bdrought/i, slug: "drought" },
  { pattern: /\bwildfire|fire\b/i, slug: "wildfire" },
  { pattern: /\bearthquake|seismic/i, slug: "earthquake" },
  { pattern: /\bcyclone|hurricane|typhoon|storm\b/i, slug: "cyclone" },
  { pattern: /\bconflict|fighting|attack|airstrike|shelling/i, slug: "conflict" },
  { pattern: /\brefugee|displacement|idp/i, slug: "refugees" },
  { pattern: /\bdisease|outbreak|cholera|measles/i, slug: "disease" },
  { pattern: /\bfood\s*insecurity|famine|hunger/i, slug: "food-insecurity" },
  { pattern: /\bhospital|clinic|health\s*facility/i, slug: "hospital" },
  { pattern: /\bschool/i, slug: "school-closure" },
  { pattern: /\broad|bridge|transport/i, slug: "road-closure" },
  { pattern: /\bwater|wash|sanitation/i, slug: "water-wash" },
  { pattern: /\bweather|rainfall/i, slug: "weather" },
  { pattern: /\bmovement|migration/i, slug: "movement" },
];

const DEFAULT_ICON = "movement";

export function resolveSignalIcon(...texts: Array<string | null | undefined>): string {
  const haystack = texts.filter(Boolean).join(" ");
  if (!haystack.trim()) return DEFAULT_ICON;
  for (const { pattern, slug } of KEYWORD_RULES) {
    if (pattern.test(haystack)) return slug;
  }
  return DEFAULT_ICON;
}

export function signalIconUrl(slug: string): string {
  return `/images/ui-kit/signals/icons/${slug}.svg`;
}
