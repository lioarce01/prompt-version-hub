/**
 * TanStack Query hooks for A/B Testing (Experiments)
 *
 * These hooks provide intelligent caching and automatic refetching
 * for experiments throughout the application.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  get_policies,
  get_policy_by_name,
  set_policy,
  delete_policy,
  assign,
  get_experiment_stats,
  type SetPolicyParams,
  type AssignVariantParams,
} from "@/lib/api/experiments";
import { experiments_keys } from "@/lib/api/experiments-keys";
import { useUserId } from "@/hooks/auth/useAuth";

/**
 * Fetch all experiments for the current user
 *
 * @param includePublic - Whether to include public experiments (default: true)
 */
export function useGetExperimentsQuery(includePublic = true) {
  const userId = useUserId();

  return useQuery({
    queryKey: experiments_keys.list(includePublic),
    queryFn: async () => {
      if (!userId) return null;
      return get_policies(userId, includePublic);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a specific experiment by prompt name
 *
 * @param promptName - The name of the prompt/experiment to fetch
 */
export function useGetExperimentQuery(promptName: string | null) {
  const userId = useUserId();

  return useQuery({
    queryKey: experiments_keys.detail(promptName),
    queryFn: async () => {
      if (!userId || !promptName) return null;
      return get_policy_by_name(promptName, userId);
    },
    enabled: !!userId && !!promptName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch experiment results/statistics
 *
 * @param experimentName - The name of the experiment to fetch results for
 */
export function useGetExperimentResultsQuery(experimentName: string | null) {
  const userId = useUserId();

  return useQuery({
    queryKey: experiments_keys.results(experimentName),
    queryFn: async () => {
      if (!userId || !experimentName) return null;
      return get_experiment_stats(experimentName, userId);
    },
    enabled: !!userId && !!experimentName,
    staleTime: 2 * 60 * 1000, // 2 minutes (stats change more frequently)
  });
}

/**
 * Alias for useGetExperimentResultsQuery
 */
export const useGetExperimentStatsQuery = useGetExperimentResultsQuery;

/**
 * Create a new experiment
 */
export function useCreateExperimentMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SetPolicyParams) => {
      if (!userId) throw new Error("Not authenticated");
      return set_policy(userId, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experiments_keys.all });
    },
  });
}

/**
 * Update an existing experiment with optimistic update
 */
export function useUpdateExperimentMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SetPolicyParams) => {
      if (!userId) throw new Error("Not authenticated");
      return set_policy(userId, params);
    },
    // Optimistic update: update experiment in cache immediately
    onMutate: async (updated_params) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: experiments_keys.all });

      // Snapshot previous values for rollback
      const previous_experiments = queryClient.getQueryData(experiments_keys.lists());
      const previous_detail = queryClient.getQueryData(
        experiments_keys.detail(updated_params.prompt_name)
      );

      // Optimistically update experiment in list
      queryClient.setQueriesData(
        { queryKey: experiments_keys.lists() },
        (old: any) => {
          if (!old) return old;
          return old.map((exp: any) =>
            exp.prompt_name === updated_params.prompt_name
              ? { ...exp, weights: updated_params.weights, is_public: updated_params.is_public }
              : exp
          );
        }
      );

      // Optimistically update experiment detail
      queryClient.setQueryData(
        experiments_keys.detail(updated_params.prompt_name),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            weights: updated_params.weights,
            is_public: updated_params.is_public,
          };
        }
      );

      return { previous_experiments, previous_detail };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previous_experiments) {
        queryClient.setQueryData(
          experiments_keys.lists(),
          context.previous_experiments
        );
      }
      if (context?.previous_detail) {
        queryClient.setQueryData(
          experiments_keys.detail(variables.prompt_name),
          context.previous_detail
        );
      }
    },
    onSettled: () => {
      // Always refetch after mutation to ensure data consistency
      queryClient.invalidateQueries({ queryKey: experiments_keys.all });
    },
  });
}

/**
 * Delete an experiment
 */
export function useDeleteExperimentMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: number) => {
      if (!userId) throw new Error("Not authenticated");
      return delete_policy(policyId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experiments_keys.all });
    },
  });
}

/**
 * Assign a user to a variant in an experiment
 */
export function useAssignVariantMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AssignVariantParams) => {
      if (!userId) throw new Error("Not authenticated");
      return assign(userId, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experiments_keys.all });
    },
  });
}
