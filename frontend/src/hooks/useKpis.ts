/**
 * TanStack Query hooks for KPIs
 *
 * These hooks provide intelligent caching and automatic refetching
 * for KPI data throughout the application.
 */

import { useQuery } from "@tanstack/react-query";
import { kpisService } from "@/lib/services/kpis.service";

/**
 * Fetch dashboard summary statistics
 *
 * @returns Summary data including totals and recent activity
 */
export function useGetSummaryQuery() {
  return useQuery({
    queryKey: ["kpis", "summary"],
    queryFn: async () => {
      const data = await kpisService.getSummary();
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
  const period_days = params.period_days ?? 42;
  const bucket = params.bucket ?? "week";

  return useQuery({
    queryKey: ["kpis", "usage-trend", period_days, bucket],
    queryFn: () => kpisService.getUsageTrend(period_days, bucket),
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
  const months = params.months ?? 6;

  return useQuery({
    queryKey: ["kpis", "version-velocity", months],
    queryFn: () => kpisService.getVersionVelocity(months),
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
  const limit = params.limit ?? 10;
  const period_days = params.period_days ?? 30;

  return useQuery({
    queryKey: ["kpis", "top-prompts", limit, period_days],
    queryFn: () => kpisService.getTopPrompts(limit, period_days),
  });
}

/**
 * Fetch experiments analytics
 *
 * Provides overview of A/B testing experiments
 */
export function useGetExperimentsAnalyticsQuery() {
  return useQuery({
    queryKey: ["kpis", "experiments-analytics"],
    queryFn: () => kpisService.getExperiments(),
  });
}
