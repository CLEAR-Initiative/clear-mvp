/**
 * Inline SVG icons for map markers, indexed by crisis/event type.
 *
 * Emoji were previously used, but render inconsistently across platforms
 * (Apple vs. Noto vs. Segoe UI Emoji). SVG keeps the visual consistent.
 *
 * Every icon is a 14x14 viewBox, stroked/filled in `currentColor` so the
 * marker can colour them via CSS.
 */

const ICON_CONFLICT = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 21l6-6"/><path d="M15 9l6-6"/>
  <path d="M14 4l6 6"/><path d="M4 14l6 6"/>
  <path d="M9 15l-3 3"/><path d="M15 9l3-3"/>
</svg>`;

const ICON_DISPLACEMENT = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="9" cy="7" r="3"/>
  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
  <path d="M17 11l4 4m0 0l-4 4m4-4h-8"/>
</svg>`;

const ICON_WATER = `
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2.5c0 0 -6 7.5 -6 12.5a6 6 0 1 0 12 0c0 -5 -6 -12.5 -6 -12.5z"/>
</svg>`;

const ICON_SUN = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4 -1.4M17 7l1.4 -1.4"/>
</svg>`;

const ICON_DISEASE = `
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M10 3h4v7h7v4h-7v7h-4v-7h-7v-4h7z"/>
</svg>`;

const ICON_FOOD = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3v13"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>
</svg>`;

const ICON_TEAM = `
<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>`;

const ICON_DEFAULT = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3v10"/><circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none"/>
</svg>`;

const ICONS_BY_TYPE: Record<string, string> = {
  conflict: ICON_CONFLICT,
  displacement: ICON_DISPLACEMENT,
  flooding: ICON_WATER,
  flood: ICON_WATER,
  wash: ICON_WATER,
  drought: ICON_SUN,
  heat_wave: ICON_SUN,
  cholera: ICON_DISEASE,
  disease: ICON_DISEASE,
  health: ICON_DISEASE,
  food_insecurity: ICON_FOOD,
  famine: ICON_FOOD,
  access: ICON_DEFAULT,
  team: ICON_TEAM,
};

/** Return an inline SVG string for a marker type. Falls back to a generic icon. */
export function getMarkerIcon(type: string | undefined): string {
  if (!type) return ICON_DEFAULT;
  return ICONS_BY_TYPE[type.toLowerCase()] ?? ICON_DEFAULT;
}
