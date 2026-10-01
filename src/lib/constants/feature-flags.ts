/**
 * Feature flag registry.
 *
 * Most entries gate a top-level nav item (they carry a `route`). Entries
 * without a `route` gate a sub-tab within a page (e.g. the Ground Intel tab in
 * Detection, the Situation Analysis tab in Insights) — the component reads the
 * flag via `useFeatureEnabled(key)`.
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
    label: "Map",
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
    description: "Document library and contacts panel",
    tier: 4,
    defaultEnabled: true,
    route: "/knowledge",
  },
  {
    key: "agent",
    label: "CLEAR Agent",
    description:
      "The CLEAR Agent: the Agent drawer on every page and the Agent page. Answers from NRC Find; Threads are stored as Conversations in clear-api under a daily Agent budget.",
    tier: 4,
    defaultEnabled: false,
    route: "/agent",
  },

  {
    key: "hotline_inbox",
    label: "Hotline Inbox",
    description:
      "WhatsApp hotline triage inbox (admin only for now). UI-only gate; clear-api's admin/analyst role check on ground queries is the backend enforcement. Owner: James. Remove once the hotline is Verified in production ([EPIC] WhatsApp Hotline V1).",
    tier: 2,
    defaultEnabled: false,
    route: "/inbox",
  },

  // ── Sub-tab flags (gate a tab within a page, not a nav route — no `route`) ──
  {
    key: "hotline_translation",
    label: "Hotline translation",
    description:
      "On-demand translation of hotline messages in the Hotline Inbox (needs `hotline_inbox`), into the reader's language. Turn on only where clear-api has on-demand translation (clear-api#627) and the pipeline's translate drain (clear-pipeline#626) are live: while on, the inbox asks clear-api for each message's detected language, and an API without it fails the whole inbox. Enforced in the ground router, not only the UI, so turning it off also contains a rollback without a deploy.",
    tier: 4,
    defaultEnabled: false,
  },
  {
    key: "ground_intel",
    label: "Ground Intel",
    description:
      "Ground Intel review tab in the Detection page (also admin/analyst only)",
    tier: 2,
    defaultEnabled: true,
  },
  {
    key: "situation_analysis",
    label: "Situation Analysis",
    description: "Situation Analysis tab in the Insights page",
    tier: 3,
    defaultEnabled: true,
  },
  {
    key: "analysis_v2",
    label: "Analysis",
    description:
      "Analysis tab in the Insights page: the unified scoped analysis (PRD Situation analysis (neo)), country scope first, read from clear-api's frame-scoped `analysis` (ADR-0007). UI-only gate. Remove once it replaces the Crisis and Situation Analysis tabs.",
    tier: 3,
    defaultEnabled: false,
  },
  {
    key: "agent_clear_data",
    label: "CLEAR Agent: CLEAR data and navigation",
    description:
      "Lets the CLEAR Agent (needs `agent`) answer from CLEAR's own data (Signals, Events, Alerts, Crises, situation analyses, knowledge base) through the curated clear-mcp tools, see the user's Current view, and move the app with Agent navigation (always announced, with Back). Enforced in /api/agent, not only the UI. Off: the Agent answers from NRC Find only, as in V1.",
    tier: 4,
    defaultEnabled: false,
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
