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
export const scenarios = [
  {
    name: "Best Case",
    sub: "Rapid containment scenario",
    likelihood: "25% likely",
    likelihoodBg: "#D1FAE5",
    likelihoodColor: "#059669",
    description:
      "Early intervention with full WASH coverage achieves containment within 2 weeks. Estimated affected: 2,400 people.",
    highlighted: false,
  },
  {
    name: "Most Likely",
    sub: "Moderate spread scenario",
    likelihood: "55% likely",
    likelihoodBg: "#DBEAFE",
    likelihoodColor: "#2563EB",
    description:
      "Partial containment with ongoing transmission in 3 woredas. Peak in 3-4 weeks. Estimated affected: 8,500 people.",
    highlighted: true,
  },
  {
    name: "Worst Case",
    sub: "Regional spread scenario",
    likelihood: "20% likely",
    likelihoodBg: "#FEE2E2",
    likelihoodColor: "#DC2626",
    description:
      "Widespread transmission across 8+ woredas with health system strain. Estimated affected: 24,000+ people.",
    highlighted: false,
  },
];

/* ========== AI Insights ========== */
export const insights = [
  {
    type: "Critical Pattern",
    typeColor: "#DC2626",
    icon: IconAlertTriangle,
    title: "Water Source Clustering",
    description:
      "87% of cases within 500m of 3 water points. Immediate testing and treatment recommended.",
    borderColor: "#DC2626",
  },
  {
    type: "Time Sensitive",
    typeColor: "#F59E0B",
    icon: IconClock,
    title: "Peak Timing Prediction",
    description:
      "Historical patterns suggest peak transmission 14-21 days from outbreak start. Current: Day 8.",
    borderColor: "#F59E0B",
  },
  {
    type: "Opportunity",
    typeColor: "#059669",
    icon: IconCircleCheck,
    title: "Resource Optimization",
    description:
      "ORS supplies in Dire Dawa can reach affected areas within 6 hours. Pre-positioning available.",
    borderColor: "#059669",
  },
];

/* ========== Data Quality ========== */
export const dataQuality = [
  {
    source: "MOH PHEM Data",
    completeness: 94,
    timeliness: "Real-time",
    timelinessColor: "#059669",
    confidence: "High",
    confidenceColor: "#059669",
    lastUpdate: "3 min ago",
  },
  {
    source: "WHO EWARN",
    completeness: 88,
    timeliness: "Hourly",
    timelinessColor: "#059669",
    confidence: "High",
    confidenceColor: "#059669",
    lastUpdate: "1h ago",
  },
  {
    source: "Field Reports",
    completeness: 76,
    timeliness: "Daily",
    timelinessColor: "#D97706",
    confidence: "Medium",
    confidenceColor: "#D97706",
    lastUpdate: "4h ago",
  },
  {
    source: "Satellite Imagery",
    completeness: 92,
    timeliness: "6h cycle",
    timelinessColor: "#059669",
    confidence: "High",
    confidenceColor: "#059669",
    lastUpdate: "2h ago",
  },
];

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
export const impactAssessment = [
  {
    sector: "Shelter",
    icon: IconHome,
    severity: "critical" as const,
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    number: 12500,
    unit: "people",
    description:
      "45% of shelters damaged or destroyed in flood-affected areas",
  },
  {
    sector: "WASH",
    icon: IconDroplet,
    severity: "critical" as const,
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    number: 45000,
    unit: "people",
    description:
      "3 water treatment facilities non-functional, contamination detected",
  },
  {
    sector: "Protection",
    icon: IconShield,
    severity: "high" as const,
    severityColor: "#F59E0B",
    severityBg: "#FEF3C7",
    number: 8200,
    unit: "people",
    description:
      "GBV risks elevated, child protection concerns in displacement sites",
  },
  {
    sector: "Health",
    icon: IconHeart,
    severity: "critical" as const,
    severityColor: "#DC2626",
    severityBg: "#FEE2E2",
    number: 847,
    unit: "cases",
    description:
      "Cholera outbreak with Case Fatality Rate of 2.1%, above emergency threshold",
  },
  {
    sector: "Food Security",
    icon: IconToolsKitchen2,
    severity: "high" as const,
    severityColor: "#F59E0B",
    severityBg: "#FEF3C7",
    number: 32000,
    unit: "people",
    description:
      "IPC Phase 3+ food insecurity in 5 woredas, market disruption ongoing",
  },
];

/* ========== Environmental Factors ========== */
export const environmentalFactors = {
  floodRisk:
    "GloFAS indicates 75% probability of above-normal river levels in next 14 days",
  rainfallForecast:
    "150-200mm expected in Somali Region over next week, 40% above seasonal average",
  secondaryRisk:
    "Waterborne disease outbreak risk HIGH due to flood contamination of water sources",
};

/* ========== Protection Concerns ========== */
export const protectionConcerns = [
  "Increased GBV risks in overcrowded displacement sites, particularly for women and girls",
  "Separated and unaccompanied children identified in 3 displacement sites",
  "Barriers to accessing services for persons with disabilities in temporary shelters",
  "Documentation loss affecting access to basic services for displaced populations",
];

/* ========== Secondary Effects ========== */
export const secondaryEffects = [
  "Market disruption causing 28% food price increase in affected areas",
  "School closures affecting 15,000 children across 23 schools",
  "Livestock losses estimated at $2.3M impacting pastoral livelihoods",
  "Transport route disruptions delaying humanitarian supply chains by 48-72 hours",
  "Mental health impacts reported in 60% of displaced households",
  "Agricultural season disruption threatening next harvest in 4 woredas",
];
