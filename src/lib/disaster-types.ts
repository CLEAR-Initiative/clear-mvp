// Keyed by GLIDE number (what event.types contains).
// Types sharing the same classKey are deduped to a single pill.
// hidden: true suppresses the pill without falling back to raw uppercase code.
const DISASTER_META: Record<string, { label: string; classKey?: string; hidden?: boolean }> = {
  ce: { label: "", hidden: true },
  // Natural hazards
  av: { label: "Avalanche" },
  cw: { label: "Cold Wave" },
  dr: { label: "Drought" },
  ec: { label: "Extratrop. Cyclone" },
  eq: { label: "Earthquake" },
  et: { label: "Extreme Temp" },
  ff: { label: "Flash Flood" },
  fl: { label: "Flood" },
  fr: { label: "Fire" },
  ht: { label: "Heat Wave" },
  in: { label: "Insect Infestation" },
  ls: { label: "Landslide" },
  ms: { label: "Mudslide" },
  sl: { label: "Slide" },
  ss: { label: "Storm Surge" },
  st: { label: "Severe Storm" },
  tc: { label: "Tropical Cyclone" },
  to: { label: "Tornado" },
  ts: { label: "Tsunami" },
  vo: { label: "Volcano" },
  vw: { label: "Violent Wind" },
  wf: { label: "Wildfire" },
  // Conflict - battles
  ba: { label: "Conflict", classKey: "conflict" },
  bg: { label: "Conflict", classKey: "conflict" },
  bo: { label: "Conflict", classKey: "conflict" },
  // Conflict - explosions / remote violence
  rb: { label: "Conflict", classKey: "conflict" },
  rc: { label: "Conflict", classKey: "conflict" },
  rg: { label: "Conflict", classKey: "conflict" },
  rl: { label: "Conflict", classKey: "conflict" },
  rm: { label: "Conflict", classKey: "conflict" },
  rs: { label: "Conflict", classKey: "conflict" },
  rv: { label: "Conflict", classKey: "conflict" },
  // Conflict - protests
  pf: { label: "Conflict", classKey: "conflict" },
  pi: { label: "Conflict", classKey: "conflict" },
  pp: { label: "Conflict", classKey: "conflict" },
  pr: { label: "Conflict", classKey: "conflict" },
  // Conflict - riots
  rd: { label: "Conflict", classKey: "conflict" },
  ri: { label: "Conflict", classKey: "conflict" },
  // Conflict - political violence / strategic
  pa: { label: "Conflict", classKey: "conflict" },
  pg: { label: "Conflict", classKey: "conflict" },
  ph: { label: "Conflict", classKey: "conflict" },
  pl: { label: "Conflict", classKey: "conflict" },
  po: { label: "Conflict", classKey: "conflict" },
  pt: { label: "Conflict", classKey: "conflict" },
  pv: { label: "Conflict", classKey: "conflict" },
  pw: { label: "Conflict", classKey: "conflict" },
  // Conflict - violence against civilians
  va: { label: "Conflict", classKey: "conflict" },
  vc: { label: "Conflict", classKey: "conflict" },
  vd: { label: "Conflict", classKey: "conflict" },
  vs: { label: "Conflict", classKey: "conflict" },
  // Crisis
  fa: { label: "Famine" },
  fc: { label: "Econ. Crisis" },
  // Other
  ac: { label: "Tech. Disaster" },
  ep: { label: "Epidemic" },
  ot: { label: "Other" },
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


export function getDisasterLabel(code: string): string {
  return DISASTER_META[code.toLowerCase()]?.label ?? code.toUpperCase();
}
