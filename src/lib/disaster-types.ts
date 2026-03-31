// Keyed by GLIDE number (what event.types contains).
// Types sharing the same classKey are deduped to a single pill.
const DISASTER_META: Record<string, { label: string; classKey?: string }> = {
  et: { label: "Extreme Temp" },
  cw: { label: "Cold Wave" },
  ht: { label: "Heat Wave" },
  ce: { label: "Complex Emerg." },
  dr: { label: "Drought" },
  eq: { label: "Earthquake" },
  ep: { label: "Epidemic" },
  ec: { label: "Extratrop. Cyclone" },
  fr: { label: "Fire" },
  fl: { label: "Flood" },
  ls: { label: "Landslide" },
  ac: { label: "Tech. Disaster" },
  to: { label: "Tornado" },
  ts: { label: "Tsunami" },
  vo: { label: "Volcano" },
  wf: { label: "Wildfire" },
  ot: { label: "Other" },
  pv: { label: "Conflict", classKey: "conflict" },
  ba: { label: "Conflict", classKey: "conflict" },
  pr: { label: "Conflict", classKey: "conflict" },
  ri: { label: "Conflict", classKey: "conflict" },
  rv: { label: "Conflict", classKey: "conflict" },
  vc: { label: "Conflict", classKey: "conflict" },
  fc: { label: "Econ. Crisis" },
  fa: { label: "Famine" },
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
