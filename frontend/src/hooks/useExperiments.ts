/**
 * TanStack Query hooks for A/B Testing (Experiments)
 *
 * These hooks provide intelligent caching and automatic refetching
 * for experiments throughout the application.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  abService,
  type SetPolicyParams,
  type AssignVariantParams,
} from "@/lib/services/ab.service";
import { useUserId } from "./useAuth";

/**
 * Fetch all experiments for the current user
 *
 * @param includePublic - Whether to include public experiments (default: true)
 */
export function useGetExperimentsQuery(includePublic = true) {
  const userId = useUserId();

  return useQuery({
    queryKey: ["experiments", "list", includePublic],
    queryFn: async () => {
      if (!userId) return null;
      return abService.getPolicies(userId, includePublic);
    },
    enabled: !!userId,
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
    queryKey: ["experiments", "detail", promptName],
    queryFn: async () => {
      if (!userId || !promptName) return null;
      return abService.getPolicyByName(promptName, userId);
    },
    enabled: !!userId && !!promptName,
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
    queryKey: ["experiments", "results", experimentName],
    queryFn: async () => {
      if (!userId || !experimentName) return null;
      return abService.getExperimentStats(experimentName, userId);
    },
    enabled: !!userId && !!experimentName,
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
      return abService.setPolicy(userId, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
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
      return abService.setPolicy(userId, params);
    },
    // Optimistic update: update experiment in cache immediately
    onMutate: async (updatedParams) => {
      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["experiments"] });

      // Snapshot previous values for rollback
      const previousExperiments = queryClient.getQueryData(["experiments", "list"]);
      const previousDetail = queryClient.getQueryData([
        "experiments",
        "detail",
        updatedParams.prompt_name,
      ]);

      // Optimistically update experiment in list
      queryClient.setQueriesData(
        { queryKey: ["experiments", "list"] },
        (old: any) => {
          if (!old) return old;
          return old.map((exp: any) =>
            exp.prompt_name === updatedParams.prompt_name
              ? { ...exp, weights: updatedParams.weights, is_public: updatedParams.is_public }
              : exp
          );
        }
      );

      // Optimistically update experiment detail
      queryClient.setQueryData(
        ["experiments", "detail", updatedParams.prompt_name],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            weights: updatedParams.weights,
            is_public: updatedParams.is_public,
          };
        }
      );

      return { previousExperiments, previousDetail };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousExperiments) {
        queryClient.setQueryData(
          ["experiments", "list"],
          context.previousExperiments
        );
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(
          ["experiments", "detail", variables.prompt_name],
          context.previousDetail
        );
      }
    },
    onSettled: () => {
      // Always refetch after mutation to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
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
      return abService.deletePolicy(policyId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
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
      return abService.assign(userId, params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
    },
  });
}
