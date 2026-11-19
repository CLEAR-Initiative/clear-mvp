const MAP_ROUTES = ["/map", "/map-v2"];

/** True for `/map`, `/map-v2` and their nested routes (not `/mapbox`, etc.). */
export function isMapPath(pathname: string): boolean {
  return MAP_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Expanded desktop sidebar width — keep SSR `--clear-nav-w` in sync with NavSidebar. */
export const NAV_EXPANDED_W_PX = 240;

/** Collapsed desktop sidebar width — keep SSR `--clear-nav-w` in sync with NavSidebar. */
export const NAV_COLLAPSED_W_PX = 80;
