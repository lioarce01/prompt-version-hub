/**
 * TanStack Query Client Configuration
 *
 * This file configures the global QueryClient instance for the entire application.
 * It provides intelligent defaults to prevent skeleton flickering and optimize data fetching.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data remains fresh for 5 minutes - prevents unnecessary refetches
      staleTime: 5 * 60 * 1000,

      // Cache data for 10 minutes - keeps data available for quick navigation
      gcTime: 10 * 60 * 1000,

      // Disable refetch on window focus to prevent UI flashing
      refetchOnWindowFocus: false,

      // Retry failed requests once before giving up
      retry: 1,

      // Keep previous data while fetching new data (prevents skeleton flicker)
      placeholderData: (previousData: any) => previousData,
    },
    mutations: {
      // Retry mutations once in case of network issues
      retry: 1,
    },
  },
});
