"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { Box } from "@mantine/core";
import { MapOptimisticShell } from "~/app/(app)/map/_components/map-loading-overlay";
import { DetectionPageSkeleton } from "~/components/ui/detection-page-skeleton";
import { InsightsPageSkeleton } from "~/components/ui/insights-page-skeleton";
import { OperationsPageSkeleton } from "~/components/ui/operations-page-skeleton";
import { SkeletonBone, SkeletonPulseStyles } from "~/components/ui/skeleton-bone";
import {
  firstSegment,
  resolvePageTransitionIntent,
} from "~/components/page-transition-intent";
import styles from "./page-transition.module.css";

interface PageTransitionState {
  active: boolean;
  pendingSegment: string | null;
  beginPageTransition: (href: string) => void;
}

const PageTransitionContext = createContext<PageTransitionState | null>(null);

/** Keep optimistic chrome visible long enough to read on fast routes (Insights). */
const MIN_VISIBLE_MS = 220;
const HANDOFF_MS = 40;
const SAFETY_MS = 1600;

function GenericPageSkeleton() {
  return (
    <Box style={{ minHeight: "100%" }}>
      <SkeletonPulseStyles />
      <Box
        px={24}
        py={12}
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-white)",
        }}
      >
        <SkeletonBone width={140} height={22} />
      </Box>
      <Box p={24}>
        <SkeletonBone width="100%" height={180} style={{ marginBottom: 16 }} />
        <SkeletonBone width="90%" height={14} style={{ marginBottom: 10 }} />
        <SkeletonBone width="70%" height={14} />
      </Box>
    </Box>
  );
}

function OptimisticDestination({ segment }: { segment: string }) {
  switch (segment) {
    case "detection":
      return <DetectionPageSkeleton />;
    case "insights":
      return <InsightsPageSkeleton />;
    case "operations":
      return <OperationsPageSkeleton />;
    case "map":
      return <MapOptimisticShell />;
    default:
      return <GenericPageSkeleton />;
  }
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [pendingSegment, setPendingSegment] = useState<string | null>(null);
  const pendingSegmentRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    clearTimerRef.current = null;
    safetyTimerRef.current = null;
  }, []);

  const endTransition = useCallback(() => {
    clearTimers();
    pendingSegmentRef.current = null;
    setPendingSegment(null);
    setActive(false);
  }, [clearTimers]);

  const beginPageTransition = useCallback(
    (href: string) => {
      const path = href.split("?")[0] ?? href;
      const nextSeg = firstSegment(path);
      const currentSeg = firstSegment(pathname);
      const intent = resolvePageTransitionIntent(
        nextSeg,
        currentSeg,
        pendingSegmentRef.current != null,
      );

      if (intent === "noop") return;
      if (intent === "abort") {
        endTransition();
        return;
      }

      clearTimers();
      pendingSegmentRef.current = nextSeg;
      startedAtRef.current = Date.now();

      // Paint optimistic chrome before Next.js continues the Link navigation.
      flushSync(() => {
        setPendingSegment(nextSeg);
        setActive(true);
      });

      safetyTimerRef.current = setTimeout(endTransition, SAFETY_MS);
    },
    [pathname, clearTimers, endTransition],
  );

  useEffect(() => {
    const pending = pendingSegmentRef.current;
    if (!pending || !active) return;
    if (firstSegment(pathname) !== pending) return;

    const elapsed = Date.now() - startedAtRef.current;
    const wait = Math.max(HANDOFF_MS, MIN_VISIBLE_MS - elapsed);
    clearTimerRef.current = setTimeout(endTransition, wait);
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [pathname, active, endTransition]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const value = useMemo(
    () => ({ active, pendingSegment, beginPageTransition }),
    [active, pendingSegment, beginPageTransition],
  );

  return (
    <PageTransitionContext.Provider value={value}>
      {children}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition(): PageTransitionState {
  const ctx = useContext(PageTransitionContext);
  if (!ctx) {
    return {
      active: false,
      pendingSegment: null,
      beginPageTransition: () => undefined,
    };
  }
  return ctx;
}

/**
 * Optimistic destination chrome — paints skeleton/map preload on click,
 * before the App Router remounts the real page under the shell.
 */
export function PageTransitionVeil() {
  const { active, pendingSegment } = usePageTransition();

  if (!active || !pendingSegment) return null;

  return (
    <div
      aria-hidden
      aria-busy="true"
      role="presentation"
      className={styles.optimistic}
    >
      <OptimisticDestination segment={pendingSegment} />
    </div>
  );
}
