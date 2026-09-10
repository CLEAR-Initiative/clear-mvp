/** True for `/map` and nested map routes (not `/mapbox`, etc.). */
export function isMapPath(pathname: string): boolean {
  return pathname === "/map" || pathname.startsWith("/map/");
}
