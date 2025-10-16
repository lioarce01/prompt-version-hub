export interface UsageEvent {
  id: number;
  prompt_id: number;
  user_id?: string;
  output?: string;
  success: boolean;
  latency_ms?: number;
  cost?: number; // in cents
  created_at: string;
}

export interface RecordUsageRequest {
  prompt_id: number;
  user_id?: string;
  output?: string;
  success: boolean;
  latency_ms?: number;
  cost?: number;
}

export interface UsageStats {
  total_requests: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  avg_latency_ms?: number;
  total_cost?: number; // in cents
  timeseries?: TimeseriesData[];
}

export interface TimeseriesData {
  date: string;
  count: number;
  cost?: number;
}

export interface UsageFilters {
  prompt_id?: number;
  date_from?: string;
  date_to?: string;
  success?: boolean;
  group_by?: "day" | "week" | "month";
}
