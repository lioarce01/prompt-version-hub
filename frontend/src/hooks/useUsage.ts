/**
 * TanStack Query hooks for Usage Tracking
 *
 * These hooks handle usage event recording and analytics
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  usageService,
  type RecordUsageParams,
} from "@/lib/services/usage.service";

/**
 * Get analytics by version for a prompt
 *
 * @param promptName - The name of the prompt
 * @param minVersion - Optional minimum version
 * @param maxVersion - Optional maximum version
 */
export function useGetAnalyticsByVersionQuery(
  promptName: string | null,
  minVersion?: number,
  maxVersion?: number,
) {
  return useQuery({
    queryKey: ["usage", "analytics", promptName, minVersion, maxVersion],
    queryFn: async () => {
      if (!promptName) return null;
      return usageService.getAnalyticsByVersion(
        promptName,
        minVersion,
        maxVersion,
      );
    },
    enabled: !!promptName,
  });
}

/**
 * Record a usage event
 *
 * This mutation does NOT invalidate any queries as usage events
 * are append-only and analytics are typically eventually consistent
 */
export function useRecordUsageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RecordUsageParams) => usageService.record(params),
    onSuccess: () => {
      // Invalidate analytics queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ["usage", "analytics"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
  });
}
