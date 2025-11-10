/**
 * KPIs Service
 *
 * Handles dashboard KPIs and analytics
 */

import { getSupabaseBrowserClient } from '../supabase/client';

export class KPIsService {
  private supabase = getSupabaseBrowserClient();

  /**
   * Get summary metrics for dashboard
   */
  async getSummary() {
    // Get total prompts (distinct names)
    const { count: totalPrompts } = await this.supabase
      .from('prompts')
      .select('name', { count: 'exact', head: true });

    // Get active prompts (latest version active)
    const { data: allPrompts } = await this.supabase
      .from('prompts')
      .select('name, version, active')
      .order('version', { ascending: false });

    const activePromptsSet = new Set();
    const seenNames = new Set();

    (allPrompts || []).forEach(p => {
      if (!seenNames.has(p.name)) {
        seenNames.add(p.name);
        if (p.active) {
          activePromptsSet.add(p.name);
        }
      }
    });

    // Get total deployments
    const { count: totalDeployments } = await this.supabase
      .from('deployments')
      .select('*', { count: 'exact', head: true });

    // Get running experiments (count of AB policies)
    const { count: runningExperiments } = await this.supabase
      .from('ab_policies')
      .select('*', { count: 'exact', head: true });

    // Get usage in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentUsage } = await this.supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    return {
      total_prompts: totalPrompts || 0,
      active_prompts: activePromptsSet.size,
      total_deployments: totalDeployments || 0,
      running_experiments: runningExperiments || 0,
      recent_usage: recentUsage || 0,
    };
  }

  /**
   * Get usage trend over time
   */
  async getUsageTrend(periodDays = 42, bucket: 'week' | 'day' = 'week') {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const { data: events } = await this.supabase
      .from('usage_events')
      .select('created_at, success, latency_ms, cost')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!events || events.length === 0) {
      return [];
    }

    // Group by time bucket
    const buckets = new Map<string, { executions: number; failures: number; totalLatency: number; totalCost: number }>();

    events.forEach(event => {
      const date = new Date(event.created_at);
      let bucketKey: string;

      if (bucket === 'week') {
        // Get week start (Monday)
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        bucketKey = weekStart.toISOString().split('T')[0];
      } else {
        bucketKey = date.toISOString().split('T')[0];
      }

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { executions: 0, failures: 0, totalLatency: 0, totalCost: 0 });
      }

      const stats = buckets.get(bucketKey)!;
      stats.executions++;
      if (!event.success) stats.failures++;
      if (event.latency_ms) stats.totalLatency += event.latency_ms;
      if (event.cost) stats.totalCost += event.cost;
    });

    // Convert to array
    return Array.from(buckets.entries()).map(([period, stats]) => ({
      period,
      executions: stats.executions,
      failures: stats.failures,
      avg_latency: stats.executions > 0 ? stats.totalLatency / stats.executions : null,
      avg_cost: stats.executions > 0 ? stats.totalCost / stats.executions : null,
    }));
  }

  /**
   * Get version release velocity
   */
  async getVersionVelocity(months = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: prompts } = await this.supabase
      .from('prompts')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (!prompts || prompts.length === 0) {
      return [];
    }

    // Group by month
    const monthCounts = new Map<string, number>();

    prompts.forEach(prompt => {
      const date = new Date(prompt.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
    });

    return Array.from(monthCounts.entries()).map(([month, count]) => ({
      month,
      releases: count,
    }));
  }

  /**
   * Get top prompts by usage
   */
  async getTopPrompts(limit = 10, periodDays = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get usage events in the period
    const { data: events } = await this.supabase
      .from('usage_events')
      .select('prompt_id, success, cost')
      .gte('created_at', startDate.toISOString());

    if (!events || events.length === 0) {
      return [];
    }

    // Group by prompt_id
    const promptStats = events.reduce((acc, event) => {
      if (!acc[event.prompt_id]) {
        acc[event.prompt_id] = { executions: 0, successCount: 0, totalCost: 0 };
      }

      acc[event.prompt_id].executions++;
      if (event.success) acc[event.prompt_id].successCount++;
      if (event.cost) acc[event.prompt_id].totalCost += event.cost;

      return acc;
    }, {} as Record<number, { executions: number; successCount: number; totalCost: number }>);

    // Get prompt details
    const promptIds = Object.keys(promptStats).map(Number);

    const { data: prompts } = await this.supabase
      .from('prompts')
      .select('id, name, version, created_at')
      .in('id', promptIds);

    if (!prompts) {
      return [];
    }

    // Combine and sort
    const result = prompts.map(prompt => {
      const stats = promptStats[prompt.id];
      return {
        name: prompt.name,
        executions: stats.executions,
        success_rate: stats.executions > 0 ? stats.successCount / stats.executions : 0,
        avg_cost: stats.executions > 0 ? stats.totalCost / stats.executions : null,
        last_updated: prompt.created_at,
      };
    });

    // Sort by executions and take top N
    result.sort((a, b) => b.executions - a.executions);

    return result.slice(0, limit);
  }

  /**
   * Get active experiments summary
   */
  async getExperiments() {
    const { data: policies } = await this.supabase
      .from('ab_policies')
      .select('*')
      .eq('is_public', true);

    if (!policies || policies.length === 0) {
      return [];
    }

    // For each policy, get assignment stats
    const experiments = await Promise.all(
      policies.map(async policy => {
        const { data: assignments } = await this.supabase
          .from('ab_assignments')
          .select('*')
          .eq('prompt_name', policy.prompt_name);

        const weights = policy.weights as Record<string, number>;
        const versions = Object.keys(weights).map(Number);

        // Count assignments per version
        const versionCounts = (assignments || []).reduce((acc, a) => {
          acc[a.version] = (acc[a.version] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

        const arms = versions.map(version => ({
          version,
          weight: weights[version],
          assignments: versionCounts[version] || 0,
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
}

export const kpisService = new KPIsService();
