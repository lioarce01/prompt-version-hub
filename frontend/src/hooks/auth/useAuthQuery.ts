/**
 * Core Auth Query Hook
 *
 * Main TanStack Query hook for authentication state management.
 * Replaces AuthContext with query-based approach.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { auth_keys } from '@/lib/api/auth-keys';
import { get_current_user, type AuthUser } from '@/lib/api/auth';

export function use_auth_query() {
  return useQuery({
    queryKey: auth_keys.session(),
    queryFn: get_current_user,
    staleTime: 30 * 1000, // 30 seconds - shorter for faster updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff
    refetchOnMount: true, // Always check on mount
    refetchOnWindowFocus: true, // Refetch on window focus to detect session changes
    refetchOnReconnect: true, // Refetch on reconnect to revalidate session
  });
}

export type UseAuthQueryResult = {
  user: AuthUser | null | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
};

/**
 * Hook that returns formatted auth state
 */
export function use_auth_state(): UseAuthQueryResult {
  const { data: user, isPending, error } = use_auth_query();

  return {
    user: user ?? null,
    isLoading: isPending,
    isAuthenticated: !!user,
    error: error as Error | null,
  };
}
