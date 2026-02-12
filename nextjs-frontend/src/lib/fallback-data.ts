/**
 * Fallback/static data used when Django backend is unavailable.
 * Extracted from page components so they can be shared and kept in one place.
 */

import type {
  DjangoAlertsResponse,
  DjangoAlertStatsResponse,
  DjangoShockTypesResponse,
  DjangoPipelineSourcesResponse,
  DjangoPipelineStatisticsResponse,
  DjangoDetectorsResponse,
  DjangoDetectionsResponse,
  DjangoFrameworkStatsResponse,
  LLMProvidersResponse,
} from "~/lib/types/django";

/* ========== Alert Fallback Data ========== */

export const FALLBACK_ALERTS: DjangoAlertsResponse = {
  success: true,
  count: 3,
  total: 3,
  page: 1,
  pages: 1,
  has_next: false,
  has_previous: false,
  alerts: [
    {
      id: 1,
      title: "Cholera Outbreak - Somali Region",
      text: "247 confirmed cases of cholera reported in Jijiga and surrounding woredas. Waterborne transmission suspected from contaminated wells. 46-hour intervention window remaining.",
      shock_type: { id: 1, name: "Disease Outbreak", icon: "virus", color: "#DC2626" },
      severity: 5,
      shock_date: "2026-01-28T00:00:00Z",
      go_no_go: true,
      locations: [
        { id: 1, name: "Somali Region", geo_id: "ET_05", admin_level: 1, latitude: 9.35, longitude: 42.79 },
      ],
      data_source: { id: 1, name: "MOH PHEM", type: "api", description: "Ministry of Health Public Health Emergency Management" },
      created_at: "2026-01-28T08:00:00Z",
      updated_at: "2026-02-10T14:00:00Z",
    },
    {
      id: 2,
      title: "Flood Risk - Oromia Region",
      text: "Elevated flood risk due to seasonal rainfall patterns in Oromia. 36-hour warning issued. Pre-positioning recommended for Bale and West Arsi zones.",
      shock_type: { id: 2, name: "Flood", icon: "water", color: "#F59E0B" },
      severity: 4,
      shock_date: "2026-02-05T00:00:00Z",
      go_no_go: true,
      locations: [
        { id: 2, name: "Oromia Region", geo_id: "ET_04", admin_level: 1, latitude: 7.0, longitude: 39.76 },
      ],
      data_source: { id: 2, name: "GloFAS", type: "api", description: "Global Flood Awareness System" },
      created_at: "2026-02-05T06:00:00Z",
      updated_at: "2026-02-09T10:00:00Z",
    },
    {
      id: 3,
      title: "Drought Monitoring - Afar Region",
      text: "Early warning indicators for drought conditions in Afar Region. Monitoring phase with potential escalation in 2-4 weeks.",
      shock_type: { id: 3, name: "Drought", icon: "sun", color: "#D97706" },
      severity: 3,
      shock_date: "2026-01-15T00:00:00Z",
      go_no_go: true,
      locations: [
        { id: 3, name: "Afar Region", geo_id: "ET_02", admin_level: 1, latitude: 11.5, longitude: 40.0 },
      ],
      data_source: { id: 3, name: "FEWS NET", type: "api", description: "Famine Early Warning Systems Network" },
      created_at: "2026-01-15T12:00:00Z",
      updated_at: "2026-02-08T08:00:00Z",
    },
  ],
  filters_applied: {},
};

export const FALLBACK_ALERT_STATS: DjangoAlertStatsResponse = {
  success: true,
  stats: {
    overview: {
      total_alerts: 15,
      active_alerts: 3,
      recent_30_days: 5,
      recent_7_days: 2,
    },
    by_shock_type: [
      { shock_type__name: "Disease Outbreak", count: 4 },
      { shock_type__name: "Flood", count: 3 },
      { shock_type__name: "Drought", count: 3 },
      { shock_type__name: "Conflict", count: 5 },
    ],
    by_severity: [
      { severity: 5, count: 2 },
      { severity: 4, count: 3 },
      { severity: 3, count: 5 },
      { severity: 2, count: 3 },
      { severity: 1, count: 2 },
    ],
  },
};

export const FALLBACK_SHOCK_TYPES: DjangoShockTypesResponse = {
  success: true,
  shock_types: [
    { id: 1, name: "Disease Outbreak", icon: "virus", color: "#DC2626", alert_count: 4 },
    { id: 2, name: "Flood", icon: "water", color: "#2563EB", alert_count: 3 },
    { id: 3, name: "Drought", icon: "sun", color: "#D97706", alert_count: 3 },
    { id: 4, name: "Conflict", icon: "alert", color: "#DC2626", alert_count: 5 },
    { id: 5, name: "Displacement", icon: "users", color: "#7C3AED", alert_count: 2 },
  ],
};

