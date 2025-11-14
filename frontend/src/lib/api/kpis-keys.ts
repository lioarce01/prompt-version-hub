/**
 * KPIs Query Keys Factory
 *
 * Centralized query keys for KPI-related queries.
 * Follows TanStack Query best practices for key management.
 */

export const kpis_keys = {
  all: ['kpis'] as const,
  summary: () => [...kpis_keys.all, 'summary'] as const,
  usage_trend: (period_days: number, bucket: 'week' | 'day') =>
    [...kpis_keys.all, 'usage-trend', period_days, bucket] as const,
  version_velocity: (months: number) =>
    [...kpis_keys.all, 'version-velocity', months] as const,
  top_prompts: (limit: number, period_days: number) =>
    [...kpis_keys.all, 'top-prompts', limit, period_days] as const,
  experiments_analytics: () =>
    [...kpis_keys.all, 'experiments-analytics'] as const,
} as const;
