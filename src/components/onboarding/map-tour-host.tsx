"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActiveSignalsCard } from "~/components/onboarding/active-signals-card";
import { MapProductTour } from "~/components/onboarding/map-product-tour";
import { SignalLegendCard } from "~/components/onboarding/signal-legend-card";
import { TourImpactZoneMarker } from "~/components/onboarding/tour-impact-zone-marker";
import { notifyOnboardingChange, useOnboardingState } from "~/hooks/use-onboarding-state";
import { shouldAutoStartTour } from "~/lib/onboarding/resolve-redirect";

interface MapTourHostProps {
  userId: string;
  signalCount: number;
}

function MapTourHostInner({ userId, signalCount }: MapTourHostProps) {
  const searchParams = useSearchParams();
  const tourParam = searchParams.get("tour");
  const onboardingState = useOnboardingState(userId);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    if (tourParam === "1" || tourParam === "replay") {
      setTourActive(true);
      return;
    }
    if (onboardingState && shouldAutoStartTour(onboardingState)) {
      setTourActive(true);
    }
  }, [tourParam, onboardingState]);

  if (!tourActive && tourParam !== "1" && tourParam !== "replay") {
    if (!onboardingState || !shouldAutoStartTour(onboardingState)) return null;
  }

  const showWidgets = tourActive;

  return (
    <>
      {showWidgets && (
        <>
          <ActiveSignalsCard count={signalCount || 1402} />
          <SignalLegendCard />
          <TourImpactZoneMarker />
        </>
      )}
      <MapProductTour
        userId={userId}
        active={tourActive}
        onComplete={() => {
          setTourActive(false);
          notifyOnboardingChange();
        }}
      />
    </>
  );
}

export function MapTourHost(props: MapTourHostProps) {
  return (
    <Suspense fallback={null}>
      <MapTourHostInner {...props} />
    </Suspense>
  );
}
