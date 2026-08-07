"use client";

import { useSyncExternalStore } from "react";
import type { OnboardingTimestamps } from "~/lib/onboarding/types";
import { readOnboardingState } from "~/lib/onboarding/storage";

const STORAGE_PREFIX = "clear-onboarding";

/** useSyncExternalStore requires a stable snapshot reference between reads. */
const snapshotCache = new Map<
  string,
  { serialized: string; value: OnboardingTimestamps }
>();

function getOnboardingSnapshot(userId: string): OnboardingTimestamps {
  const storageKey = `${STORAGE_PREFIX}:${userId}`;
  const serialized =
    typeof window !== "undefined" ? localStorage.getItem(storageKey) ?? "" : "";
  const cached = snapshotCache.get(userId);
  if (cached && cached.serialized === serialized) {
    return cached.value;
  }
  const value = readOnboardingState(userId);
  snapshotCache.set(userId, { serialized, value });
  return value;
}

function subscribe(userId: string, cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key?.includes(userId)) cb();
  };
  window.addEventListener("storage", handler);
  window.addEventListener("clear-onboarding-change", cb);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("clear-onboarding-change", cb);
  };
}

export function notifyOnboardingChange() {
  snapshotCache.clear();
  window.dispatchEvent(new Event("clear-onboarding-change"));
}

export function useOnboardingState(userId: string | undefined): OnboardingTimestamps | null {
  return useSyncExternalStore(
    (cb) => (userId ? subscribe(userId, cb) : () => undefined),
    () => (userId ? getOnboardingSnapshot(userId) : null),
    () => null,
  );
}
