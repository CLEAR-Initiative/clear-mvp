/**
 * Feature flag registry — single source of truth.
 *
 * Tier 1 = Core (always on, non-toggleable)
 * Tier 2 = High priority (likely to keep on)
 * Tier 3 = Medium priority
 * Tier 4 = Lower priority (most likely to toggle off)
 */

export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  tier: 1 | 2 | 3 | 4;
  category: "core" | "main" | "resources" | "sub-feature";
  defaultEnabled: boolean;
}

export const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  // Tier 1 — Core (always on)
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Main overview page with crisis stats and alerts",
    tier: 1,
    category: "core",
    defaultEnabled: true,
  },
  {
    key: "auth",
    label: "Authentication",
    description: "Login, logout, and session management",
    tier: 1,
    category: "core",
    defaultEnabled: true,
  },
  {
    key: "profile",
    label: "Profile",
    description: "User profile and account settings",
    tier: 1,
    category: "core",
    defaultEnabled: true,
  },

  // Tier 2 — High Priority
  {
    key: "detection",
    label: "Detection & Alerts",
    description: "Live alerts, data sources, alert rules, and history",
    tier: 2,
    category: "main",
    defaultEnabled: true,
  },
  {
    key: "crisis_map",
    label: "Crisis Map",
    description: "Interactive Mapbox map with crisis markers",
    tier: 2,
    category: "resources",
    defaultEnabled: true,
  },
  {
    key: "crisis_detail",
    label: "Crisis Detail",
    description: "Individual crisis pages with timeline and response data",
    tier: 2,
    category: "main",
    defaultEnabled: true,
  },

  // Tier 3 — Medium Priority
  {
    key: "analysis",
    label: "Analysis",
    description: "Situation reports, scenario planning, and impact assessment",
    tier: 3,
    category: "main",
    defaultEnabled: true,
  },
  {
    key: "operations",
    label: "Operations",
    description: "Active operations, response strategy, and resource coordination",
    tier: 3,
    category: "main",
    defaultEnabled: true,
  },
  {
    key: "cash_assistance",
    label: "Cash Assistance",
    description: "Cash mapping, assessment, and distribution management",
    tier: 3,
    category: "main",
    defaultEnabled: true,
  },

  // Tier 4 — Lower Priority
  {
    key: "knowledge_hub",
    label: "Knowledge Hub",
    description: "Document library, contacts panel, and HumChat",
    tier: 4,
    category: "resources",
    defaultEnabled: true,
  },
  {
    key: "llm_analysis",
    label: "AI/LLM Analysis",
    description: "AI-powered situation analysis and insights generation",
    tier: 4,
    category: "sub-feature",
    defaultEnabled: true,
  },
  {
    key: "data_layers",
    label: "Data Layers",
    description: "Sidebar data layer toggles (cholera, flood, drought, response)",
    tier: 4,
    category: "sub-feature",
    defaultEnabled: true,
  },
  {
    key: "public_docs",
    label: "Public Docs",
    description: "Public documentation site at /docs",
    tier: 4,
    category: "sub-feature",
    defaultEnabled: true,
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
    FEATURE_FLAGS.map((f) => [f.key, f.defaultEnabled])
  );
}
