"use client";

import type { CSSProperties } from "react";
import type { SlidingNavBox } from "~/hooks/use-sliding-nav-indicator";
import styles from "./sliding-nav-indicator.module.css";

type IndicatorVariant = "sidebar" | "bottom";

interface SlidingNavIndicatorProps {
  box: SlidingNavBox;
  variant?: IndicatorVariant;
}

/**
 * Absolutely positioned highlight that CSS-transitions between nav items.
 * Parent must be `position: relative`. Active items should not paint their own bg.
 */
export function SlidingNavIndicator({
  box,
  variant = "sidebar",
}: SlidingNavIndicatorProps) {
  const style: CSSProperties = {
    transform: `translate3d(${box.x}px, ${box.y}px, 0)`,
    width: box.width,
    height: box.height,
  };

  const variantClass = variant === "bottom" ? styles.bottom : styles.sidebar;

  return (
    <div
      aria-hidden
      className={`${styles.indicator} ${variantClass}`}
      data-ready={box.ready ? "true" : "false"}
      style={style}
    />
  );
}
