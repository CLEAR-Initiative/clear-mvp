import { describe, expect, it } from "vitest";
import {
  resolveOnboardingRedirect,
  resolveWelcomeEntry,
  shouldAutoStartTour,
} from "~/lib/onboarding/resolve-redirect";
import type { OnboardingTimestamps } from "~/lib/onboarding/types";

const empty: OnboardingTimestamps = {
  onboardingStartedAt: null,
  onboardingProfileCompletedAt: null,
  onboardingSettingsCompletedAt: null,
  onboardingTourCompletedAt: null,
  onboardingCompletedAt: null,
};

describe("resolveOnboardingRedirect", () => {
  it("allows access when onboarding is fully completed", () => {
    expect(
      resolveOnboardingRedirect(
        { ...empty, onboardingCompletedAt: "2026-07-01T00:00:00.000Z" },
        "/dashboard",
      ),
    ).toBeNull();
  });

  it("allows grandfathered users with no started timestamp", () => {
    expect(resolveOnboardingRedirect(empty, "/map")).toBeNull();
  });

  it("sends incomplete profile to /welcome/profile", () => {
    expect(
      resolveOnboardingRedirect(
        { ...empty, onboardingStartedAt: "2026-07-01T00:00:00.000Z" },
        "/dashboard",
      ),
    ).toBe("/welcome/profile");
  });

  it("does not redirect while already on the profile step", () => {
    expect(
      resolveOnboardingRedirect(
        { ...empty, onboardingStartedAt: "2026-07-01T00:00:00.000Z" },
        "/welcome/profile",
      ),
    ).toBeNull();
  });

  it("sends profile-complete users to /welcome/settings", () => {
    expect(
      resolveOnboardingRedirect(
        {
          ...empty,
          onboardingStartedAt: "2026-07-01T00:00:00.000Z",
          onboardingProfileCompletedAt: "2026-07-01T00:01:00.000Z",
        },
        "/map",
      ),
    ).toBe("/welcome/settings");
  });

  it("allows app access after settings when tour is still pending", () => {
    expect(
      resolveOnboardingRedirect(
        {
          ...empty,
          onboardingStartedAt: "2026-07-01T00:00:00.000Z",
          onboardingProfileCompletedAt: "2026-07-01T00:01:00.000Z",
          onboardingSettingsCompletedAt: "2026-07-01T00:02:00.000Z",
        },
        "/map",
      ),
    ).toBeNull();
  });
});

describe("resolveWelcomeEntry", () => {
  it("sends users without a completed profile to the profile step", () => {
    expect(resolveWelcomeEntry(empty)).toBe("/welcome/profile");
    expect(
      resolveWelcomeEntry({ ...empty, onboardingStartedAt: "2026-07-01T00:00:00.000Z" }),
    ).toBe("/welcome/profile");
  });

  it("sends users with a completed profile to the settings step", () => {
    expect(
      resolveWelcomeEntry({
        ...empty,
        onboardingStartedAt: "2026-07-01T00:00:00.000Z",
        onboardingProfileCompletedAt: "2026-07-01T00:01:00.000Z",
      }),
    ).toBe("/welcome/settings");
  });
});

describe("shouldAutoStartTour", () => {
  it("starts only after settings and before tour completion", () => {
    expect(
      shouldAutoStartTour({
        ...empty,
        onboardingSettingsCompletedAt: "2026-07-01T00:02:00.000Z",
      }),
    ).toBe(true);

    expect(
      shouldAutoStartTour({
        ...empty,
        onboardingSettingsCompletedAt: "2026-07-01T00:02:00.000Z",
        onboardingTourCompletedAt: "2026-07-01T00:03:00.000Z",
      }),
    ).toBe(false);
  });
});
