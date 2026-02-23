/* ========== Django API Response Types ========== */

// -- Alerts --

export interface DjangoShockType {
  id: number;
  name: string;
  icon: string;
  color: string;
  alert_count?: number;
}

export interface DjangoLocation {
  id: number;
  name: string;
  geo_id: string;
  admin_level: number | { code: string; name: string };
  latitude?: number;
  longitude?: number;
  /** GeoJSON point — returned by public API as `{ coordinates: [lng, lat] }` */
  point?: { coordinates: [number, number] };
}

export interface DjangoDataSource {
  id: number;
  name: string;
  type: string;
  description?: string;
}

export interface DjangoAlert {
  id: number;
  title: string;
  text: string;
  shock_type: DjangoShockType;
  severity: number; // 1-5
  shock_date: string;
  valid_from?: string;
  valid_until?: string;
  go_no_go: boolean;
  locations: DjangoLocation[];
  data_source?: DjangoDataSource;
  created_at: string;
  updated_at: string;
  user_interactions?: {
    bookmarked: boolean;
    rating: number | null;
    flag_false: boolean;
    flag_incomplete: boolean;
    comment: string | null;
  };
}

export interface DjangoAlertsResponse {
  success: boolean;
  count: number;
  total?: number;
  page?: number;
  pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
  alerts: DjangoAlert[];
  filters_applied?: Record<string, unknown>;
}

export interface DjangoAlertDetailResponse {
  success: boolean;
  alert: DjangoAlert;
}

export interface DjangoShockTypesResponse {
  success: boolean;
  shock_types: DjangoShockType[];
}

export interface DjangoAlertStats {
  overview: {
    total_alerts: number;
    active_alerts: number;
    recent_30_days: number;
    recent_7_days: number;
  };
  by_shock_type: { shock_type__name: string; count: number }[];
  by_severity: { severity: number; count: number }[];
  user?: {
    bookmarks: number;
    ratings: number;
    subscriptions: number;
  };
}

export interface DjangoAlertStatsResponse {
  success: boolean;
  stats: DjangoAlertStats;
}

// -- Subscriptions --

export interface DjangoSubscription {
  id: number;
  active: boolean;
  method: "email" | "sms";
  frequency: "immediate" | "daily" | "weekly" | "monthly";
  created_at: string;
  updated_at: string;
  locations: { id: number; name: string; geo_id: string }[];
  shock_types: { id: number; name: string }[];
}

export interface DjangoSubscriptionsResponse {
  success: boolean;
  subscriptions: DjangoSubscription[];
}

export interface DjangoSubscriptionResponse {
  success: boolean;
  subscription: DjangoSubscription;
}

export interface DjangoProfileUpdateResponse {
  success: boolean;
  profile: {
    mobile_number: string;
    sms_notifications_enabled: boolean;
    email_notifications_enabled: boolean;
    preferred_language: string;
    timezone: string;
  };
}

// -- Data Pipeline --

export interface DjangoPipelineSource {
  id: number;
  name: string;
  description?: string;
  type: string;
  data_frequency: string;
  base_url?: string;
  is_active: boolean;
  variable_count?: number;
}

export interface DjangoPipelineSourcesResponse {
  success: boolean;
  sources: DjangoPipelineSource[];
}

export interface DjangoPipelineStatistics {
  success: boolean;
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  overall: {
    total_sources: number;
    total_variables: number;
    total_data_records: number;
    recent_data_count: number;
  };
  by_source: Record<string, { variables: number; data_records: number }>;
  by_type: Record<string, { variables: number; data_records: number }>;
  tasks: {
    total_tasks: number;
    total_success: number;
    total_failures: number;
    avg_duration: number;
  };
}

export type DjangoPipelineStatisticsResponse = DjangoPipelineStatistics;

// -- Alert Framework --

export interface DjangoDetector {
  id: number;
  name: string;
  description?: string;
  class_name: string;
  active: boolean;
  last_run?: string;
  run_count: number;
  detection_count: number;
  configuration?: Record<string, unknown>;
}

export interface DjangoDetectorsResponse {
  success: boolean;
  detectors: DjangoDetector[];
}

export interface DjangoDetection {
  id: number;
  detector: { id: number; name: string };
  title: string;
  detection_timestamp: string;
  confidence_score: number;
  shock_type?: DjangoShockType;
  locations: DjangoLocation[];
  status: "pending" | "processed" | "dismissed";
  alert?: { id: number; title: string } | null;
  detection_data?: Record<string, unknown>;
}

export interface DjangoDetectionsResponse {
  success: boolean;
  detections: DjangoDetection[];
}

export interface DjangoFrameworkStats {
  detectors: {
    total: number;
    active: number;
  };
  detections: {
    total: number;
    pending: number;
    processed: number;
    dismissed: number;
  };
  alerts_generated: number;
}

export interface DjangoFrameworkStatsResponse {
  success: boolean;
  stats: DjangoFrameworkStats;
}

// -- LLM Service --

export interface LLMQueryRequest {
  prompt: string;
  system?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  cache?: boolean;
  stream?: boolean;
}

export interface LLMQueryResponse {
  response: string;
  provider: string;
  model: string;
  response_time_ms: number;
  cache_hit: boolean;
  metadata?: Record<string, unknown>;
}

export interface LLMProviderStatus {
  name: string;
  type: string;
  active: boolean;
  configured: boolean;
  priority: number;
  rate_limit: number | null;
  token_limit: number | null;
  model: string;
  error?: string;
}

export interface LLMProvidersResponse {
  providers: LLMProviderStatus[];
}

// -- Helpers --

/** Map Django severity (1-5) to UI severity labels */
export function mapSeverity(severity: number): "critical" | "high" | "medium" | "low" {
  if (severity >= 5) return "critical";
  if (severity >= 4) return "high";
  if (severity >= 3) return "medium";
  return "low";
}

/** Map Django severity to display color */
export function severityColor(severity: number): string {
  if (severity >= 5) return "#DC2626";
  if (severity >= 4) return "#D97706";
  if (severity >= 3) return "#F59E0B";
  return "#059669";
}
