import type { ProductTourStep } from "./types";

/**
 * Product tour: Detection → Insights → Map (2–3 stops each).
 * Ends on Map so Finish leaves the user there.
 */
export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  // ── Detection ──────────────────────────────────────────────────────────
  {
    id: "detectionTabs",
    page: "detection",
    route: "/detection",
    target: '[data-tour="detection-tabs"]',
    side: "bottom",
    primaryAction: "next",
    showBack: false,
  },
  {
    id: "detectionFilters",
    page: "detection",
    route: "/detection",
    target: '[data-tour="detection-filters"]',
    side: "bottom",
    primaryAction: "next",
    showBack: true,
  },
  {
    id: "detectionCreate",
    page: "detection",
    route: "/detection",
    target: '[data-tour="detection-create"]',
    side: "bottom",
    primaryAction: "next",
    showBack: true,
  },
  // ── Insights ───────────────────────────────────────────────────────────
  {
    id: "insightsTabs",
    page: "insights",
    route: "/insights",
    target: '[data-tour="insights-tabs"]',
    side: "bottom",
    primaryAction: "next",
    showBack: true,
  },
  {
    id: "insightsCrises",
    page: "insights",
    route: "/insights",
    target: '[data-tour="insights-crises"]',
    side: "top",
    primaryAction: "next",
    showBack: true,
  },
  // ── Map (finish here) ──────────────────────────────────────────────────
  {
    id: "mapLayers",
    page: "map",
    route: "/map",
    target: '[data-tour="map-layers"]',
    side: "left",
    primaryAction: "next",
    showBack: true,
  },
  {
    id: "mapFilters",
    page: "map",
    route: "/map",
    target: '[data-tour="map-filters"]',
    side: "bottom",
    primaryAction: "next",
    showBack: true,
  },
  {
    id: "mapCanvas",
    page: "map",
    route: "/map",
    target: '[data-tour="map-canvas"]',
    side: "over",
    primaryAction: "finish",
    showBack: true,
  },
];

/** @deprecated Use PRODUCT_TOUR_STEPS */
export const MAP_TOUR_STEPS = PRODUCT_TOUR_STEPS;
