"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductTour } from "~/components/onboarding/product-tour";
import { notifyOnboardingChange, useOnboardingState } from "~/hooks/use-onboarding-state";
import { shouldAutoStartTour } from "~/lib/onboarding/resolve-redirect";
import { api } from "~/trpc/react";

function ProductTourHostInner() {
  const searchParams = useSearchParams();
  const tourParam = searchParams.get("tour");
  const authQuery = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const userId = authQuery.data?.user?.id;
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

  if (!userId) return null;
  if (!tourActive && tourParam !== "1" && tourParam !== "replay") {
    if (!onboardingState || !shouldAutoStartTour(onboardingState)) return null;
  }

  return (
    <ProductTour
      userId={userId}
      active={tourActive}
      onComplete={() => {
        setTourActive(false);
        notifyOnboardingChange();
      }}
    />
  );
}

export function ProductTourHost() {
  return (
    <Suspense fallback={null}>
      <ProductTourHostInner />
    </Suspense>
  );
}
