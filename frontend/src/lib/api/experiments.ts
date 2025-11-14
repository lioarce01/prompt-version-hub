/**
 * Experiments (A/B Testing) API Functions
 *
 * Functional API for A/B testing experiment operations.
 * Designed for use with TanStack Query.
 */

import { createClient } from '@/utils/supabase/client';
import type { Database } from '../supabase/types';

type ABPolicy = Database['public']['Tables']['ab_policies']['Row'];
type ABAssignment = Database['public']['Tables']['ab_assignments']['Row'];

export interface SetPolicyParams {
  prompt_name: string;
  weights: Record<number, number>; // version -> weight
  is_public?: boolean;
}

export interface AssignVariantParams {
  experiment_name: string;
  prompt_name: string;
  user_id: string;
}

/**
 * Create or update an A/B testing policy
 */
export async function set_policy(
  user_id: string,
  params: SetPolicyParams
): Promise<ABPolicy> {
  const supabase = createClient();

  const { prompt_name, weights, is_public = false } = params;

  // Validate weights (should sum to ~1.0 or 100)
  const total_weight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(total_weight - 1.0) > 0.01 && Math.abs(total_weight - 100) > 1) {
    throw new Error('Weights must sum to 1.0 or 100');
  }

  // Check if policy already exists
  const { data: existing } = await (supabase.from('ab_policies') as any)
    .select('*')
    .eq('prompt_name', prompt_name)
    .eq('created_by', user_id)
    .single();

  if (existing) {
    // Update existing policy
    const { data, error } = await (supabase.from('ab_policies') as any)
      .update({
        weights: weights as any,
        is_public,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } else {
    // Create new policy
    const { data, error } = await (supabase.from('ab_policies') as any)
      .insert({
        prompt_name,
        weights: weights as any,
        created_by: user_id,
        is_public,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

/**
 * Get all policies accessible by the user
 */
export async function get_policies(
  user_id: string,
  include_public = true
): Promise<any[]> {
  const supabase = createClient();

  let query = (supabase.from('ab_policies') as any).select('*');

  if (include_public) {
    query = query.or(`created_by.eq.${user_id},is_public.eq.true`);
  } else {
    query = query.eq('created_by', user_id);
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Add computed is_owner field
  return (data || []).map((policy: any) => ({
    ...policy,
    is_owner: policy.created_by === user_id,
  }));
}

/**
 * Get a specific policy by prompt name
 */
export async function get_policy_by_name(
  prompt_name: string,
  user_id: string
): Promise<ABPolicy | null> {
  const supabase = createClient();

  const { data, error } = await (supabase.from('ab_policies') as any)
    .select('*')
    .eq('prompt_name', prompt_name)
    .or(`created_by.eq.${user_id},is_public.eq.true`)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || null;
}

/**
 * Delete a policy
 */
export async function delete_policy(
  policy_id: number,
  user_id: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await (supabase.from('ab_policies') as any)
    .delete()
    .eq('id', policy_id)
    .eq('created_by', user_id);

  if (error) {
    return false;
  }

  return true;
}

/**
 * Assign a variant to a user based on the policy
 */
export async function assign(
  current_user_id: string,
  params: AssignVariantParams
): Promise<number> {
  const supabase = createClient();

  const { experiment_name, prompt_name, user_id } = params;

  // Check if assignment already exists
  const { data: existing } = await (supabase.from('ab_assignments') as any)
    .select('*')
    .eq('experiment_name', experiment_name)
    .eq('prompt_name', prompt_name)
    .eq('user_id', user_id)
    .single();

  if (existing) {
    return existing.version;
  }

  // Get the policy
  const policy = await get_policy_by_name(prompt_name, current_user_id);
  if (!policy) {
    throw new Error('Policy not found');
  }

  // Randomly assign a version based on weights
  const weights = policy.weights as Record<string, number>;
  const versions = Object.keys(weights).map(Number);
  const weight_values = Object.values(weights);

  const total_weight = weight_values.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total_weight;

  let selected_version = versions[0];
  for (let i = 0; i < versions.length; i++) {
    random -= weight_values[i];
    if (random <= 0) {
      selected_version = versions[i];
      break;
    }
  }

  // Create the assignment
  const { data, error } = await (supabase.from('ab_assignments') as any)
    .insert({
      experiment_name,
      prompt_name,
      user_id,
      version: selected_version,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.version;
}

/**
 * Get experiment statistics
 */
export async function get_experiment_stats(
  experiment_name: string,
  user_id: string
) {
  const supabase = createClient();

  // Get all assignments for this experiment
  const { data: assignments, error: assignments_error } = await (
    supabase.from('ab_assignments') as any
  )
    .select('*')
    .eq('experiment_name', experiment_name);

  if (assignments_error) {
    throw new Error(assignments_error.message);
  }

  // Group by version and count
  const version_counts = (assignments || []).reduce(
    (acc: Record<number, number>, a: ABAssignment) => {
      acc[a.version] = (acc[a.version] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  const total_assignments = assignments?.length || 0;

  return {
    experiment_name,
    total_assignments,
    version_distribution: version_counts,
  };
}
