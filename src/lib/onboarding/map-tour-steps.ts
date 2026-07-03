import type { MapTourStep } from "./types";

/** Four-stop map tour aligned with Figma NRC-UX-review frames 207:4 → 207:577 */
export const MAP_TOUR_STEPS: MapTourStep[] = [
  {
    id: "signals",
    bodyKey: "steps.signals.body",
    target: '[data-tour="active-signals"]',
    side: "bottom",
    primaryAction: "next",
    showBack: false,
  },
  {
    id: "events",
    bodyKey: "steps.events.body",
    target: '[data-tour="impact-zone"]',
    side: "left",
    primaryAction: "next",
    showBack: true,
  },
  {
    id: "iconography",
    bodyKey: "steps.iconography.body",
    target: '[data-tour="signal-legend"]',
    side: "right",
    primaryAction: "next",
    showBack: true,
  },
  {
    id: "navigation",
    bodyKey: "steps.navigation.body",
    target: '[data-tour="map-filters"]',
    side: "bottom",
    primaryAction: "finish",
    showBack: true,
  },
];
