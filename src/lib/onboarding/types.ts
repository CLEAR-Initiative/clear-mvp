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

export type TourPage = "detection" | "insights" | "map";

export type ProductTourStepId =
  | "detectionTabs"
  | "detectionFilters"
  | "detectionCreate"
  | "insightsTabs"
  | "insightsCrises"
  | "mapLayers"
  | "mapFilters"
  | "mapCanvas";

export interface ProductTourStep {
  id: ProductTourStepId;
  /** i18n key under onboarding.tour.steps.<id> */
  page: TourPage;
  /** App route for this stop (tour navigates here before spotlighting). */
  route: "/detection" | "/insights" | "/map";
  /** CSS selector for driver.js spotlight */
  target: string;
  side?: "top" | "bottom" | "left" | "right" | "over";
  primaryAction: "next" | "finish";
  showBack: boolean;
}
