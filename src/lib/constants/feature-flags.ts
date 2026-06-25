/**
 * Feature flag registry - nav items only.
 *
 * Tier 1 = Core (always on, non-toggleable)
 * Tier 2 = High priority
 * Tier 3 = Medium priority
 * Tier 4 = Lower priority
 */

export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  tier: 1 | 2 | 3 | 4;
  defaultEnabled: boolean;
  route?: string;
}

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  // Tier 1 - Core (always on)
  {
    key: "overview",
    label: "Overview",
    description: "Main dashboard with crisis stats and alerts",
    tier: 1,
    defaultEnabled: true,
    route: "/dashboard",
  },

  // Tier 2 - High Priority
  {
    key: "detection",
    label: "Detection",
    description: "Live alerts, data sources, alert rules, and history",
    tier: 2,
    defaultEnabled: true,
    route: "/detection",
  },
  {
    key: "crisis_map",
    label: "Crisis Map",
    description: "Interactive map with crisis markers and data layers",
    tier: 2,
    defaultEnabled: true,
    route: "/map",
  },

  // Tier 3 - Medium Priority
  {
    key: "insights",
    label: "Insights",
    description: "Situation reports, scenario planning, and impact assessment",
    tier: 3,
    defaultEnabled: true,
    route: "/insights",
  },
  {
    key: "operations",
    label: "Operations",
    description:
      "Active operations, response strategy, and resource coordination",
    tier: 3,
    defaultEnabled: true,
    route: "/operations",
  },
  {
    key: "cash_assistance",
    label: "Cash Assistance",
    description: "Cash mapping, assessment, and distribution management",
    tier: 3,
    defaultEnabled: true,
    route: "/cash",
  },

  // Tier 4 - Lower Priority
  {
    key: "knowledge_hub",
    label: "Knowledge Hub",
    description: "Document library, contacts panel, and HumChat",
    tier: 4,
    defaultEnabled: true,
    route: "/knowledge",
  },
  {
    key: "agent",
    label: "Agent",
    description: "NRC Find agent",
    tier: 4,
    defaultEnabled: true,
    route: "/agent",
  },
];

export const TIER_LABELS: Record<number, string> = {
  1: "Core",
  2: "High Priority",
  3: "Medium Priority",
  4: "Lower Priority",
};

/** Build default flags map from the registry */
export function getDefaultFlags(): Record<string, boolean> {
  return Object.fromEntries(
    FEATURE_FLAGS.map((f) => [f.key, f.defaultEnabled]),
  );
}
