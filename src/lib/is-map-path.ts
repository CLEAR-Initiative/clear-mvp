/** True for `/map` and nested map routes (not `/mapbox`, etc.). */
export function isMapPath(pathname: string): boolean {
  return pathname === "/map" || pathname.startsWith("/map/");
}

/** Expanded desktop sidebar width — keep SSR `--clear-nav-w` in sync with NavSidebar. */
export const NAV_EXPANDED_W_PX = 240;

/** Collapsed desktop sidebar width — keep SSR `--clear-nav-w` in sync with NavSidebar. */
export const NAV_COLLAPSED_W_PX = 80;
