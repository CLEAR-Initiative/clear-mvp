"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TourCard } from "~/components/onboarding/tour-card";
import { MAP_TOUR_STEPS } from "~/lib/onboarding/map-tour-steps";
import { resolveTourTarget } from "~/lib/onboarding/resolve-tour-target";
import { markTourComplete } from "~/lib/onboarding/storage";

interface MapProductTourProps {
  userId: string;
  active: boolean;
  onComplete: () => void;
}

export function MapProductTour({ userId, active, onComplete }: MapProductTourProps) {
  const t = useTranslations("onboarding.tour");
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);

  const finish = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
    markTourComplete(userId);
    onComplete();
    router.push("/dashboard");
  }, [userId, onComplete, router]);

  const finishRef = useRef(finish);
  finishRef.current = finish;

  const positionCard = useCallback((selector: string) => {
    const el = resolveTourTarget(selector);
    if (!el) {
      setCardPos({ top: window.innerHeight / 2 - 120, left: window.innerWidth / 2 - 170 });
      return;
    }
    const rect = el.getBoundingClientRect();
    const cardWidth = 340;
    const cardHeight = 280;
    let top = rect.bottom + 16;
    let left = rect.left;

    if (selector.includes("signal-legend")) {
      top = rect.top - cardHeight - 16;
      left = rect.left;
    } else if (selector.includes("impact-zone")) {
      top = rect.top + rect.height / 2 - cardHeight / 2;
      left = Math.max(16, rect.left - cardWidth - 24);
    } else if (selector.includes("map-filters")) {
      top = 96;
      left = 320;
    } else if (selector.includes("active-signals")) {
      top = rect.bottom + 16;
      left = rect.left;
    }

    top = Math.max(16, Math.min(top, window.innerHeight - cardHeight - 16));
    left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16));
    setCardPos({ top, left });
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      const step = MAP_TOUR_STEPS[index];
      if (!step) return;
      setStepIndex(index);
      driverRef.current?.drive(index);
      requestAnimationFrame(() => positionCard(step.target));
    },
    [positionCard],
  );

  useEffect(() => {
    if (!active) return;

    const steps = MAP_TOUR_STEPS.map((step) => ({
      // Resolve painted target so desktop/mobile twins don't spotlight a hidden node.
      element: () => resolveTourTarget(step.target) ?? document.body,
      popover: { popoverClass: "clear-tour-hidden-popover" },
    }));

    const instance = driver({
      animate: true,
      overlayColor: "#0c0c0f",
      overlayOpacity: 0.28,
      stagePadding: 12,
      stageRadius: 14,
      allowClose: false,
      showProgress: false,
      showButtons: [],
      steps,
      onDestroyed: () => {
        driverRef.current = null;
      },
    });

    driverRef.current = instance;
    setStepIndex(0);
    instance.drive(0);
    requestAnimationFrame(() => positionCard(MAP_TOUR_STEPS[0]!.target));

    const onResize = () => positionCard(MAP_TOUR_STEPS[stepIndex]?.target ?? "");
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      instance.destroy();
      driverRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const step = MAP_TOUR_STEPS[stepIndex];
    if (step) positionCard(step.target);
  }, [stepIndex, active, positionCard]);

  if (!active || !cardPos) return null;

  const step = MAP_TOUR_STEPS[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === MAP_TOUR_STEPS.length - 1;
  const primaryLabel =
    step.primaryAction === "finish"
      ? isLast
        ? t("finishTour")
        : t("finish")
      : t("next");

  const card = (
    <div
      className="clear-tour-card-root"
      style={{
        position: "fixed",
        top: cardPos.top,
        left: cardPos.left,
        zIndex: 1000000001,
        pointerEvents: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <TourCard
        title={t(`steps.${step.id}.title`)}
        body={t(step.bodyKey as "steps.signals.body")}
        stepIndex={stepIndex}
        totalSteps={MAP_TOUR_STEPS.length}
        showBack={step.showBack}
        primaryLabel={primaryLabel}
        primaryDark={step.primaryAction === "finish" && isLast}
        skipLabel={isLast ? t("exitTour") : t("skipTour")}
        onBack={() => goToStep(stepIndex - 1)}
        onPrimary={() => {
          if (step.primaryAction === "finish" && isLast) {
            finish();
          } else if (step.primaryAction === "finish") {
            finish();
          } else {
            goToStep(stepIndex + 1);
          }
        }}
        onSkip={finish}
      />
    </div>
  );

  return createPortal(
    <>
      <div
        className="clear-tour-backdrop"
        aria-hidden
        onClick={() => finishRef.current()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000000000,
          pointerEvents: "auto",
          cursor: "pointer",
        }}
      />
      {card}
    </>,
    document.body,
  );
}
