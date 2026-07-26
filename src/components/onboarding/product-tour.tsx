"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { TourCard } from "~/components/onboarding/tour-card";
import { requestTourMapDemo, stopTourMapDemo } from "~/lib/onboarding/tour-map-demo";
import { PRODUCT_TOUR_STEPS } from "~/lib/onboarding/product-tour-steps";
import { resolveTourTarget } from "~/lib/onboarding/resolve-tour-target";
import { markTourComplete } from "~/lib/onboarding/storage";
import type { ProductTourStep, TourCompleteOptions } from "~/lib/onboarding/types";

interface ProductTourProps {
  userId: string;
  active: boolean;
  onComplete: (options?: TourCompleteOptions) => void;
}

const CARD_WIDTH = 340;
const CARD_HEIGHT = 280;
const GAP = 16;
/** Step 4 sits a bit further left than the Layers (step 3) card. */
const STEP4_LEFT_NUDGE = 28;

function isTourSurface(pathname: string): boolean {
  return pathname.startsWith("/map") || pathname.startsWith("/detection");
}

function tourHref(step: ProductTourStep): string {
  const params = new URLSearchParams({ tour: "1" });
  if (step.tab) params.set("tab", step.tab);
  return `${step.route}?${params.toString()}`;
}

function needsNavigation(
  step: ProductTourStep,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (!pathname.startsWith(step.route)) return true;
  if (step.tab && searchParams.get("tab") !== step.tab) return true;
  return false;
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

async function closeMapLayersIfOpen(): Promise<void> {
  if (!resolveTourTarget('[data-tour="map-layers-panel"]')) return;
  const toggle = resolveTourTarget('[data-tour="map-layers"]');
  if (toggle instanceof HTMLElement) {
    toggle.click();
    const start = Date.now();
    while (Date.now() - start < 1500) {
      if (!resolveTourTarget('[data-tour="map-layers-panel"]')) break;
      await new Promise((r) => setTimeout(r, 40));
    }
  }
}

/** Wait two frames so tab/panel DOM has painted before measuring. */
function waitForPaint(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function prepareStep(step: ProductTourStep): Promise<void> {
  if (step.prepare === "open-map-layers") {
    if (resolveTourTarget('[data-tour="map-layers-panel"]')) return;
    const toggle = resolveTourTarget('[data-tour="map-layers"]');
    if (toggle instanceof HTMLElement) {
      toggle.click();
      await waitForTarget('[data-tour="map-layers-panel"]');
      await waitForPaint();
    }
    return;
  }

  if (step.prepare === "demo-map-explore") {
    await closeMapLayersIfOpen();
    // Always restart the demo (4→3→4 must re-zoom + re-open detail).
    stopTourMapDemo();
    await waitForPaint();
    requestTourMapDemo();
    await waitForTarget('[data-tour="map-marker-detail"]', 5000);
    await waitForPaint();
  }
}

function computeCardPos(
  selector: string,
  side: ProductTourStep["side"] = "bottom",
  options?: { lockLeft?: number },
): { top: number; left: number } {
  const maxLeft = window.innerWidth - CARD_WIDTH - GAP;
  const maxTop = window.innerHeight - CARD_HEIGHT - GAP;
  const lockLeft = options?.lockLeft;

  if (side === "bottom-left") {
    return {
      top: Math.max(GAP, maxTop),
      left: lockLeft ?? GAP,
    };
  }
  if (side === "top-right") {
    return {
      top: Math.max(GAP, 72),
      left: Math.max(GAP, window.innerWidth - CARD_WIDTH - GAP),
    };
  }

  const el = resolveTourTarget(selector);
  if (!el) {
    // Optimistic fallback while the spotlight target is still mounting.
    if (side === "right") {
      return {
        top: 96,
        left: lockLeft ?? Math.min(300, maxLeft),
      };
    }
    if (side === "bottom") {
      return { top: Math.min(160, maxTop), left: lockLeft ?? GAP };
    }
    return {
      top: window.innerHeight / 2 - CARD_HEIGHT / 2,
      left: lockLeft ?? window.innerWidth / 2 - CARD_WIDTH / 2,
    };
  }

  const rect = el.getBoundingClientRect();

  let top: number;
  let left: number;

  switch (side) {
    case "right": {
      // Step 2 → 3: keep the same column, only slide vertically to the Layers panel.
      if (lockLeft != null) {
        left = lockLeft;
        top = rect.top;
        break;
      }
      left = rect.right + GAP;
      top = rect.top;
      if (left > maxLeft) {
        left = Math.min(rect.left, maxLeft);
        top = rect.bottom + GAP;
      }
      break;
    }
    case "left": {
      left = rect.left - CARD_WIDTH - GAP;
      top = rect.top;
      if (left < GAP) {
        left = Math.min(rect.right + GAP, maxLeft);
        top = rect.top;
      }
      break;
    }
    case "top": {
      left = Math.min(rect.left, maxLeft);
      top = rect.top - CARD_HEIGHT - GAP;
      if (top < GAP) top = rect.bottom + GAP;
      break;
    }
    case "over": {
      left = window.innerWidth / 2 - CARD_WIDTH / 2;
      top = window.innerHeight / 2 - CARD_HEIGHT / 2;
      break;
    }
    case "bottom":
    default: {
      left = Math.min(rect.left, maxLeft);
      top = rect.bottom + GAP;
      if (top > maxTop) top = Math.max(GAP, rect.top - CARD_HEIGHT - GAP);
      break;
    }
  }

  return {
    top: Math.max(GAP, Math.min(top, maxTop)),
    left: Math.max(GAP, Math.min(lockLeft ?? left, maxLeft)),
  };
}

export function ProductTour({ userId, active, onComplete }: ProductTourProps) {
  const t = useTranslations("onboarding.tour");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const driverRef = useRef<Driver | null>(null);
  const finishingRef = useRef(false);
  const cardPosRef = useRef<{ top: number; left: number } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  /** True while spotlight target / map demo is still catching up. */
  const [scenePending, setScenePending] = useState(false);

  const placeCard = useCallback((step: ProductTourStep) => {
    const prev = cardPosRef.current;

    // Step 4: same band as Layers, a bit further left; keep step 3's top.
    if (step.id === "mapCanvas" && prev) {
      const next = {
        top: prev.top,
        left: Math.max(GAP, prev.left - STEP4_LEFT_NUDGE),
      };
      cardPosRef.current = next;
      setCardPos(next);
      return;
    }

    // Detection Events → Map Layers: vertical motion only (keep the same left).
    const lockLeft =
      step.id === "mapLayers" ? prev?.left : undefined;
    const next = computeCardPos(step.target, step.side, { lockLeft });
    cardPosRef.current = next;
    setCardPos(next);
  }, []);

  const finish = useCallback(
    (options?: TourCompleteOptions) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      driverRef.current?.destroy();
      driverRef.current = null;
      setCardPos(null);
      cardPosRef.current = null;
      markTourComplete(userId);
      onComplete(options);
    },
    [userId, onComplete],
  );

  // User left the tour via an in-app link (e.g. View details) — end without yanking them back.
  useEffect(() => {
    if (!active || finishingRef.current) return;
    if (isTourSurface(pathname)) return;
    finish({ landOnMap: false });
  }, [active, pathname, finish]);

  // Drive current step: show the card immediately, then refine against the page.
  useEffect(() => {
    if (!active || finishingRef.current) return;
    let cancelled = false;
    const step = PRODUCT_TOUR_STEPS[stepIndex];
    if (!step) return;

    // Optimistic mount — card first, scene second.
    placeCard(step);
    setScenePending(true);

    if (!isTourSurface(pathname)) {
      return;
    }

    if (needsNavigation(step, pathname, searchParams)) {
      router.push(tourHref(step));
      return;
    }

    void (async () => {
      await prepareStep(step);
      if (cancelled || finishingRef.current) return;

      if (step.prepare === "demo-map-explore") {
        driverRef.current?.destroy();
        driverRef.current = null;
        await waitForTarget('[data-tour="map-marker-detail"]', 5000);
        await waitForPaint();
        if (cancelled || finishingRef.current) return;
        placeCard(step);
        setScenePending(false);
        return;
      }

      await waitForTarget(step.target);
      if (cancelled || finishingRef.current) return;
      await waitForPaint();
      if (cancelled || finishingRef.current) return;

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
          disableActiveInteraction: false,
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
      await waitForPaint();
      if (cancelled || finishingRef.current) return;
      placeCard(step);
      setScenePending(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [active, stepIndex, pathname, searchParams, router, placeCard]);

  useEffect(() => {
    if (active) {
      finishingRef.current = false;
      return;
    }
    driverRef.current?.destroy();
    driverRef.current = null;
    setCardPos(null);
    cardPosRef.current = null;
    setStepIndex(0);
    setScenePending(false);
  }, [active]);

  useEffect(() => {
    if (!active || !cardPos) return;
    const step = PRODUCT_TOUR_STEPS[stepIndex];
    if (!step) return;
    const onResize = () => placeCard(step);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [stepIndex, active, cardPos, placeCard]);

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
        transition: "top 160ms ease, left 160ms ease",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <TourCard
        title={t(`steps.${step.id}.title` as "steps.detectionAlerts.title")}
        body={t(`steps.${step.id}.body` as "steps.detectionAlerts.body")}
        stepIndex={stepIndex}
        totalSteps={PRODUCT_TOUR_STEPS.length}
        showBack={step.showBack}
        primaryLabel={primaryLabel}
        primaryDark={step.primaryAction === "finish"}
        skipLabel={isLast ? t("exitTour") : t("skipTour")}
        scenePending={scenePending}
        onBack={() => {
          // Step 4 → 3: dismiss the demo marker detail so Layers is unobstructed.
          if (step.id === "mapCanvas") {
            stopTourMapDemo();
          }
          setStepIndex((i) => Math.max(0, i - 1));
        }}
        onPrimary={() => {
          if (step.primaryAction === "finish") {
            finish({ landOnMap: true });
            return;
          }
          setStepIndex((i) => Math.min(PRODUCT_TOUR_STEPS.length - 1, i + 1));
        }}
        onSkip={() => finish({ landOnMap: true })}
      />
    </div>
  );

  return createPortal(card, document.body);
}
