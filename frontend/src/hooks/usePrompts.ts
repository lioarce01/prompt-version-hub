/**
 * TanStack Query hooks for Prompts
 *
 * These hooks provide intelligent caching and automatic refetching
 * for prompt management throughout the application.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  list_prompts,
  create_prompt,
  get_active_prompt,
  get_version,
  list_versions,
  update_prompt,
  delete_prompt,
  rollback,
  clone_prompt,
  set_visibility,
  type ListPromptsParams,
} from "@/lib/api/prompts";
import { prompts_keys } from "@/lib/api/prompts-keys";
import { useUserId } from "@/hooks/auth/useAuth";

/**
 * Fetch all prompts with optional filtering and pagination
 *
 * @param params - Optional parameters for filtering, sorting, and pagination
 */
export function useGetPromptsQuery(params: ListPromptsParams = {}) {
  const userId = useUserId();

  return useQuery({
    queryKey: prompts_keys.list(params),
    queryFn: async () => {
      if (!userId) return null;
      return list_prompts(userId, params);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch prompts created by the current user
 *
 * @param params - Optional parameters for filtering, sorting, and pagination
 */
export function useGetMyPromptsQuery(params: ListPromptsParams = {}) {
  const userId = useUserId();

  return useQuery({
    queryKey: prompts_keys.list({ ...params, created_by: userId || undefined }),
    queryFn: async () => {
      if (!userId) return null;
      return list_prompts(userId, {
        ...params,
        created_by: userId,
      });
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a specific prompt by name and optional version
 *
 * If version is not provided, returns the active version
 *
 * @param name - The prompt name
 * @param version - Optional specific version number
 */
export function useGetPromptQuery(name: string, version?: number) {
  const userId = useUserId();

  return useQuery({
    queryKey: prompts_keys.detail(name, version),
    queryFn: async () => {
      if (!userId) return null;
      if (version !== undefined) {
        return get_version(name, version, userId);
      }
      return get_active_prompt(name, userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch all versions of a prompt
 *
 * @param name - The prompt name
 */
export function useGetVersionsQuery(name: string) {
  const userId = useUserId();

  return useQuery({
    queryKey: prompts_keys.versions(name),
    queryFn: async () => {
      if (!userId) return null;
      return list_versions(name, userId);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Alias for useGetPromptQuery with explicit version
 *
 * @param name - The prompt name
 * @param version - The version number
 */
export function useGetVersionQuery(name: string, version: number) {
  return useGetPromptQuery(name, version);
}

/**
 * Create a new prompt
 */
export function useCreatePromptMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: any) => {
      if (!userId) throw new Error("Not authenticated");
      return create_prompt(userId, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prompts_keys.all });
    },
  });
}

/**
 * Update an existing prompt (creates a new version)
 */
export function useUpdatePromptMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: any }) => {
      if (!userId) throw new Error("Not authenticated");
      return update_prompt(name, userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prompts_keys.all });
    },
  });
}

/**
 * Delete a prompt and all its versions with optimistic update
 */
export function useDeletePromptMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!userId) throw new Error("Not authenticated");
      return delete_prompt(name);
    },
    // Optimistic update: remove from cache immediately
    onMutate: async (deleted_name) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: prompts_keys.all });

      // Snapshot previous values for rollback
      const previous_prompts = queryClient.getQueryData(prompts_keys.all);

      // Optimistically update all prompts lists
      queryClient.setQueriesData({ queryKey: prompts_keys.all }, (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter((p: any) => p.name !== deleted_name),
          count: Math.max(0, (old.count || 0) - 1),
        };
      });

      return { previous_prompts };
    },
    onError: (_err, _deleted_name, context) => {
      // Rollback on error
      if (context?.previous_prompts) {
        queryClient.setQueryData(prompts_keys.all, context.previous_prompts);
      }
    },
    onSettled: () => {
      // Always refetch after mutation to ensure data consistency
      queryClient.invalidateQueries({ queryKey: prompts_keys.all });
    },
  });
}

/**
 * Rollback a prompt to a previous version
 */
export function useRollbackMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      version,
    }: {
      name: string;
      version: number;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      return rollback(name, version, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prompts_keys.all });
    },
  });
}

/**
 * Clone a prompt with a new name
 */
export function useClonePromptMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      newName,
    }: {
      name: string;
      newName?: string;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      return clone_prompt(name, userId, newName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prompts_keys.all });
    },
  });
}

/**
 * Update prompt visibility (public/private)
 */
export function useUpdateVisibilityMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      data,
    }: {
      name: string;
      data: { is_public: boolean };
    }) => {
      if (!userId) throw new Error("Not authenticated");
      return set_visibility(name, userId, data.is_public);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prompts_keys.all });
    },
  });
}
