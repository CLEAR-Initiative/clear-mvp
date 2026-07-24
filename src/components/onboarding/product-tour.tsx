"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TourCard } from "~/components/onboarding/tour-card";
import { PRODUCT_TOUR_STEPS } from "~/lib/onboarding/product-tour-steps";
import { resolveTourTarget } from "~/lib/onboarding/resolve-tour-target";
import { markTourComplete } from "~/lib/onboarding/storage";

interface ProductTourProps {
  userId: string;
  active: boolean;
  onComplete: () => void;
}

async function waitForTarget(selector: string, timeoutMs = 4000): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = resolveTourTarget(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 50));
  }
  return resolveTourTarget(selector);
}

export function ProductTour({ userId, active, onComplete }: ProductTourProps) {
  const t = useTranslations("onboarding.tour");
  const router = useRouter();
  const pathname = usePathname();
  const driverRef = useRef<Driver | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);

  const finish = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
    markTourComplete(userId);
    onComplete();
    // Always land on Map when the tour ends (skip or finish).
    router.replace("/map");
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
    let left = Math.min(rect.left, window.innerWidth - cardWidth - 16);

    if (rect.bottom + cardHeight + 24 > window.innerHeight) {
      top = Math.max(16, rect.top - cardHeight - 16);
    }

    top = Math.max(16, Math.min(top, window.innerHeight - cardHeight - 16));
    left = Math.max(16, left);
    setCardPos({ top, left });
  }, []);

  // Drive current step whenever active / index / route catches up.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const step = PRODUCT_TOUR_STEPS[stepIndex];
    if (!step) return;

    if (!pathname.startsWith(step.route)) {
      router.push(`${step.route}?tour=1`);
      return;
    }

    void (async () => {
      await waitForTarget(step.target);
      if (cancelled) return;

      if (!driverRef.current) {
        driverRef.current = driver({
          animate: true,
          overlayColor: "#0c0c0f",
          overlayOpacity: 0.35,
          stagePadding: 10,
          stageRadius: 10,
          allowClose: false,
          showProgress: false,
          showButtons: [],
          steps: PRODUCT_TOUR_STEPS.map((s) => ({
            element: () => resolveTourTarget(s.target) ?? document.body,
            popover: { popoverClass: "clear-tour-hidden-popover" },
          })),
          onDestroyed: () => {
            driverRef.current = null;
          },
        });
      }

      driverRef.current.drive(stepIndex);
      requestAnimationFrame(() => positionCard(step.target));
    })();

    return () => {
      cancelled = true;
    };
  }, [active, stepIndex, pathname, router, positionCard]);

  useEffect(() => {
    if (active) return;
    driverRef.current?.destroy();
    driverRef.current = null;
    setCardPos(null);
    setStepIndex(0);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const step = PRODUCT_TOUR_STEPS[stepIndex];
    if (!step) return;
    const onResize = () => positionCard(step.target);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [stepIndex, active, positionCard]);

  if (!active || !cardPos) return null;

  const step = PRODUCT_TOUR_STEPS[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === PRODUCT_TOUR_STEPS.length - 1;
  const primaryLabel =
    step.primaryAction === "finish" ? t("finishTour") : t("next");

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
        title={t(`steps.${step.id}.title` as "steps.detectionTabs.title")}
        body={t(`steps.${step.id}.body` as "steps.detectionTabs.body")}
        stepIndex={stepIndex}
        totalSteps={PRODUCT_TOUR_STEPS.length}
        showBack={step.showBack}
        primaryLabel={primaryLabel}
        primaryDark={step.primaryAction === "finish"}
        skipLabel={isLast ? t("exitTour") : t("skipTour")}
        onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
        onPrimary={() => {
          if (step.primaryAction === "finish") {
            finish();
            return;
          }
          setStepIndex((i) => Math.min(PRODUCT_TOUR_STEPS.length - 1, i + 1));
        }}
        onSkip={finish}
      />
    </div>
  );

  return createPortal(card, document.body);
}
