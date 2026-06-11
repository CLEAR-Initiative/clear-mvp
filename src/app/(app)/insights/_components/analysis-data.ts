import {
  IconAlertTriangle,
  IconClock,
  IconCircleCheck,
  IconHome,
  IconDroplet,
  IconShield,
  IconHeart,
  IconToolsKitchen2,
} from "@tabler/icons-react";
import { countryConfig } from "~/lib/constants/country-config";

/* ========== Country / Region map (derived from countryConfig) ========== */
export const countryRegions: Record<string, string[]> = Object.fromEntries(
  Object.entries(countryConfig).map(([name, cfg]) => [name, cfg.regions]),
);

/* ========== Situation Reports ========== */
export const situationReports = [
  {
    title: "Armed Conflict Displacement Crisis",
    meta: "Khartoum North, Sudan",
    severity: "Critical",
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    markerColor: "#DC2626",
    description:
      "Armed clashes in Khartoum North driving secondary displacement from Omdurman reaching critical levels. Bridge crossing points intermittently closed, health facilities non-functional in affected areas.",
    types: ["pv", "ce"],
    eventCount: 4,
    needs: ["shelter", "health", "protection"],
  },
  {
    title: "Humanitarian Corridor Blockade - El Fasher",
    meta: "North Darfur, Sudan",
    severity: "High",
    severityColor: "#F59E0B",
    severityBg: "#FEF3C7",
    markerColor: "#F59E0B",
    description:
      "Blockade of humanitarian access routes preventing aid delivery to 280,000 affected civilians in North Darfur. Food insecurity approaching famine thresholds in isolated localities.",
    types: ["fa", "ce"],
    eventCount: 2,
    needs: ["food security", "wash"],
  },
  {
    title: "Flash Flood - White Nile State",
    meta: "White Nile, Sudan",
    severity: "Medium",
    severityColor: "#D97706",
    severityBg: "#FEF3C7",
    markerColor: "#D97706",
    description:
      "Flash flooding displacing rural communities along White Nile corridors. Water contamination risk elevated, agricultural damage reported across multiple localities.",
    types: ["fl"],
    eventCount: 1,
    needs: ["wash", "shelter"],
  },
];

/* ========== Scenarios ========== */
// key: i18n keys under analysis.data.scenarios.* - resolved via t() at render time.
export const scenarios = [
  {
    key: "bestCase",
    likelihood: "25% likely",
    likelihoodBg: "#D1FAE5",
    likelihoodColor: "#059669",
    highlighted: false,
  },
  {
    key: "mostLikely",
    likelihood: "55% likely",
    likelihoodBg: "#DBEAFE",
    likelihoodColor: "#2563EB",
    highlighted: true,
  },
  {
    key: "worstCase",
    likelihood: "20% likely",
    likelihoodBg: "#FEE2E2",
    likelihoodColor: "#DC2626",
    highlighted: false,
  },
] as const;

/* ========== AI Insights ========== */
// key: i18n keys under analysis.data.insights.* - resolved via t() at render time.
export const insights = [
  {
    key: "waterClustering",
    typeColor: "#DC2626",
    icon: IconAlertTriangle,
    borderColor: "#DC2626",
  },
  {
    key: "peakTiming",
    typeColor: "#F59E0B",
    icon: IconClock,
    borderColor: "#F59E0B",
  },
  {
    key: "resourceOptimization",
    typeColor: "#059669",
    icon: IconCircleCheck,
    borderColor: "#059669",
  },
] as const;

/* ========== Data Quality ========== */
// key: i18n keys under analysis.data.dataQuality.* - resolved via t() at render time.
export const dataQuality = [
  {
    key: "mohPhem",
    completeness: 94,
    timelinessColor: "#059669",
    confidenceColor: "#059669",
  },
  {
    key: "whoEwarn",
    completeness: 88,
    timelinessColor: "#059669",
    confidenceColor: "#059669",
  },
  {
    key: "fieldReports",
    completeness: 76,
    timelinessColor: "#D97706",
    confidenceColor: "#D97706",
  },
  {
    key: "satellite",
    completeness: 92,
    timelinessColor: "#059669",
    confidenceColor: "#059669",
  },
] as const;

/* ========== Current Situation ========== */
export const currentSituation = [
  "Active cholera outbreak in Jijiga and Kebridehar zones with 847 confirmed cases",
  "WASH infrastructure severely compromised in 3 woredas affecting 45,000 people",
  "Health facilities operating at 140% capacity in affected areas",
  "Displacement of 12,500 people due to combined flooding and disease outbreak",
  "Food insecurity affecting 68% of households in cholera-affected zones",
];

/* ========== Population Impact ========== */
export const populationImpact = {
  households: 8750,
  totalDisplaced: 12500,
  children: 4800,
  women: 3200,
  elderly: 1100,
  infrastructureStress: "Health facilities at 140% capacity in 3 woredas",
  hostCapacity:
    "Host communities absorbing displaced beyond sustainable limits",
};

/* ========== Impact Assessment ========== */
// key: i18n keys under analysis.data.impactAssessment.* - resolved via t() at render time.
export const impactAssessment = [
  {
    key: "shelter",
    icon: IconHome,
    severity: "critical" as const,
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    number: 12500,
  },
  {
    key: "wash",
    icon: IconDroplet,
    severity: "critical" as const,
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    number: 45000,
  },
  {
    key: "protection",
    icon: IconShield,
    severity: "high" as const,
    severityColor: "#F59E0B",
    severityBg: "#FEF3C7",
    number: 8200,
  },
  {
    key: "health",
    icon: IconHeart,
    severity: "critical" as const,
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    number: 847,
  },
  {
    key: "foodSecurity",
    icon: IconToolsKitchen2,
    severity: "high" as const,
    severityColor: "#F59E0B",
    severityBg: "#FEF3C7",
    number: 32000,
  },
] as const;

/* ========== Protection Concerns ========== */
// i18n keys under analysis.data.protectionConcerns.* - resolved via t() at render time.
export const protectionConcerns = [
  "gbv",
  "separatedChildren",
  "disabilities",
  "documentation",
] as const;

/* ========== Secondary Effects ========== */
// i18n keys under analysis.data.secondaryEffects.* - resolved via t() at render time.
export const secondaryEffects = [
  "market",
  "schools",
  "livestock",
  "transport",
  "mentalHealth",
  "agriculture",
] as const;