/* ========== Pipeline Fallback Data ========== */

export const FALLBACK_PIPELINE_SOURCES: DjangoPipelineSourcesResponse = {
  success: true,
  sources: [
    { id: 1, name: "ACLED", type: "api", data_frequency: "realtime", is_active: true, description: "Armed Conflict Location & Event Data", variable_count: 12 },
    { id: 2, name: "Dataminr", type: "api", data_frequency: "realtime", is_active: true, description: "Real-time event detection", variable_count: 8 },
    { id: 3, name: "IOM DTM", type: "api", data_frequency: "historical", is_active: true, description: "Displacement Tracking Matrix", variable_count: 15 },
    { id: 4, name: "FEWS NET", type: "api", data_frequency: "historical", is_active: true, description: "Famine Early Warning Systems Network", variable_count: 6 },
    { id: 5, name: "GloFAS", type: "api", data_frequency: "realtime", is_active: true, description: "Global Flood Awareness System", variable_count: 4 },
    { id: 6, name: "IDMC", type: "api", data_frequency: "historical", is_active: true, description: "Internal Displacement Monitoring Centre", variable_count: 10 },
    { id: 7, name: "ReliefWeb", type: "api", data_frequency: "realtime", is_active: true, description: "Humanitarian information service", variable_count: 20 },
    { id: 8, name: "MOH PHEM", type: "api", data_frequency: "realtime", is_active: true, description: "Ministry of Health Public Health Emergency Management", variable_count: 9 },
    { id: 9, name: "OCHA HPC", type: "api", data_frequency: "historical", is_active: true, description: "Humanitarian Programme Cycle", variable_count: 7 },
    { id: 10, name: "WFP VAM", type: "api", data_frequency: "historical", is_active: true, description: "Vulnerability Analysis and Mapping", variable_count: 11 },
  ],
};

export const FALLBACK_PIPELINE_STATISTICS: DjangoPipelineStatisticsResponse = {
  success: true,
  statistics: {
    sources: { total: 10, active: 10, by_type: { api: 10 } },
    variables: { total: 102, by_type: { quantitative: 60, qualitative: 25, textual: 17 } },
    data: { total_records: 55400, recent_24h: 342, recent_7d: 2180 },
  },
};

/* ========== Alert Framework Fallback Data ========== */

export const FALLBACK_DETECTORS: DjangoDetectorsResponse = {
  success: true,
  detectors: [
    { id: 1, name: "Cholera Case Threshold", class_name: "CholeraCaseDetector", active: true, run_count: 48, detection_count: 12, description: "Triggers when cholera cases exceed 50 in 7-day window" },
    { id: 2, name: "Flood Risk Elevation", class_name: "FloodRiskDetector", active: true, run_count: 96, detection_count: 8, description: "GloFAS river discharge exceeds 90th percentile" },
    { id: 3, name: "Displacement Surge", class_name: "DisplacementSurgeDetector", active: true, run_count: 24, detection_count: 5, description: "IOM DTM reports >5000 new displaced in 48h" },
    { id: 4, name: "Food Price Spike", class_name: "FoodPriceSpikeDetector", active: true, run_count: 12, detection_count: 3, description: "Staple food prices increase >30% in 30 days" },
    { id: 5, name: "Conflict Escalation", class_name: "ConflictEscalationDetector", active: true, run_count: 96, detection_count: 15, description: "ACLED events exceed regional 3-month average" },
    { id: 6, name: "Health Facility Overload", class_name: "HealthFacilityDetector", active: false, run_count: 36, detection_count: 2, description: "Health facility admissions exceed 150% capacity" },
    { id: 7, name: "Supply Chain Disruption", class_name: "SupplyChainDetector", active: true, run_count: 24, detection_count: 4, description: "Humanitarian supply chain route disrupted" },
  ],
};

export const FALLBACK_DETECTIONS: DjangoDetectionsResponse = {
  success: true,
  detections: [],
};

export const FALLBACK_FRAMEWORK_STATS: DjangoFrameworkStatsResponse = {
  success: true,
  stats: {
    detectors: { total: 7, active: 6 },
    detections: { total: 49, pending: 3, processed: 40, dismissed: 6 },
    alerts_generated: 15,
  },
};

/* ========== LLM Fallback Data ========== */

export const FALLBACK_LLM_PROVIDERS: LLMProvidersResponse = {
  providers: [
    { name: "openai", type: "litellm", active: false, configured: false, priority: 10, rate_limit: null, token_limit: null, model: "gpt-4.1-mini" },
  ],
};
