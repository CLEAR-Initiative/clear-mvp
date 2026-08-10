import type { CSSProperties } from "react";

/**
 * Visual states for History filter chips.
 * Must read clearly in light and dark — not gray-on-gray luminance alone.
 *
 * - selected: chip is on (value is in the active set)
 * - off: chip is off (unselected)
 */
export type FilterChipVisual = "selected" | "off";

export function filterChipStyle(visual: FilterChipVisual): CSSProperties {
  switch (visual) {
    case "selected":
      return {
        background: "var(--color-accent)",
        border: "1px solid var(--color-accent)",
        color: "#fff",
        opacity: 1,
      };
    case "off":
      return {
        background: "transparent",
        border: "1px dashed var(--color-border-dark)",
        color: "var(--color-text-muted)",
        opacity: 0.65,
      };
  }
}

/**
 * Class/source/type opt-in chips: null = no constraint (nothing selected, show all).
 * An explicit Set narrows to those values — selected vs off.
 */
export function resolveInclusionChipVisual(
  activeSet: ReadonlySet<string> | null,
  value: string,
): FilterChipVisual {
  if (activeSet === null) return "off";
  return activeSet.has(value) ? "selected" : "off";
}

/**
 * Opt-in toggle for class/source/type filters.
 * null → first click selects only that value;
 * click again deselects; empty set collapses back to null (show all).
 * When `allValues` is provided and every value is selected, collapses to
 * null — selecting the full universe is equivalent to no constraint.
 */
export function toggleInclusionFilter<T extends string>(
  prev: ReadonlySet<T> | null,
  value: T,
  allValues?: readonly T[],
): Set<T> | null {
  const next = new Set<T>(prev ?? []);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  if (next.size === 0) return null;
  if (allValues && next.size === allValues.length) return null;
  return next;
}
