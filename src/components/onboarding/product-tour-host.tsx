"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductTour } from "~/components/onboarding/product-tour";
import { notifyOnboardingChange, useOnboardingState } from "~/hooks/use-onboarding-state";
import { shouldAutoStartTour } from "~/lib/onboarding/resolve-redirect";
import type { TourCompleteOptions } from "~/lib/onboarding/types";
import { api } from "~/trpc/react";

function ProductTourHostInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourParam = searchParams.get("tour");
  const authQuery = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const userId = authQuery.data?.user?.id;
  const onboardingState = useOnboardingState(userId);
  const [tourActive, setTourActive] = useState(false);
  /** Prevents `?tour=1` from re-opening the tour after Finish/Skip. */
  const closedRef = useRef(false);

  useEffect(() => {
    if (tourParam === "replay") {
      closedRef.current = false;
      setTourActive(true);
      return;
    }
    if (closedRef.current) return;
    if (tourParam === "1") {
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
  if (closedRef.current && !tourActive) return null;

  return (
    <ProductTour
      userId={userId}
      active={tourActive}
      onComplete={(options) => {
        closedRef.current = true;
        setTourActive(false);
        notifyOnboardingChange();
        if (options?.landOnMap !== false) {
          router.replace("/map");
        }
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
