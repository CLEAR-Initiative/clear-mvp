/**
 * Product Tour usage events. Only fixed values: the trigger, whether this
 * device had finished the tour before, and step ids. Never step copy.
 */

import { track } from "~/lib/analytics/track";
import { PRODUCT_TOUR_STEPS } from "./product-tour-steps";

export type TourTrigger = "auto" | "replay";
export type TourOutcome = "finished" | "skipped";

export function trackTourStarted(trigger: TourTrigger, firstOnDevice: boolean): void {
  track("tour.started", { trigger, first_on_device: firstOnDevice ? "true" : "false" });
}

export function trackTourStepViewed(stepIndex: number): void {
  const step = PRODUCT_TOUR_STEPS[stepIndex];
  if (step) track("tour.step_viewed", { step: step.id });
}

export function trackTourEnded(outcome: TourOutcome, stepIndex: number): void {
  if (outcome === "finished") {
    track("tour.finished");
    return;
  }
  const step = PRODUCT_TOUR_STEPS[stepIndex];
  if (step) track("tour.skipped", { step: step.id });
}
