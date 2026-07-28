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
    const next = {
      x: elRect.left - rootRect.left + root.scrollLeft,
      y: elRect.top - rootRect.top + root.scrollTop,
      width: elRect.width,
      height: elRect.height,
      ready: placedRef.current,
    };

    setBox(next);

    // First successful place: snap without transition, then enable sliding.
    if (!placedRef.current) {
      placedRef.current = true;
      requestAnimationFrame(() => {
        setBox((prev) => ({ ...prev, ready: true }));
      });
    }
  }, [activeKey, containerRef]);

  useLayoutEffect(() => {
    measure();
  }, [measure, layoutKey]);

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
