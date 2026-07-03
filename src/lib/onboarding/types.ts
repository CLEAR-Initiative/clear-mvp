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

export interface MapTourStep {
  id: "signals" | "events" | "iconography" | "navigation";
  bodyKey: string;
  /** CSS selector for driver.js spotlight */
  target: string;
  /** Popover placement relative to target */
  side?: "top" | "bottom" | "left" | "right" | "over";
  primaryAction: "next" | "finish";
  showBack: boolean;
}
