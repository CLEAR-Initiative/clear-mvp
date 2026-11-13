import { GLIDE_TO_SLUG, signalIconUrl } from "~/lib/signals/resolve-icon";

// Keyed by GLIDE number (what event.types contains).
// Types sharing the same classKey are deduped to a single L1 pill.
// l2 = L2 group label, specificType = the most granular type's short name in
// sentence case (shown on type chips and secondary pills; clear-api's longer
// names stay in its hierarchy).
const DISASTER_META: Record<string, { label: string; classKey?: string; hidden?: boolean; l2?: string; specificType?: string }> = {
  ce: { label: "", hidden: true, l2: "complex emergency", specificType: "Complex emergency" },
  // ─── Natural hazards ───
  av: { label: "Avalanche",        l2: "snow avalanche",          specificType: "Snow avalanche" },
  cw: { label: "Cold Wave",        l2: "cold wave",               specificType: "Cold wave" },
  dr: { label: "Drought",          l2: "drought",                 specificType: "Drought" },
  ec: { label: "Extratrop. Cyclone", l2: "extratropical cyclone", specificType: "Extratropical cyclone" },
  eq: { label: "Earthquake",       l2: "earthquake",              specificType: "Earthquake" },
  et: { label: "Extreme Temp",     l2: "extreme temperature",     specificType: "Extreme temperature" },
  ff: { label: "Flash Flood",      l2: "flash flood",             specificType: "Flash flood" },
  fl: { label: "Flood",            l2: "flood",                   specificType: "Flood" },
  fr: { label: "Fire",             l2: "fire",                    specificType: "Fire" },
  ht: { label: "Heat Wave",        l2: "heat wave",               specificType: "Heat wave" },
  in: { label: "Insect Infestation", l2: "insect infestation",    specificType: "Insect infestation" },
  ls: { label: "Landslide",        l2: "land slide",              specificType: "Landslide" },
  ms: { label: "Mudslide",         l2: "mud slide",               specificType: "Mudslide" },
  sl: { label: "Slide",            l2: "slide",                   specificType: "Slide" },
  ss: { label: "Storm Surge",      l2: "storm surge",             specificType: "Storm surge" },
  st: { label: "Severe Storm",     l2: "severe local storm",      specificType: "Severe local storm" },
  tc: { label: "Tropical Cyclone", l2: "tropical cyclone",        specificType: "Tropical cyclone" },
  to: { label: "Tornado",          l2: "tornado",                 specificType: "Tornado" },
  ts: { label: "Tsunami",          l2: "tsunami",                 specificType: "Tsunami" },
  vo: { label: "Volcano",          l2: "volcano",                 specificType: "Volcano" },
  vw: { label: "Violent Wind",     l2: "violent wind",            specificType: "Violent wind" },
  wf: { label: "Wildfire",         l2: "wild fire",               specificType: "Wildfire" },
  ot: { label: "Other",            l2: "other",                   specificType: "Other" },
  // ─── Conflict - battles ───
  ba: { label: "Conflict", classKey: "conflict", l2: "battles",                           specificType: "Armed clash" },
  bg: { label: "Conflict", classKey: "conflict", l2: "battles",                           specificType: "Government retakes area" },
  bo: { label: "Conflict", classKey: "conflict", l2: "battles",                           specificType: "Armed group takeover" },
  // ─── Conflict - explosions / remote violence ───
  rb: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Suicide bomb" },
  rc: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Chemical weapon" },
  rg: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Grenade" },
  rl: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "IED or landmine" },
  rm: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Shelling or missiles" },
  rs: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Air or drone strike" },
  rv: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Explosions or remote violence" },
  // ─── Conflict - protests ───
  pf: { label: "Conflict", classKey: "conflict", l2: "protests",                          specificType: "Protest crackdown" },
  pi: { label: "Conflict", classKey: "conflict", l2: "protests",                          specificType: "Protest with intervention" },
  pp: { label: "Conflict", classKey: "conflict", l2: "protests",                          specificType: "Peaceful protest" },
  pr: { label: "Conflict", classKey: "conflict", l2: "protests",                          specificType: "Protest" },
  // ─── Conflict - riots ───
  rd: { label: "Conflict", classKey: "conflict", l2: "riots",                             specificType: "Violent demonstration" },
  ri: { label: "Conflict", classKey: "conflict", l2: "riots",                             specificType: "Mob violence" },
  // ─── Conflict - strategic / political ───
  pa: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Arrests" },
  pg: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Group change" },
  ph: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Base established" },
  pl: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Looting or destruction" },
  po: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Other" },
  pt: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Territory handover" },
  pv: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Agreement" },
  pw: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Disrupted weapons use" },
  // ─── Conflict - violence against civilians ───
  va: { label: "Conflict", classKey: "conflict", l2: "violence against civilians",        specificType: "Attack" },
  vc: { label: "Conflict", classKey: "conflict", l2: "violence against civilians",        specificType: "Abduction" },
  vd: { label: "Conflict", classKey: "conflict", l2: "violence against civilians",        specificType: "Abduction" },
  vs: { label: "Conflict", classKey: "conflict", l2: "violence against civilians",        specificType: "Sexual violence" },
  // ─── Other top-level ───
  fa: { label: "Famine",         l2: "famine",                specificType: "Famine" },
  fc: { label: "Econ. Crisis",   l2: "economic crisis",       specificType: "Economic crisis" },
  ac: { label: "Tech. Disaster", l2: "technological disaster", specificType: "Technological disaster" },
  ep: { label: "Epidemic",       l2: "epidemic",              specificType: "Epidemic" },
};

