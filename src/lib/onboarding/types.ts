export interface OnboardingTimestamps {
  onboardingStartedAt: string | null;
  onboardingProfileCompletedAt: string | null;
  onboardingSettingsCompletedAt: string | null;
  onboardingTourCompletedAt: string | null;
  onboardingCompletedAt: string | null;
}

export type OnboardingRedirectTarget =
  | "/welcome/profile"
  | "/welcome/settings"
  | null;

/** Options when the Product Tour completes (Finish/Skip vs in-app exit). */
export type TourCompleteOptions = {
  /** When true (default), land on `/map` without `tour`. False leaves the current route (e.g. View details). */
  landOnMap?: boolean;
};

export type TourPage = "detection" | "map";

export type ProductTourStepId =
  | "detectionAlerts"
  | "detectionEvents"
  | "mapLayers"
  | "mapCanvas";

export interface ProductTourStep {
  id: ProductTourStepId;
  /** i18n key under onboarding.tour.steps.<id> */
  page: TourPage;
  /** App route for this stop (tour navigates here before spotlighting). */
  route: "/detection" | "/map";
  /**
   * Optional Detection `tab` query (`alerts`, `events`, …).
   * Legacy `live` is still accepted by Detection as an alias for `alerts`.
   * Merged into navigation as `?tour=1&tab=…`.
   */
  tab?: "alerts" | "live" | "events" | "signals" | "history";
  /** CSS selector for driver.js spotlight */
  target: string;
  side?: "top" | "bottom" | "left" | "right" | "over" | "bottom-left" | "top-right";
  primaryAction: "next" | "finish";
  showBack: boolean;
  /**
   * open-map-layers — open the Layers panel before spotlighting.
   * demo-map-explore — close Layers, zoom into a cluster area, open a marker detail.
   */
  prepare?: "open-map-layers" | "demo-map-explore";
}
