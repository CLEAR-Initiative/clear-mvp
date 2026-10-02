"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export interface SlidingNavBox {
  x: number;
  y: number;
  width: number;
  height: number;
  ready: boolean;
}

const EMPTY: SlidingNavBox = { x: 0, y: 0, width: 0, height: 0, ready: false };

/** Match nav-sidebar width transition — indicator must not lag behind it. */
const LAYOUT_SETTLE_MS = 220;

/**
 * Measures the active `[data-nav-segment]` child inside a nav container so a
 * CSS-transformed indicator can slide between items.
 */
export function useSlidingNavIndicator(
  containerRef: RefObject<HTMLElement | null>,
  activeKey: string | null | undefined,
  /** Extra deps that change layout (e.g. collapsed sidebar). */
  layoutKey?: string | number | boolean,
): SlidingNavBox {
  const [box, setBox] = useState<SlidingNavBox>(EMPTY);
  const placedRef = useRef(false);
  /** While sidebar width animates, snap (no CSS transition) so we track live boxes. */
  const layoutSnapRef = useRef(false);
  const layoutEpochRef = useRef(0);

  const measure = useCallback(() => {
    const root = containerRef.current;
    if (!root || !activeKey) {
      placedRef.current = false;
      setBox(EMPTY);
      return;
    }

    const el = root.querySelector(
      `[data-nav-segment="${CSS.escape(activeKey)}"]`,
    );
    if (!(el instanceof HTMLElement)) {
      placedRef.current = false;
      setBox(EMPTY);
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const allowSlide = placedRef.current && !layoutSnapRef.current;
    const next = {
      x: elRect.left - rootRect.left + root.scrollLeft,
      y: elRect.top - rootRect.top + root.scrollTop,
      width: elRect.width,
      height: elRect.height,
      ready: allowSlide,
    };

    setBox(next);

    // First successful place (not during collapse/expand): snap, then enable sliding.
    if (!placedRef.current && !layoutSnapRef.current) {
      placedRef.current = true;
      requestAnimationFrame(() => {
        if (layoutSnapRef.current) return;
        setBox((prev) => ({ ...prev, ready: true }));
      });
    }
  }, [activeKey, containerRef]);

  const measureRef = useRef(measure);
  measureRef.current = measure;

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Collapse/expand: disable indicator CSS transitions and track ResizeObserver
  // boxes live until the sidebar width transition settles — otherwise the pill
  // restarts a 200ms ease toward every intermediate width (staggered lag).
  useLayoutEffect(() => {
    layoutEpochRef.current += 1;
    const epoch = layoutEpochRef.current;
    layoutSnapRef.current = true;
    placedRef.current = false;
    measureRef.current();

    const finish = () => {
      if (layoutEpochRef.current !== epoch) return;
      layoutSnapRef.current = false;
      placedRef.current = true;
      measureRef.current();
    };

    const root = containerRef.current;
    const aside = root?.closest("aside") ?? root?.parentElement;
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== aside) return;
      if (e.propertyName !== "width" && e.propertyName !== "min-width") return;
      aside?.removeEventListener("transitionend", onEnd);
      finish();
    };
    aside?.addEventListener("transitionend", onEnd);
    const timer = window.setTimeout(finish, LAYOUT_SETTLE_MS);

    return () => {
      window.clearTimeout(timer);
      aside?.removeEventListener("transitionend", onEnd);
    };
  }, [layoutKey, containerRef]);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onScrollOrResize = () => measure();
    root.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    const ro = new ResizeObserver(onScrollOrResize);
    ro.observe(root);

    return () => {
      root.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      ro.disconnect();
    };
  }, [containerRef, measure]);

  return box;
}
