import { createTheme } from "@mantine/core";

/**
 * Mantine theme matching the CLEAR prototype design system.
 * Uses Inter font, sharp corners, and the prototype color palette.
 */
export const clearTheme = createTheme({
  fontFamily:
    "var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  colors: {
    // CLEAR accent orange
    accent: [
      "#FEF2F0",
      "#FDDDD8",
      "#FAB4AA",
      "#F68B7C",
      "#F26E5A",
      "#E85D3D",
      "#D44E30",
      "#B04028",
      "#8C3220",
      "#682418",
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
  primaryShade: 5,
  defaultRadius: 0, // Sharp corners matching prototype
  components: {
    Button: {
      defaultProps: {
        radius: 0,
      },
    },
    Card: {
      defaultProps: {
        radius: 0,
        padding: "md",
      },
    },
    Paper: {
      defaultProps: {
        radius: 0,
      },
    },
    Badge: {
      defaultProps: {
        radius: 0,
      },
    },
    TextInput: {
      defaultProps: {
        radius: 0,
      },
    },
    Select: {
      defaultProps: {
        radius: 0,
      },
    },
    Textarea: {
      defaultProps: {
        radius: 0,
      },
    },
    Modal: {
      defaultProps: {
        radius: 0,
      },
    },
  },
});
