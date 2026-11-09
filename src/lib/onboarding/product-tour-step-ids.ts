/** Every Product Tour step id, in tour order. Fixed values, safe as analytics props. */
export const PRODUCT_TOUR_STEP_IDS = ["detectionAlerts", "detectionEvents", "mapLayers", "mapCanvas"] as const;

export type ProductTourStepId = (typeof PRODUCT_TOUR_STEP_IDS)[number];
