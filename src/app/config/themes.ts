import { createTheme } from "@mantine/core";

/**
 * Mantine theme matching the CLEAR prototype design system.
 * Uses Inter font, sharp corners, and the prototype color palette.
 */
export const clearTheme = createTheme({
  fontFamily:
    "var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
  colors: {
    // CLEAR accent orange — Situation Analysis design system.
    // Shade 5 = #ff5722 (dark primary), shade 6 = #e0500f (light primary).
    accent: [
      "#fff1ec",
      "#ffe0d6",
      "#ffc2ad",
      "#ffa07f",
      "#ff7e52",
      "#ff5722",
      "#e0500f",
      "#c0440c",
      "#9c360a",
      "#782807",
    ],
    // Neutral grays matching prototype
    neutral: [
      "#FAFAFA",
      "#F5F5F5",
      "#E5E5E5",
      "#D4D4D4",
      "#A3A3A3",
      "#737373",
      "#525252",
      "#404040",
      "#262626",
      "#171717",
    ],
    // Status: critical red
    critical: [
      "#FEE2E2",
      "#FECACA",
      "#FCA5A5",
      "#F87171",
      "#EF4444",
      "#DC2626",
      "#B91C1C",
      "#991B1B",
      "#7F1D1D",
      "#450A0A",
    ],
    // Status: warning amber
    warning: [
      "#FEF3C7",
      "#FDE68A",
      "#FCD34D",
      "#FBBF24",
      "#F59E0B",
      "#D97706",
      "#B45309",
      "#92400E",
      "#78350F",
      "#451A03",
    ],
    // Status: success green
    success: [
      "#D1FAE5",
      "#A7F3D0",
      "#6EE7B7",
      "#34D399",
      "#10B981",
      "#059669",
      "#047857",
      "#065F46",
      "#064E3B",
      "#022C22",
    ],
    // Status: info blue
    info: [
      "#DBEAFE",
      "#BFDBFE",
      "#93C5FD",
      "#60A5FA",
      "#3B82F6",
      "#2563EB",
      "#1D4ED8",
      "#1E40AF",
      "#1E3A8A",
      "#172554",
    ],
  },
  primaryColor: "accent",
  // Light theme uses the deeper #e0500f, dark uses #ff5722 — matches the spec tokens.
  primaryShade: { light: 6, dark: 5 },
  // Rounded corners matching the Situation Analysis design system.
  defaultRadius: 8,
  components: {
    Button: {
      defaultProps: {
        radius: 8,
      },
    },
    Card: {
      defaultProps: {
        radius: 14,
        padding: "md",
      },
    },
    Paper: {
      defaultProps: {
        radius: 14,
      },
    },
    Badge: {
      defaultProps: {
        radius: 6,
      },
    },
    TextInput: {
      defaultProps: {
        radius: 8,
      },
    },
    Select: {
      defaultProps: {
        radius: 8,
      },
    },
    Textarea: {
      defaultProps: {
        radius: 8,
      },
    },
    Modal: {
      defaultProps: {
        radius: 14,
      },
    },
  },
});
