/**
 * Deployments API Functions
 *
 * Functional API for deployment management operations.
 * Designed for use with TanStack Query.
 */

import { createClient } from '@/utils/supabase/client';
import type { Database } from '../supabase/types';

type Deployment = Database['public']['Tables']['deployments']['Row'];

export interface CreateDeploymentParams {
  prompt_name: string;
  version: number;
  environment: string;
}

/**
 * Create a new deployment
 */
export async function create_deployment(
  user_id: string,
  params: CreateDeploymentParams
) {
  const supabase = createClient();

  const { prompt_name, version, environment } = params;

  // Find the prompt by name and version
  const { data: prompt, error: prompt_error } = await (
    supabase.from('prompts') as any
  )
    .select('*')
    .eq('name', prompt_name)
    .eq('version', version)
    .single();

  if (prompt_error || !prompt) {
    throw new Error('Prompt not found');
  }

  // Create the deployment
  const { data, error } = await (supabase.from('deployments') as any)
    .insert({
      prompt_id: prompt.id,
      environment,
      deployed_by: user_id,
    })
    .select(`
      *,
      prompt:prompts(*),
      user:users!deployments_deployed_by_fkey(id,email,role)
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get current deployment for an environment
 */
export async function get_current_deployment(
  environment: string,
  user_id: string,
  prompt_name?: string
) {
  const supabase = createClient();

  let query = (supabase.from('deployments') as any)
    .select(`
      *,
      prompt:prompts(*),
      user:users!deployments_deployed_by_fkey(id,email,role)
    `)
    .eq('environment', environment)
    .order('deployed_at', { ascending: false })
    .limit(1);

  if (prompt_name) {
    // We need to join with prompts to filter by name
    // Since we can't do this directly in the query, we'll filter client-side
    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    const filtered = (data as any[])?.filter((d: any) => d.prompt?.name === prompt_name);
    return filtered && filtered.length > 0 ? filtered[0] : null;
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || null;
}

/**
 * Get deployment history for an environment
 */
export async function get_history(
  environment: string,
  user_id: string,
  params: { limit?: number; offset?: number; promptName?: string } = {}
) {
  const supabase = createClient();

  const { limit = 20, offset = 0, promptName } = params;

  const { data, error } = await (supabase.from('deployments') as any)
    .select(`
      *,
      prompt:prompts(*),
      user:users!deployments_deployed_by_fkey(id,email,role)
    `)
    .eq('environment', environment)
    .order('deployed_at', { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    throw new Error(error.message);
  }

  let items = (data || []) as any[];

  // Filter by prompt name if specified (client-side)
  if (promptName) {
    items = items.filter((d: any) => d.prompt?.name === promptName);
  }

  return items;
}
