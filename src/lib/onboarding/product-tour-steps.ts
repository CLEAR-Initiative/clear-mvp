import type { ProductTourStep } from "./types";

/**
 * Minimalist Product Tour: Alert → Event on Detection, then Map Layers → explore canvas.
 * Ends on Map so Finish / Skip leave the user there.
 */
export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    id: "detectionAlerts",
    page: "detection",
    route: "/detection",
    tab: "alerts",
    target: '[data-tour="detection-tab-alerts"]',
    side: "bottom",
    primaryAction: "next",
    showBack: false,
  },
  {
    id: "detectionEvents",
    page: "detection",
    route: "/detection",
    tab: "events",
    target: '[data-tour="detection-tab-events"]',
    side: "bottom",
    primaryAction: "next",
    showBack: true,
  },
  {
    id: "mapLayers",
    page: "map",
    route: "/map",
    target: '[data-tour="map-layers-panel"]',
    side: "right",
    primaryAction: "next",
    showBack: true,
    prepare: "open-map-layers",
  },
  {
    id: "mapCanvas",
    page: "map",
    route: "/map",
    target: '[data-tour="map-canvas"]',
    /** Same column as Layers, nudged slightly left (see placeCard). */
    side: "left",
    primaryAction: "finish",
    showBack: true,
    prepare: "demo-map-explore",
  },
];

/** @deprecated Use PRODUCT_TOUR_STEPS */
export const MAP_TOUR_STEPS = PRODUCT_TOUR_STEPS;
