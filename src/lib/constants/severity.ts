export const severityColors: Record<string, { bg: string; text: string }> = {
  critical: { bg: "var(--color-critical-light)", text: "var(--color-critical)" },
  high:     { bg: "var(--color-warning-light)",  text: "var(--color-warning)" },
  medium:   { bg: "var(--color-warning-light)",  text: "var(--color-warning)" },
  low:      { bg: "var(--color-success-light)",  text: "var(--color-success)" },
  unknown:  { bg: "var(--color-bg-muted)",        text: "var(--color-text-muted)" },
};

export const severityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown",
};

export const severityDotColors: Record<string, string> = {
  critical: "bg-[#DC2626]",
  high: "bg-[#D97706]",
  medium: "bg-[#D97706]",
  low: "bg-[#059669]",
  unknown: "bg-[#A3A3A3]",
};
