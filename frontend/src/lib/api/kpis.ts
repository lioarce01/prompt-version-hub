/**
 * KPIs API Functions
 *
 * Functional API for KPI and analytics operations.
 * Designed for use with TanStack Query.
 */

import { createClient } from '@/utils/supabase/client';

export interface SummaryMetrics {
  total_prompts: number;
  active_prompts: number;
  total_deployments: number;
  running_experiments: number;
  recent_usage: number;
}

export interface UsageTrendData {
  period: string;
  executions: number;
  failures: number;
  avg_latency: number | null;
  avg_cost: number | null;
}

export interface VersionVelocityData {
  month: string;
  releases: number;
}

export interface TopPromptData {
  name: string;
  executions: number;
  success_rate: number;
  avg_cost: number | null;
  last_updated: string;
}

export interface ExperimentAnalytics {
  experiment: string;
  prompt: string;
  arms: Array<{
    version: number;
    weight: number;
    assignments: number;
    success_rate: number | null;
  }>;
}

/**
 * Get summary metrics for dashboard
 */
export async function get_summary(): Promise<SummaryMetrics> {
  const supabase = createClient();

  // Get total prompts (distinct names)
  const { count: total_prompts } = await (
    supabase.from('prompts') as any
  ).select('name', { count: 'exact', head: true });

  // Get active prompts (latest version active)
  const { data: all_prompts } = await (supabase.from('prompts') as any)
    .select('name, version, active')
    .order('version', { ascending: false });

  const active_prompts_set = new Set();
  const seen_names = new Set();

  (all_prompts || []).forEach(
    (p: { name: string; version: number; active: boolean }) => {
      if (!seen_names.has(p.name)) {
        seen_names.add(p.name);
        if (p.active) {
          active_prompts_set.add(p.name);
        }
      }
    }
  );

  // Get total deployments
  const { count: total_deployments } = await (
    supabase.from('deployments') as any
  ).select('*', { count: 'exact', head: true });

  // Get running experiments (count of AB policies)
  const { count: running_experiments } = await (
    supabase.from('ab_policies') as any
  ).select('*', { count: 'exact', head: true });

  // Get usage in last 7 days
  const seven_days_ago = new Date();
  seven_days_ago.setDate(seven_days_ago.getDate() - 7);

  const { count: recent_usage } = await (
    supabase.from('usage_events') as any
  )
    .select('*', { count: 'exact', head: true })
    .gte('created_at', seven_days_ago.toISOString());

  return {
    total_prompts: total_prompts || 0,
    active_prompts: active_prompts_set.size,
    total_deployments: total_deployments || 0,
    running_experiments: running_experiments || 0,
    recent_usage: recent_usage || 0,
  };
}

/**
 * Get usage trend over time
 */
export async function get_usage_trend(
  period_days = 42,
  bucket: 'week' | 'day' = 'week'
): Promise<UsageTrendData[]> {
  const supabase = createClient();

  const start_date = new Date();
  start_date.setDate(start_date.getDate() - period_days);

  const { data: events } = await (supabase.from('usage_events') as any)
    .select('created_at, success, latency_ms, cost')
    .gte('created_at', start_date.toISOString())
    .order('created_at', { ascending: true });

  if (!events || events.length === 0) {
    return [];
  }

  // Group by time bucket
  const buckets = new Map<
    string,
    {
      executions: number;
      failures: number;
      total_latency: number;
      total_cost: number;
    }
  >();

  events.forEach((event: any) => {
    const date = new Date(event.created_at);
    let bucket_key: string;

    if (bucket === 'week') {
      // Get week start (Monday)
      const day_of_week = date.getDay();
      const diff = date.getDate() - day_of_week + (day_of_week === 0 ? -6 : 1);
      const week_start = new Date(date.setDate(diff));
      bucket_key = week_start.toISOString().split('T')[0];
    } else {
      bucket_key = date.toISOString().split('T')[0];
    }

    if (!buckets.has(bucket_key)) {
      buckets.set(bucket_key, {
        executions: 0,
        failures: 0,
        total_latency: 0,
        total_cost: 0,
      });
    }

    const stats = buckets.get(bucket_key)!;
    stats.executions++;
    if (!event.success) stats.failures++;
    if (event.latency_ms) stats.total_latency += event.latency_ms;
    if (event.cost) stats.total_cost += event.cost;
  });

  // Convert to array
  return Array.from(buckets.entries()).map(([period, stats]) => ({
    period,
    executions: stats.executions,
    failures: stats.failures,
    avg_latency:
      stats.executions > 0 ? stats.total_latency / stats.executions : null,
    avg_cost:
      stats.executions > 0 ? stats.total_cost / stats.executions : null,
  }));
}

