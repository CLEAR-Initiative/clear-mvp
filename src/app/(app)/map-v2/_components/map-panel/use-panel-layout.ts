import { useSyncExternalStore } from "react";

/** From this width up the Map panel sits beside the map; below it, the map sheet covers the map's bottom edge. */
export const PANEL_MEDIA_QUERY = "(min-width: 62em)";

export type PanelLayout = "panel" | "sheet";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(PANEL_MEDIA_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const layoutNow = (): PanelLayout => (window.matchMedia(PANEL_MEDIA_QUERY).matches ? "panel" : "sheet");

/**
 * Which of the two holds the panel's views on this screen. Null on the server and while hydrating, as only the
 * browser knows its width; the two frames are laid out by CSS, so they need no guess to render.
 */
export function usePanelLayout(): PanelLayout | null {
  return useSyncExternalStore(subscribe, layoutNow, () => null);
}
