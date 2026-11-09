/**
 * The Crisis page's tabs live in the URL (`?tab=` for Overview/Needs,
 * `?panel=` for the Events/Demography/Sources/Confidence left panel), so a
 * reload keeps them, a link shares them and page views record them.
 * Unknown values fall back to the default tab.
 */

export const CRISIS_TABS = ["overview", "needs"] as const;
export const CRISIS_PANELS = ["events", "demography", "sources", "confidence"] as const;

export type CrisisTab = (typeof CRISIS_TABS)[number];
export type CrisisPanel = (typeof CRISIS_PANELS)[number];

function pick<T extends string>(allowed: readonly T[], raw: string | null | undefined): T {
  return (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : allowed[0]!;
}

export function readCrisisTabs(params: { get(key: string): string | null }): { tab: CrisisTab; panel: CrisisPanel } {
  return { tab: pick(CRISIS_TABS, params.get("tab")), panel: pick(CRISIS_PANELS, params.get("panel")) };
}

/**
 * The query string with `key` set to `value`; the default value is dropped
 * so the plain URL stays canonical. Other parameters (`from`) are kept.
 */
export function withCrisisTab(search: string, key: "tab" | "panel", value: string): string {
  const params = new URLSearchParams(search);
  const defaults = { tab: CRISIS_TABS[0], panel: CRISIS_PANELS[0] };
  if (value === defaults[key]) params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : "";
}
