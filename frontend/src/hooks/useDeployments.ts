/**
 * TanStack Query hooks for Deployments
 *
 * These hooks provide intelligent caching and automatic refetching
 * for deployment history and management throughout the application.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deploymentsService,
  type CreateDeploymentParams,
} from "@/lib/services/deployments.service";
import { useUserId } from "./useAuth";

interface GetHistoryParams {
  limit?: number;
  offset?: number;
  promptName?: string;
}

/**
 * Fetch deployment history for a specific environment
 *
 * @param environment - The environment to fetch history for (dev, staging, production)
 * @param params - Optional parameters for filtering and pagination
 */
export function useGetDeploymentsHistoryQuery(
  environment: string | null,
  params: GetHistoryParams = {},
) {
  const userId = useUserId();

  return useQuery({
    queryKey: [
      "deployments",
      environment,
      "history",
      params.limit,
      params.offset,
      params.promptName,
    ],
    queryFn: async () => {
      if (!userId || !environment) return null;
      const items = await deploymentsService.getHistory(
        environment,
        userId,
        params,
      );
      return {
        items,
        count: items.length,
        has_next: false,
        has_prev: false,
        limit: params.limit || 30,
        offset: params.offset || 0,
      };
    },
    enabled: !!userId && !!environment,
  });
}

/**
 * Fetch the current active deployment for an environment
 *
 * @param environment - The environment to fetch the current deployment for
 * @param promptName - Optional prompt name to filter by
 */
export function useGetCurrentDeploymentQuery(
  environment: string | null,
  promptName?: string,
) {
  const userId = useUserId();

  return useQuery({
    queryKey: ["deployments", environment, "current", promptName],
    queryFn: async () => {
      if (!userId || !environment) return null;
      return deploymentsService.getCurrentDeployment(
        environment,
        userId,
        promptName,
      );
    },
    enabled: !!userId && !!environment,
  });
}

/**
 * Fetch deployment history across all environments
 *
 * Combines deployments from dev, staging, and production
 * and sorts them by deployment date
 *
 * @param params - Optional parameters for filtering and pagination
 */
export function useGetAllDeploymentHistoryQuery(params: GetHistoryParams = {}) {
  const userId = useUserId();

  return useQuery({
    queryKey: [
      "deployments",
      "all-history",
      params.limit,
      params.offset,
      params.promptName,
    ],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch from all three environments in parallel
      const [devData, stagingData, productionData] = await Promise.all([
        deploymentsService.getHistory("dev", userId, params),
        deploymentsService.getHistory("staging", userId, params),
        deploymentsService.getHistory("production", userId, params),
      ]);

      // Combine and sort by deployed_at
      const combined = [...devData, ...stagingData, ...productionData].sort(
        (a, b) =>
          new Date(b.deployed_at).getTime() - new Date(a.deployed_at).getTime(),
      );

      return {
        items: combined,
        count: combined.length,
        has_next: false,
        has_prev: false,
        limit: params.limit || 100,
        offset: params.offset || 0,
      };
    },
    enabled: !!userId,
  });
}

/**
 * Create a new deployment
 */
export function useCreateDeploymentMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateDeploymentParams) => {
      if (!userId) throw new Error("Not authenticated");
      return deploymentsService.createDeployment(userId, params);
    },
    onSuccess: (data, variables) => {
      // Invalidate all deployment queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
    },
  });
}
