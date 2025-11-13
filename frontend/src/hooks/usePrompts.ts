/**
 * TanStack Query hooks for Prompts
 *
 * These hooks provide intelligent caching and automatic refetching
 * for prompt management throughout the application.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  promptsService,
  type ListPromptsParams,
} from "@/lib/services/prompts.service";
import { useUserId } from "./useAuth";

/**
 * Fetch all prompts with optional filtering and pagination
 *
 * @param params - Optional parameters for filtering, sorting, and pagination
 */
export function useGetPromptsQuery(params: ListPromptsParams = {}) {
  const userId = useUserId();

  return useQuery({
    queryKey: ["prompts", "list", params],
    queryFn: async () => {
      if (!userId) return null;
      return promptsService.listPrompts(userId, params);
    },
    enabled: !!userId,
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
    queryKey: ["prompts", "my-prompts", params],
    queryFn: async () => {
      if (!userId) return null;
      return promptsService.listPrompts(userId, {
        ...params,
        created_by: userId,
      });
    },
    enabled: !!userId,
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
    queryKey: ["prompts", "detail", name, version],
    queryFn: async () => {
      if (!userId) return null;
      if (version !== undefined) {
        return promptsService.getVersion(name, version, userId);
      }
      return promptsService.getActivePrompt(name, userId);
    },
    enabled: !!userId,
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
    queryKey: ["prompts", "versions", name],
    queryFn: async () => {
      if (!userId) return null;
      return promptsService.listVersions(name, userId);
    },
    enabled: !!userId,
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
      return promptsService.createPrompt(userId, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
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
      return promptsService.updatePrompt(name, userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
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
      return promptsService.deletePrompt(name);
    },
    // Optimistic update: remove from cache immediately
    onMutate: async (deletedName) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["prompts"] });

      // Snapshot previous values for rollback
      const previousPrompts = queryClient.getQueryData(["prompts"]);
      const previousMyPrompts = queryClient.getQueryData(["prompts", "my"]);

      // Optimistically update all prompts lists
      queryClient.setQueriesData({ queryKey: ["prompts"] }, (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter((p: any) => p.name !== deletedName),
          count: Math.max(0, (old.count || 0) - 1),
        };
      });

      return { previousPrompts, previousMyPrompts };
    },
    onError: (_err, _deletedName, context) => {
      // Rollback on error
      if (context?.previousPrompts) {
        queryClient.setQueryData(["prompts"], context.previousPrompts);
      }
      if (context?.previousMyPrompts) {
        queryClient.setQueryData(["prompts", "my"], context.previousMyPrompts);
      }
    },
    onSettled: () => {
      // Always refetch after mutation to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
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
      return promptsService.rollback(name, version, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
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
      return promptsService.clonePrompt(name, userId, newName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
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
      return promptsService.setVisibility(name, userId, data.is_public);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });
}