/**
 * Get version release velocity
 */
export async function get_version_velocity(
  months = 6
): Promise<VersionVelocityData[]> {
  const supabase = createClient();

  const start_date = new Date();
  start_date.setMonth(start_date.getMonth() - months);

  const { data: prompts } = await (supabase.from('prompts') as any)
    .select('created_at')
    .gte('created_at', start_date.toISOString())
    .order('created_at', { ascending: true });

  if (!prompts || prompts.length === 0) {
    return [];
  }

  // Group by month
  const month_counts = new Map<string, number>();

  prompts.forEach((prompt: any) => {
    const date = new Date(prompt.created_at);
    const month_key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    month_counts.set(month_key, (month_counts.get(month_key) || 0) + 1);
  });

  return Array.from(month_counts.entries()).map(([month, count]) => ({
    month,
    releases: count,
  }));
}

/**
 * Get top prompts by usage
 */
export async function get_top_prompts(
  limit = 10,
  period_days = 30
): Promise<TopPromptData[]> {
  const supabase = createClient();

  const start_date = new Date();
  start_date.setDate(start_date.getDate() - period_days);

  // Get usage events in the period
  const { data: events } = await (supabase.from('usage_events') as any)
    .select('prompt_id, success, cost')
    .gte('created_at', start_date.toISOString());

  if (!events || events.length === 0) {
    return [];
  }

  // Group by prompt_id
  const prompt_stats = events.reduce(
    (
      acc: Record<
        number,
        { executions: number; success_count: number; total_cost: number }
      >,
      event: any
    ) => {
      if (!acc[event.prompt_id]) {
        acc[event.prompt_id] = {
          executions: 0,
          success_count: 0,
          total_cost: 0,
        };
      }

      acc[event.prompt_id].executions++;
      if (event.success) acc[event.prompt_id].success_count++;
      if (event.cost) acc[event.prompt_id].total_cost += event.cost;

      return acc;
    },
    {} as Record<
      number,
      { executions: number; success_count: number; total_cost: number }
    >
  );

  // Get prompt details
  const prompt_ids = Object.keys(prompt_stats).map(Number);

  const { data: prompts } = await (supabase.from('prompts') as any)
    .select('id, name, version, created_at')
    .in('id', prompt_ids);

  if (!prompts) {
    return [];
  }

  // Combine and sort
  const result = prompts.map((prompt: any) => {
    const stats = prompt_stats[prompt.id];
    return {
      name: prompt.name,
      executions: stats.executions,
      success_rate:
        stats.executions > 0 ? stats.success_count / stats.executions : 0,
      avg_cost:
        stats.executions > 0 ? stats.total_cost / stats.executions : null,
      last_updated: prompt.created_at,
    };
  });

  // Sort by executions and take top N
  result.sort((a: any, b: any) => b.executions - a.executions);

  return result.slice(0, limit);
}

/**
 * Get active experiments summary
 */
export async function get_experiments_analytics(): Promise<
  ExperimentAnalytics[]
> {
  const supabase = createClient();

  const { data: policies } = await (supabase.from('ab_policies') as any)
    .select('*')
    .eq('is_public', true);

  if (!policies || policies.length === 0) {
    return [];
  }

  // For each policy, get assignment stats
  const experiments = await Promise.all(
    policies.map(async (policy: any) => {
      const { data: assignments } = await (
        supabase.from('ab_assignments') as any
      )
        .select('*')
        .eq('prompt_name', policy.prompt_name);

      const weights = policy.weights as Record<string, number>;
      const versions = Object.keys(weights).map(Number);

      // Count assignments per version
      const version_counts = (assignments || []).reduce(
        (acc: Record<number, number>, a: any) => {
          acc[a.version] = (acc[a.version] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>
      );

      const arms = versions.map((version) => ({
        version,
        weight: weights[version],
        assignments: version_counts[version] || 0,
        success_rate: null, // Would need usage_events joined by prompt version
      }));

      return {
        experiment: policy.prompt_name,
        prompt: policy.prompt_name,
        arms,
      };
    })
  );

  return experiments;
}
