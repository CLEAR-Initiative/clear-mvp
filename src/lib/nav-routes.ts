/**
 * The app sections in the nav, by their `nav.items` label key, and the route
 * each one opens. One list for the nav sidebar and the CLEAR Agent's context
 * row, so a section added or moved in the nav is named in both.
 */
export const NAV_ROUTES = {
  overview: "/dashboard",
  detection: "/detection",
  inbox: "/inbox",
  map: "/map",
  insights: "/insights",
  operations: "/operations",
  cash: "/cash",
  knowledge: "/knowledge",
} as const;

export type NavItemKey = keyof typeof NAV_ROUTES;

const BY_SEGMENT = new Map<string, NavItemKey>(
  (Object.entries(NAV_ROUTES) as Array<[NavItemKey, string]>).map(([key, href]) => [href.split("/")[1] ?? "", key]),
);

/** The nav section a route belongs to, by its first path segment (`/map/x` → `map`). */
export function navItemForRoute(route: string): NavItemKey | undefined {
  return BY_SEGMENT.get(route.split("/")[1] ?? "");
}
