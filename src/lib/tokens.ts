/**
 * Design token constants for CLEAR MVP.
 * Mirrors CSS custom properties in src/styles/globals.css.
 *
 * Phase 1: vocabulary defined here, no components migrated yet.
 * Phase 2: replace hardcoded values in components with these exports.
 *
 * Two exports per scale:
 *   - CSS var strings  → for style={{ fontSize: fontSizes.base }}
 *   - Raw px numbers   → for Mantine numeric props like style={{ fontSize: fontSizesPx.base }}
 */

export const colors = {
  bgPrimary:     "var(--color-bg-primary)",
  bgWhite:       "var(--color-bg-white)",
  bgMuted:       "var(--color-bg-muted)",
  border:        "var(--color-border)",
  borderDark:    "var(--color-border-dark)",
  textPrimary:   "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted:     "var(--color-text-muted)",
  accent:        "var(--color-accent)",
  accentLight:   "var(--color-accent-light)",
  accentHover:   "var(--color-accent-hover)",
  critical:      "var(--color-critical)",
  criticalLight: "var(--color-critical-light)",
  warning:       "var(--color-warning)",
  warningLight:  "var(--color-warning-light)",
  success:       "var(--color-success)",
  successLight:  "var(--color-success-light)",
  info:          "var(--color-info)",
  infoLight:     "var(--color-info-light)",
} as const;

export const fontSizes = {
  "2xs": "var(--fs-2xs)",
  xs:    "var(--fs-xs)",
  sm:    "var(--fs-sm)",
  md:    "var(--fs-md)",
  base:  "var(--fs-base)",
  lg:    "var(--fs-lg)",
  xl:    "var(--fs-xl)",
  "2xl": "var(--fs-2xl)",
  "3xl": "var(--fs-3xl)",
  "4xl": "var(--fs-4xl)",
} as const;

export const fontSizesPx = {
  "2xs": 9,
  xs:    10,
  sm:    11,
  md:    12,
  base:  13,
  lg:    14,
  xl:    16,
  "2xl": 20,
  "3xl": 24,
  "4xl": 28,
} as const;

export const spacing = {
  1: "var(--space-1)",
  2: "var(--space-2)",
  3: "var(--space-3)",
  4: "var(--space-4)",
  5: "var(--space-5)",
  6: "var(--space-6)",
  7: "var(--space-7)",
  8: "var(--space-8)",
  9: "var(--space-9)",
} as const;

export const spacingPx = {
  1: 4,
  2: 6,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  8: 32,
  9: 48,
} as const;

export const shadows = {
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
} as const;

export const layout = {
  sidebarWidth: "var(--spacing-sidebar)",
  panelWidth:   "var(--spacing-panel)",
} as const;

export const tokens = {
  colors,
  fontSizes,
  fontSizesPx,
  spacing,
  spacingPx,
  shadows,
  layout,
} as const;

export type Tokens = typeof tokens;
