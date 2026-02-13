export const severityColors: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#FEE2E2", text: "#DC2626" },
  high: { bg: "#FEF3C7", text: "#D97706" },
  medium: { bg: "#FEF3C7", text: "#D97706" },
  low: { bg: "#ECFDF5", text: "#059669" },
};

export const severityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const severityDotColors: Record<string, string> = {
  critical: "bg-[#DC2626]",
  high: "bg-[#D97706]",
  medium: "bg-[#D97706]",
  low: "bg-[#059669]",
};
