import type { OnboardingRedirectTarget, OnboardingTimestamps } from "./types";

/**
 * Returns the welcome route the user must visit, or null when app access is allowed.
 * Mirrors backend field semantics from the onboarding PRD.
 */
export function resolveOnboardingRedirect(
  state: OnboardingTimestamps,
  pathname: string,
): OnboardingRedirectTarget {
  if (state.onboardingCompletedAt) return null;
  if (!state.onboardingStartedAt) return null;

  if (!state.onboardingProfileCompletedAt) {
    return pathname.startsWith("/welcome/profile") ? null : "/welcome/profile";
  }

  if (!state.onboardingSettingsCompletedAt) {
    return pathname.startsWith("/welcome/settings") ? null : "/welcome/settings";
  }

  return null;
}

export function shouldAutoStartTour(state: OnboardingTimestamps): boolean {
  return (
    !!state.onboardingSettingsCompletedAt &&
    !state.onboardingTourCompletedAt &&
    !state.onboardingCompletedAt
  );
}
