/**
 * Prompts API Functions
 *
 * Functional API for prompt management operations.
 * Designed for use with TanStack Query.
 */

import { createClient } from '@/utils/supabase/client';
import type { Database } from '../supabase/types';

type Prompt = Database['public']['Tables']['prompts']['Row'];

export interface CreatePromptParams {
  name: string;
  template: string;
  variables?: string[];
  is_public?: boolean;
}

export interface UpdatePromptParams {
  template?: string;
  variables?: string[];
  is_public?: boolean;
}

export interface ListPromptsParams {
  q?: string;
  active?: boolean;
  created_by?: string;
  latest_only?: boolean;
  sort_by?: 'created_at' | 'version' | 'name';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  visibility?: 'all' | 'public' | 'private' | 'owned';
  owned?: boolean;
}

/**
 * List prompts with filters
 */
export async function list_prompts(
  user_id: string,
  params: ListPromptsParams = {}
) {
  const supabase = createClient();

  const {
    q,
    active,
    created_by,
    latest_only = false,
    sort_by = 'created_at',
    order = 'desc',
    limit = 20,
    offset = 0,
    visibility = 'all',
    owned = false,
  } = params;

  let query = supabase
    .from('prompts')
    .select('*, author:users!prompts_created_by_fkey(id, email, role)', {
      count: 'exact',
    });

  // Apply visibility filter
  if (visibility === 'public') {
    query = query.eq('is_public', true);
  } else if (visibility === 'private') {
    query = query.eq('is_public', false).eq('created_by', user_id);
  } else if (visibility === 'owned' || owned) {
    query = query.eq('created_by', user_id);
  } else {
    // 'all' - show public OR owned
    query = query.or(`is_public.eq.true,created_by.eq.${user_id}`);
  }

  // Apply other filters
  if (q) {
    query = query.ilike('name', `%${q}%`);
  }
  if (active !== undefined) {
    query = query.eq('active', active);
  }
  if (created_by) {
    query = query.eq('created_by', created_by);
  }

  // Apply sorting
  query = query.order(sort_by, { ascending: order === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  // If latest_only, filter to get only the latest version of each prompt
  let items = (data || []) as any[];
  if (latest_only && items.length > 0) {
    const latest_versions = new Map<string, any>();
    for (const item of items) {
      const existing = latest_versions.get(item.name);
      if (!existing || item.version > existing.version) {
        latest_versions.set(item.name, item);
      }
    }
    items = Array.from(latest_versions.values());
  }

  const total = count || 0;
  const has_next = offset + limit < total;

  return {
    items,
    count: total,
    limit,
    offset,
    has_next,
  };
}

/**
 * Create a new prompt
 */
export async function create_prompt(
  user_id: string,
  params: CreatePromptParams
): Promise<Prompt> {
  const supabase = createClient();

  const { name, template, variables = [], is_public = false } = params;

  // Get the next version number for this prompt name
  const { data: existing_prompts } = await supabase
    .from('prompts')
    .select('version')
    .eq('name', name)
    .order('version', { ascending: false })
    .limit(1);

  const next_version =
    existing_prompts && (existing_prompts as any[]).length > 0
      ? (existing_prompts as any[])[0].version + 1
      : 1;

  // Deactivate all previous versions
  if (next_version > 1) {
    await (supabase.from('prompts') as any).update({ active: false }).eq('name', name);
  }

  // Create the new prompt
  const { data, error } = await (supabase.from('prompts') as any)
    .insert({
      name,
      template,
      variables: variables as any,
      version: next_version,
      created_by: user_id,
      active: true,
      is_public,
    })
    .select('*, author:users!prompts_created_by_fkey(id, email, role)')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get active version of a prompt by name
 */
export async function get_active_prompt(
  name: string,
  user_id: string
): Promise<Prompt | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('prompts')
    .select('*, author:users!prompts_created_by_fkey(id, email, role)')
    .eq('name', name)
    .eq('active', true)
    .or(`is_public.eq.true,created_by.eq.${user_id}`)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || null;
}

/**
 * Get specific version of a prompt
 */
export async function get_version(
  name: string,
  version: number,
  user_id: string
): Promise<Prompt | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('prompts')
    .select('*, author:users!prompts_created_by_fkey(id, email, role)')
    .eq('name', name)
    .eq('version', version)
    .or(`is_public.eq.true,created_by.eq.${user_id}`)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data || null;
}

/**
 * List all versions of a prompt
 */
export async function list_versions(
  name: string,
  user_id: string,
  params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    created_by?: string;
  } = {}
) {
  const supabase = createClient();

  const { limit = 20, offset = 0, active, created_by } = params;

  let query = supabase
    .from('prompts')
    .select('*, author:users!prompts_created_by_fkey(id, email, role)', {
      count: 'exact',
    })
    .eq('name', name)
    .or(`is_public.eq.true,created_by.eq.${user_id}`);

  if (active !== undefined) {
    query = query.eq('active', active);
  }
  if (created_by) {
    query = query.eq('created_by', created_by);
  }

  query = query
    .order('version', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const items = data || [];
  const total = count || 0;
  const has_next = offset + limit < total;

  return {
    items,
    count: total,
    limit,
    offset,
    has_next,
  };
}

/**
 * Update a prompt (creates a new version)
 */
export async function update_prompt(
  name: string,
  user_id: string,
  params: UpdatePromptParams
): Promise<Prompt> {
  // Get the current active version
  const current_prompt = await get_active_prompt(name, user_id);
  if (!current_prompt) {
    throw new Error('Prompt not found');
  }

  // Check ownership
  if (current_prompt.created_by !== user_id) {
    throw new Error('You do not have permission to update this prompt');
  }

  // Create a new version with the updates
  const {
    template = current_prompt.template,
    variables = current_prompt.variables as string[],
    is_public,
  } = params;

  return create_prompt(user_id, {
    name,
    template,
    variables,
    is_public:
      is_public !== undefined ? is_public : current_prompt.is_public,
  });
}

/**
 * Rollback to a specific version
 */
export async function rollback(
  name: string,
  version: number,
  user_id: string
): Promise<Prompt> {
  // Get the version to rollback to
  const target_version = await get_version(name, version, user_id);
  if (!target_version) {
    throw new Error('Version not found');
  }

  // Check ownership
  if (target_version.created_by !== user_id) {
    throw new Error('You do not have permission to rollback this prompt');
  }

  // Create a new version with the same template and variables
  return create_prompt(user_id, {
    name,
    template: target_version.template,
    variables: target_version.variables as string[],
    is_public: target_version.is_public,
  });
}

/**
 * Delete all versions of a prompt (admin only)
 */
export async function delete_prompt(name: string): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('prompts')
    .delete()
    .eq('name', name)
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data?.length || 0;
}

