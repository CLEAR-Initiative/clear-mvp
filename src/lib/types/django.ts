/**
 * Legacy types retained for pipeline components that still use them.
 * These will be replaced once the pipeline router is fully migrated.
 */

// -- Data Pipeline --

export interface DjangoPipelineSource {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  data_frequency: string;
  base_url?: string | null;
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
