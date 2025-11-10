/**
 * Usage Service
 *
 * Handles usage tracking and analytics
 */

import { getSupabaseBrowserClient } from '../supabase/client';
import type { Database } from '../supabase/types';

type UsageEvent = Database['public']['Tables']['usage_events']['Row'];

export interface RecordUsageParams {
  prompt_id: number;
  user_id?: string | null;
  output?: string | null;
  success?: boolean;
  latency_ms?: number | null;
  cost?: number | null;
}

export class UsageService {
  private supabase = getSupabaseBrowserClient();

  /**
   * Record a usage event
   */
  async record(params: RecordUsageParams): Promise<UsageEvent> {
    const { data, error } = await this.supabase
      .from('usage_events')
      .insert({
        prompt_id: params.prompt_id,
        user_id: params.user_id || null,
        output: params.output || null,
        success: params.success ?? true,
        latency_ms: params.latency_ms || null,
        cost: params.cost || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get analytics by version for a prompt
   */
  async getAnalyticsByVersion(promptName: string, minVersion?: number, maxVersion?: number) {
    // First, get all prompts with this name
    let promptQuery = this.supabase
      .from('prompts')
      .select('id, version, name')
      .eq('name', promptName);

    if (minVersion !== undefined) {
      promptQuery = promptQuery.gte('version', minVersion);
    }
    if (maxVersion !== undefined) {
      promptQuery = promptQuery.lte('version', maxVersion);
    }

    const { data: prompts, error: promptsError } = await promptQuery;

    if (promptsError) {
      throw new Error(promptsError.message);
    }

    if (!prompts || prompts.length === 0) {
      return [];
    }

    // Get usage events for these prompts
    const promptIds = prompts.map(p => p.id);

    const { data: events, error: eventsError } = await this.supabase
      .from('usage_events')
      .select('prompt_id, success, cost')
      .in('prompt_id', promptIds);

    if (eventsError) {
      throw new Error(eventsError.message);
    }

    // Group by prompt_id and calculate stats
    const statsByPromptId = (events || []).reduce((acc, event) => {
      if (!acc[event.prompt_id]) {
        acc[event.prompt_id] = {
          count: 0,
          successCount: 0,
          totalCost: 0,
        };
      }

      acc[event.prompt_id].count++;
      if (event.success) {
        acc[event.prompt_id].successCount++;
      }
      if (event.cost) {
        acc[event.prompt_id].totalCost += event.cost;
      }

      return acc;
    }, {} as Record<number, { count: number; successCount: number; totalCost: number }>);

    // Map back to versions
    const result = prompts.map(prompt => {
      const stats = statsByPromptId[prompt.id] || { count: 0, successCount: 0, totalCost: 0 };

      return {
        version: prompt.version,
        count: stats.count,
        success_rate: stats.count > 0 ? stats.successCount / stats.count : 0,
        avg_cost: stats.count > 0 ? stats.totalCost / stats.count : null,
      };
    });

    return result;
  }
}

export const usageService = new UsageService();
