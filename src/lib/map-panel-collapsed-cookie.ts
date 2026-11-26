import { parseNavCollapsedCookie } from "~/lib/nav-collapsed-cookie";

export const MAP_PANEL_COLLAPSED_COOKIE = "clear-map-panel-collapsed";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const parseMapPanelCollapsedCookie = parseNavCollapsedCookie;

export function setMapPanelCollapsedCookie(collapsed: boolean): void {
  document.cookie = `${MAP_PANEL_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}
