export const TIMELINE_DAYS = 90;
export const PRESETS = ["24h", "7d", "30d", "90d"] as const;
export type Preset = (typeof PRESETS)[number];

export type Timeframe = { kind: "rolling"; days: number } | { kind: "fixed"; from: string; to: string };

export const DEFAULT_TIMEFRAME: Timeframe = { kind: "rolling", days: 30 };

export type BarRange = readonly [start: number, end: number];
export type TimelineExtent = { startMs: number; from: string; to: string };

const DAY = 86_400_000;
const LAST_BAR = TIMELINE_DAYS - 1;
const PRESET_DAYS: Record<Preset, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function validDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dayMs(value)) && dayOf(dayMs(value)) === value;
}

export function parseTimeframe(value: string): Timeframe | null {
  if (value === "24h") return { kind: "rolling", days: 1 };
  const rolling = /^([1-9]\d?)d$/.exec(value);
  if (rolling) {
    const days = Number(rolling[1]);
    return days <= TIMELINE_DAYS ? { kind: "rolling", days } : null;
  }
  const [from, to, ...rest] = value.split("..");
  if (rest.length || !from || !to || !validDay(from) || !validDay(to) || from > to) return null;
  return { kind: "fixed", from, to };
}

export function serializeTimeframe(tf: Timeframe): string {
  if (tf.kind === "fixed") return `${tf.from}..${tf.to}`;
  return tf.days === 1 ? "24h" : `${tf.days}d`;
}

export function timelineExtent(now: Date): TimelineExtent {
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - LAST_BAR * DAY;
  return { startMs, from: new Date(startMs).toISOString(), to: now.toISOString() };
}

export function clampTimeframe(tf: Timeframe, extent: TimelineExtent): Timeframe {
  if (tf.kind === "rolling") return tf;
  const startDay = dayOf(extent.startMs);
  if (tf.to < startDay) return DEFAULT_TIMEFRAME;
  return tf.from < startDay ? { ...tf, from: startDay } : tf;
}

export function timeframeQuery(tf: Timeframe, now: Date): { from: string; to?: string } {
  if (tf.kind === "rolling") return { from: new Date(now.getTime() - tf.days * DAY).toISOString() };
  return { from: `${tf.from}T00:00:00.000Z`, to: `${tf.to}T23:59:59.999Z` };
}

const clampBar = (i: number) => Math.min(LAST_BAR, Math.max(0, Math.round(i)));
export const barOfDay = (day: string, extent: TimelineExtent) => Math.round((dayMs(day) - extent.startMs) / DAY);
export const dateOfBar = (index: number, extent: TimelineExtent) => new Date(extent.startMs + index * DAY);
const barOf = (day: string, extent: TimelineExtent) => clampBar(barOfDay(day, extent));

export function timeframeBars(tf: Timeframe, extent: TimelineExtent): BarRange {
  if (tf.kind === "rolling") return [clampBar(TIMELINE_DAYS - tf.days), LAST_BAR];
  return [barOf(tf.from, extent), barOf(tf.to, extent)];
}

export function barsToTimeframe(range: BarRange, extent: TimelineExtent): Timeframe {
  const [start, end] = range;
  if (end === LAST_BAR) return { kind: "rolling", days: TIMELINE_DAYS - start };
  return { kind: "fixed", from: dayOf(extent.startMs + start * DAY), to: dayOf(extent.startMs + end * DAY) };
}

export function presetOf(tf: Timeframe): Preset | null {
  if (tf.kind !== "rolling") return null;
  return PRESETS.find((preset) => PRESET_DAYS[preset] === tf.days) ?? null;
}

export function presetTimeframe(preset: Preset): Timeframe {
  return { kind: "rolling", days: PRESET_DAYS[preset] };
}

export function stepHandle(range: BarRange, handle: "start" | "end", key: string, rtl: boolean): BarRange | null {
  const current = handle === "start" ? range[0] : range[1];
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const back = rtl ? "ArrowRight" : "ArrowLeft";
  const steps: Record<string, number> = { [forward]: 1, ArrowUp: 1, [back]: -1, ArrowDown: -1, PageUp: 7, PageDown: -7 };
  if (key === "Home") return moveHandle(range, handle, 0);
  if (key === "End") return moveHandle(range, handle, LAST_BAR);
  const step = steps[key];
  return step === undefined ? null : moveHandle(range, handle, current + step);
}

export function barHeights(counts: readonly number[], floor: number): number[] {
  const max = Math.max(1, ...counts);
  return counts.map((c) => Math.max(floor, c / max));
}

export function nearestHandle(range: BarRange, index: number): "start" | "end" {
  const [start, end] = range;
  if (index <= start) return "start";
  if (index >= end) return "end";
  return index - start <= end - index ? "start" : "end";
}

export function moveHandle(range: BarRange, handle: "start" | "end", index: number): BarRange {
  const i = clampBar(index);
  return handle === "start" ? [Math.min(i, range[1]), range[1]] : [range[0], Math.max(i, range[0])];
}