/**
 * Set visibility (public/private) for all versions of a prompt
 */
export async function set_visibility(
  name: string,
  user_id: string,
  is_public: boolean
): Promise<Prompt> {
  const supabase = createClient();

  // Check ownership
  const { data: prompts } = await supabase
    .from('prompts')
    .select('*')
    .eq('name', name)
    .eq('created_by', user_id)
    .limit(1);

  if (!prompts || prompts.length === 0) {
    throw new Error('Prompt not found or you do not have permission');
  }

  // Update all versions
  await (supabase.from('prompts') as any)
    .update({ is_public })
    .eq('name', name)
    .eq('created_by', user_id);

  // Return the active version
  const active_prompt = await get_active_prompt(name, user_id);
  if (!active_prompt) {
    throw new Error('Failed to update prompt visibility');
  }

  return active_prompt;
}

/**
 * Clone a prompt
 */
export async function clone_prompt(
  name: string,
  user_id: string,
  new_name?: string
): Promise<Prompt> {
  const source_prompt = await get_active_prompt(name, user_id);
  if (!source_prompt) {
    throw new Error('Source prompt not found');
  }

  const clone_name = new_name || `${name}_copy`;

  return create_prompt(user_id, {
    name: clone_name,
    template: source_prompt.template,
    variables: source_prompt.variables as string[],
    is_public: false, // Clones are private by default
  });
}

/**
 * Get diff between two versions (client-side implementation)
 */
export async function get_diff(
  name: string,
  from_version: number,
  to_version: number,
  user_id: string
): Promise<string> {
  const [from, to] = await Promise.all([
    get_version(name, from_version, user_id),
    get_version(name, to_version, user_id),
  ]);

  if (!from || !to) {
    throw new Error('One or both versions not found');
  }

  // Simple diff implementation (you can use a library like diff for better results)
  const from_lines = from.template.split('\n');
  const to_lines = to.template.split('\n');

  let diff = '';
  const max_lines = Math.max(from_lines.length, to_lines.length);

  for (let i = 0; i < max_lines; i++) {
    const from_line = from_lines[i] || '';
    const to_line = to_lines[i] || '';

    if (from_line !== to_line) {
      if (from_line) diff += `- ${from_line}\n`;
      if (to_line) diff += `+ ${to_line}\n`;
    } else {
      diff += `  ${from_line}\n`;
    }
  }

  return diff;
}
