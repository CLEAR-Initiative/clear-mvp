import type { OnboardingTimestamps } from "./types";

const STORAGE_PREFIX = "clear-onboarding";

function key(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

const EMPTY: OnboardingTimestamps = {
  onboardingStartedAt: null,
  onboardingProfileCompletedAt: null,
  onboardingSettingsCompletedAt: null,
  onboardingTourCompletedAt: null,
  onboardingCompletedAt: null,
};

export function readOnboardingState(userId: string): OnboardingTimestamps {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<OnboardingTimestamps>) };
  } catch {
    return EMPTY;
  }
}

export function writeOnboardingState(
  userId: string,
  patch: Partial<OnboardingTimestamps>,
): OnboardingTimestamps {
  const next = { ...readOnboardingState(userId), ...patch };
  localStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}

export function markOnboardingStarted(userId: string): OnboardingTimestamps {
  return writeOnboardingState(userId, {
    onboardingStartedAt: new Date().toISOString(),
  });
}

export function markProfileComplete(userId: string): OnboardingTimestamps {
  return writeOnboardingState(userId, {
    onboardingProfileCompletedAt: new Date().toISOString(),
  });
}

export function markSettingsComplete(userId: string): OnboardingTimestamps {
  return writeOnboardingState(userId, {
    onboardingSettingsCompletedAt: new Date().toISOString(),
  });
}

export function markTourComplete(userId: string): OnboardingTimestamps {
  const now = new Date().toISOString();
  return writeOnboardingState(userId, {
    onboardingTourCompletedAt: now,
    onboardingCompletedAt: now,
  });
}

/** Dev/demo: force onboarding for the current user */
export function resetOnboardingState(userId: string): void {
  localStorage.removeItem(key(userId));
}
