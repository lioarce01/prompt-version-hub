/**
 * TanStack Query hooks for KPIs
 *
 * These hooks provide intelligent caching and automatic refetching
 * for KPI data throughout the application.
 */

import { useQuery } from "@tanstack/react-query";
import {
  get_summary,
  get_usage_trend,
  get_version_velocity,
  get_top_prompts,
  get_experiments_analytics,
} from "@/lib/api/kpis";
import { kpis_keys } from "@/lib/api/kpis-keys";
import { useUserId } from "@/hooks/auth/useAuth";

/**
 * Fetch dashboard summary statistics
 *
 * @returns Summary data including totals and recent activity
 */
export function useGetSummaryQuery() {
  const userId = useUserId();

  return useQuery({
    queryKey: kpis_keys.summary(),
    queryFn: async () => {
      if (!userId) return null;
      const data = await get_summary();
      // Transform to match expected format
      return {
        totals: {
          prompts: data.total_prompts,
          active_prompts: data.active_prompts,
          deployments: data.total_deployments,
          experiments: data.running_experiments,
        },
        recent_activity: data.recent_usage,
      };
    },
    enabled: !!userId, // Only run when authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch usage trend data over time
 *
 * @param params - Configuration for the trend query
 * @param params.period_days - Number of days to include (default: 42)
 * @param params.bucket - Aggregation bucket size: 'week' or 'day' (default: 'week')
 */
export function useGetUsageTrendQuery(
  params: { period_days?: number; bucket?: "week" | "day" } = {},
) {
  const userId = useUserId();
  const period_days = params.period_days ?? 42;
  const bucket = params.bucket ?? "week";

  return useQuery({
    queryKey: kpis_keys.usage_trend(period_days, bucket),
    queryFn: async () => {
      if (!userId) return null;
      return get_usage_trend(period_days, bucket);
    },
    enabled: !!userId, // Only run when authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch version velocity metrics
 *
 * Shows how quickly new prompt versions are created over time
 *
 * @param params - Configuration for the velocity query
 * @param params.months - Number of months to analyze (default: 6)
 */
export function useGetVersionVelocityQuery(params: { months?: number } = {}) {
  const userId = useUserId();
  const months = params.months ?? 6;

  return useQuery({
    queryKey: kpis_keys.version_velocity(months),
    queryFn: async () => {
      if (!userId) return null;
      return get_version_velocity(months);
    },
    enabled: !!userId, // Only run when authenticated
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch top prompts by usage
 *
 * @param params - Configuration for the top prompts query
 * @param params.limit - Maximum number of prompts to return (default: 10)
 * @param params.period_days - Time period to analyze (default: 30)
 */
export function useGetTopPromptsQuery(
  params: { limit?: number; period_days?: number } = {},
) {
  const userId = useUserId();
  const limit = params.limit ?? 10;
  const period_days = params.period_days ?? 30;

  return useQuery({
    queryKey: kpis_keys.top_prompts(limit, period_days),
    queryFn: async () => {
      if (!userId) return null;
      return get_top_prompts(limit, period_days);
    },
    enabled: !!userId, // Only run when authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch experiments analytics
 *
 * Provides overview of A/B testing experiments
 */
export function useGetExperimentsAnalyticsQuery() {
  const userId = useUserId();

  return useQuery({
    queryKey: kpis_keys.experiments_analytics(),
    queryFn: async () => {
      if (!userId) return null;
      return get_experiments_analytics();
    },
    enabled: !!userId, // Only run when authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