const CLASS_STYLE: Record<string, { color: string; bg: string }> = {
  conflict: { color: "var(--color-critical)", bg: "var(--color-critical-light)" },
};

const CATEGORY_STYLE: Record<string, { color: string; bg: string }> = {
  dr: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  fl: { color: "var(--color-info)",    bg: "var(--color-info-light)" },
  eq: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  ep: { color: "var(--color-success)", bg: "var(--color-success-light)" },
  fa: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  fc: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  ce: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  wf: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  ts: { color: "var(--color-info)",    bg: "var(--color-info-light)" },
  ec: { color: "var(--color-info)",    bg: "var(--color-info-light)" },
  to: { color: "var(--color-info)",    bg: "var(--color-info-light)" },
  fr: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  vo: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
  ls: { color: "var(--color-warning)", bg: "var(--color-warning-light)" },
};

export interface DisasterPill {
  label: string;
  color: string;
  bg: string;
}

/** L1 pills - one per unique top-level category (conflict deduped to one). */
export function getDisasterPills(types: string[]): DisasterPill[] {
  const seen = new Set<string>();
  const pills: DisasterPill[] = [];
  for (const code of types) {
    const lower = code.toLowerCase();
    const meta = DISASTER_META[lower];
    if (meta?.hidden) continue;
    const key = meta?.classKey ?? lower;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = meta?.label ?? lower.toUpperCase();
    const style =
      (meta?.classKey ? CLASS_STYLE[meta.classKey] : null) ??
      CATEGORY_STYLE[lower] ??
      { color: "var(--color-text-secondary)", bg: "var(--color-bg-muted)" };
    pills.push({ label, ...style });
  }
  return pills;
}

/** L2 pills - specific sub-type labels, deduped by specificType string. */
export function getDisasterL2Pills(types: string[]): DisasterPill[] {
  const seen = new Set<string>();
  const pills: DisasterPill[] = [];
  for (const code of types) {
    const lower = code.toLowerCase();
    const meta = DISASTER_META[lower];
    if (!meta?.specificType || meta?.hidden) continue;
    if (seen.has(meta.specificType)) continue;
    seen.add(meta.specificType);
    const style =
      (meta?.classKey ? CLASS_STYLE[meta.classKey] : null) ??
      CATEGORY_STYLE[lower] ??
      { color: "var(--color-text-secondary)", bg: "var(--color-bg-muted)" };
    pills.push({ label: meta.specificType, ...style });
  }
  return pills;
}

// The catch-all "other" types: the top-level type (name and glyph) their chip
// shows when an event has nothing more specific.
const OTHER_TOP: Record<string, { name: string; glyph: string }> = {
  ot: { name: "Natural hazard", glyph: "cat-natural-disasters" },
  po: { name: "Conflict", glyph: "conflict" },
};

/** Glyph for a code the map has none for. */
const FALLBACK_GLYPH = "cat-other-operations";

export interface TypeChip {
  /** The glyph's slug; one chip per glyph. */
  key: string;
  /** Short names of the types behind the chip, comma-separated. */
  label: string;
  /** Glyph URL, the one the map pins use for these types. */
  icon: string;
  color: string;
  bg: string;
  /** The lowercase GLIDE codes behind the chip. */
  codes: string[];
}

/**
 * The type chips of a feed card: one per glyph, holding the short names of the
 * event's types that share it, coloured like their pills. Hidden types stay
 * out. The catch-all "other" types drop out next to a more specific type, and
 * on their own read as their top-level type.
 */
export function getTypeChips(types: readonly string[]): TypeChip[] {
  const codes = [...new Set(types.map((c) => c.toLowerCase()))].filter((c) => !DISASTER_META[c]?.hidden);
  const specific = codes.filter((c) => !(c in OTHER_TOP));
  const chips: Array<Omit<TypeChip, "label"> & { labels: string[] }> = [];
  for (const code of specific.length > 0 ? specific : codes) {
    const glyph = OTHER_TOP[code]?.glyph ?? GLIDE_TO_SLUG[code] ?? FALLBACK_GLYPH;
    const label = OTHER_TOP[code]?.name ?? getHazardName(code);
    const chip = chips.find((c) => c.key === glyph);
    if (chip) {
      chip.codes.push(code);
      if (!chip.labels.includes(label)) chip.labels.push(label);
      continue;
    }
    const meta = DISASTER_META[code];
    const style =
      (meta?.classKey ? CLASS_STYLE[meta.classKey] : null) ??
      CATEGORY_STYLE[code] ??
      { color: "var(--color-text-secondary)", bg: "var(--color-bg-muted)" };
    chips.push({ key: glyph, icon: signalIconUrl(glyph), codes: [code], labels: [label], ...style });
  }
  return chips.map(({ labels, ...chip }) => ({ ...chip, label: labels.join(", ") }));
}

export function getDisasterLabel(code: string): string {
  return DISASTER_META[code.toLowerCase()]?.label ?? code.toUpperCase();
}

/** The hazard a GLIDE code names, as a person reads it ("fl" -> "Flood",
 * "rm" -> "Shelling or missiles"): its short name, else `fallback`, else the
 * raw code uppercased when the taxonomy does not know it. */
export function getHazardName(code: string, fallback?: string): string {
  const meta = DISASTER_META[code.toLowerCase()];
  return meta?.specificType ?? (meta?.label || fallback || code.toUpperCase());
}

/** All GLIDE codes known to the pill system (including hidden). */
export function allDisasterTypeCodes(): string[] {
  return Object.keys(DISASTER_META);
}
