// Keyed by GLIDE number (what event.types contains).
// Types sharing the same classKey are deduped to a single L1 pill.
// l2 = L2 group label, specificType = most granular label shown as secondary pill.
const DISASTER_META: Record<string, { label: string; classKey?: string; hidden?: boolean; l2?: string; specificType?: string }> = {
  ce: { label: "", hidden: true, l2: "complex emergency", specificType: "Complex Emergency" },
  // ─── Natural hazards ───
  av: { label: "Avalanche",        l2: "snow avalanche",          specificType: "Snow Avalanche" },
  cw: { label: "Cold Wave",        l2: "cold wave",               specificType: "Cold Wave" },
  dr: { label: "Drought",          l2: "drought",                 specificType: "Drought" },
  ec: { label: "Extratrop. Cyclone", l2: "extratropical cyclone", specificType: "Extratropical Cyclone" },
  eq: { label: "Earthquake",       l2: "earthquake",              specificType: "Earthquake" },
  et: { label: "Extreme Temp",     l2: "extreme temperature",     specificType: "Extreme Temperature" },
  ff: { label: "Flash Flood",      l2: "flash flood",             specificType: "Flash Flood" },
  fl: { label: "Flood",            l2: "flood",                   specificType: "Flood" },
  fr: { label: "Fire",             l2: "fire",                    specificType: "Fire" },
  ht: { label: "Heat Wave",        l2: "heat wave",               specificType: "Heat Wave" },
  in: { label: "Insect Infestation", l2: "insect infestation",    specificType: "Insect Infestation" },
  ls: { label: "Landslide",        l2: "land slide",              specificType: "Landslide" },
  ms: { label: "Mudslide",         l2: "mud slide",               specificType: "Mudslide" },
  sl: { label: "Slide",            l2: "slide",                   specificType: "Slide" },
  ss: { label: "Storm Surge",      l2: "storm surge",             specificType: "Storm Surge" },
  st: { label: "Severe Storm",     l2: "severe local storm",      specificType: "Severe Local Storm" },
  tc: { label: "Tropical Cyclone", l2: "tropical cyclone",        specificType: "Tropical Cyclone" },
  to: { label: "Tornado",          l2: "tornado",                 specificType: "Tornado" },
  ts: { label: "Tsunami",          l2: "tsunami",                 specificType: "Tsunami" },
  vo: { label: "Volcano",          l2: "volcano",                 specificType: "Volcano" },
  vw: { label: "Violent Wind",     l2: "violent wind",            specificType: "Violent Wind" },
  wf: { label: "Wildfire",         l2: "wild fire",               specificType: "Wildfire" },
  ot: { label: "Other",            l2: "other",                   specificType: "Other" },
  // ─── Conflict - battles ───
  ba: { label: "Conflict", classKey: "conflict", l2: "battles",                           specificType: "Armed Clash" },
  bg: { label: "Conflict", classKey: "conflict", l2: "battles",                           specificType: "Gov. Regains Territory" },
  bo: { label: "Conflict", classKey: "conflict", l2: "battles",                           specificType: "Non-State Actor Overtakes Territory" },
  // ─── Conflict - explosions / remote violence ───
  rb: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Suicide Bomb" },
  rc: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Chemical Weapon" },
  rg: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Grenade" },
  rl: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Remote Explosive / IED" },
  rm: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Shelling / Artillery" },
  rs: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Air / Drone Strike" },
  rv: { label: "Conflict", classKey: "conflict", l2: "explosions or remote violence",     specificType: "Explosions / Remote Violence" },
  // ─── Conflict - protests ───
  pf: { label: "Conflict", classKey: "conflict", l2: "protests",                          specificType: "Excessive Force vs. Protesters" },
  pi: { label: "Conflict", classKey: "conflict", l2: "protests",                          specificType: "Protest with Intervention" },
  pp: { label: "Conflict", classKey: "conflict", l2: "protests",                          specificType: "Peaceful Protest" },
  pr: { label: "Conflict", classKey: "conflict", l2: "protests",                          specificType: "Protest" },
  // ─── Conflict - riots ───
  rd: { label: "Conflict", classKey: "conflict", l2: "riots",                             specificType: "Violent Demonstration" },
  ri: { label: "Conflict", classKey: "conflict", l2: "riots",                             specificType: "Mob Violence" },
  // ─── Conflict - strategic / political ───
  pa: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Arrests" },
  pg: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Change to Group / Activity" },
  ph: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "HQ / Base Established" },
  pl: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Looting / Property Destruction" },
  po: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Other" },
  pt: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Non-Violent Territory Transfer" },
  pv: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Agreement" },
  pw: { label: "Conflict", classKey: "conflict", l2: "strategic developments",            specificType: "Disrupted Weapons Use" },
  // ─── Conflict - violence against civilians ───
  va: { label: "Conflict", classKey: "conflict", l2: "violence against civilians",        specificType: "Attack" },
  vc: { label: "Conflict", classKey: "conflict", l2: "violence against civilians",        specificType: "Abduction / Forced Disappearance" },
  vd: { label: "Conflict", classKey: "conflict", l2: "violence against civilians",        specificType: "Abduction / Forced Disappearance" },
  vs: { label: "Conflict", classKey: "conflict", l2: "violence against civilians",        specificType: "Sexual Violence" },
  // ─── Other top-level ───
  fa: { label: "Famine",         l2: "famine",                specificType: "Famine" },
  fc: { label: "Econ. Crisis",   l2: "economic crisis",       specificType: "Economic Crisis" },
  ac: { label: "Tech. Disaster", l2: "technological disaster", specificType: "Technological Disaster" },
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

export function getDisasterLabel(code: string): string {
  return DISASTER_META[code.toLowerCase()]?.label ?? code.toUpperCase();
}
