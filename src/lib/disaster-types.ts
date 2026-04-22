// Keyed by the code stored in event.types (GLIDE number or CLEAR id).
// Types sharing the same classKey are deduped to a single pill.
const DISASTER_META: Record<string, { label: string; classKey?: string }> = {
  // ─── Natural hazards ───
  et: { label: "Extreme Temp" },
  cw: { label: "Cold Wave" },
  ht: { label: "Heat Wave" },
  ce: { label: "Complex Emerg." },
  dr: { label: "Drought" },
  eq: { label: "Earthquake" },
  ec: { label: "Extratrop. Cyclone" },
  fr: { label: "Fire" },
  ff: { label: "Flash Flood" },
  fl: { label: "Flood" },
  in: { label: "Insect Infest." },
  sl: { label: "Slide" },
  ls: { label: "Landslide" },
  ms: { label: "Mud Slide" },
  av: { label: "Snow Avalanche" },
  st: { label: "Severe Storm" },
  to: { label: "Tornado" },
  tc: { label: "Tropical Cyclone" },
  ss: { label: "Storm Surge" },
  ts: { label: "Tsunami" },
  vo: { label: "Volcano" },
  wf: { label: "Wildfire" },
  vw: { label: "Violent Wind" },
  ot: { label: "Other" },
  // ─── Other top-level categories ───
  ep: { label: "Epidemic" },
  ac: { label: "Tech. Disaster" },
  fc: { label: "Econ. Crisis" },
  fa: { label: "Famine" },
  // ─── Conflict — all deduped to a single "Conflict" pill ───
  // Protests
  pp: { label: "Conflict", classKey: "conflict" },
  pi: { label: "Conflict", classKey: "conflict" },
  pf: { label: "Conflict", classKey: "conflict" },
  // Battles
  ba: { label: "Conflict", classKey: "conflict" },
  bg: { label: "Conflict", classKey: "conflict" },
  bo: { label: "Conflict", classKey: "conflict" },
  // Riots
  ri: { label: "Conflict", classKey: "conflict" },
  rd: { label: "Conflict", classKey: "conflict" },
  // Explosions / remote violence
  rc: { label: "Conflict", classKey: "conflict" },
  rg: { label: "Conflict", classKey: "conflict" },
  rs: { label: "Conflict", classKey: "conflict" },
  rm: { label: "Conflict", classKey: "conflict" },
  rl: { label: "Conflict", classKey: "conflict" },
  rb: { label: "Conflict", classKey: "conflict" },
  // Violence against civilians
  va: { label: "Conflict", classKey: "conflict" },
  vs: { label: "Conflict", classKey: "conflict" },
  vd: { label: "Conflict", classKey: "conflict" },
  // Strategic developments / political violence
  pv: { label: "Conflict", classKey: "conflict" },
  pa: { label: "Conflict", classKey: "conflict" },
  pg: { label: "Conflict", classKey: "conflict" },
  pw: { label: "Conflict", classKey: "conflict" },
  ph: { label: "Conflict", classKey: "conflict" },
  pl: { label: "Conflict", classKey: "conflict" },
  pt: { label: "Conflict", classKey: "conflict" },
  po: { label: "Conflict", classKey: "conflict" },
  // ─── Legacy codes (pre-hierarchy) — kept so historical events still render ───
  pr: { label: "Conflict", classKey: "conflict" }, // was umbrella "protests"
  rv: { label: "Conflict", classKey: "conflict" }, // was umbrella "explosions"
  vc: { label: "Conflict", classKey: "conflict" }, // was umbrella "violence against civilians"
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

export function getDisasterPills(types: string[]): DisasterPill[] {
  const seen = new Set<string>();
  const pills: DisasterPill[] = [];
  for (const code of types) {
    const lower = code.toLowerCase();
    const meta = DISASTER_META[lower];
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
