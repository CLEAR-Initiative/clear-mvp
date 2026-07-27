import type { CSSProperties } from "react";
import type { SlidingNavBox } from "~/hooks/use-sliding-nav-indicator";

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

  return (
    <div
      aria-hidden
      className={`nav-sliding-indicator nav-sliding-indicator--${variant}`}
      data-ready={box.ready ? "true" : "false"}
      style={style}
    />
  );
}
