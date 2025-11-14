/**
 * Convenience Auth Hooks
 *
 * Drop-in replacement for the old AuthContext hooks.
 * Provides the same API but powered by TanStack Query.
 */

'use client';

import { use_auth_state } from './useAuthQuery';
import { use_login_mutation, use_register_mutation, use_logout_mutation } from './useAuthMutations';
import type { AuthUser } from '@/lib/api/auth';

/**
 * Main auth hook - drop-in replacement for old useAuth() from AuthContext
 */
export function useAuth() {
  const { user, isLoading, isAuthenticated } = use_auth_state();
  const loginMutation = use_login_mutation();
  const registerMutation = use_register_mutation();
  const logoutMutation = use_logout_mutation();

  return {
    user: user ?? null,
    isAuthenticated,
    isLoading,
    login: async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    register: async (email: string, password: string) => {
      await registerMutation.mutateAsync({ email, password });
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
  };
}

/**
 * Hook that returns just the current user
 */
export function useUser(): AuthUser | null {
  const { user } = use_auth_state();
  return user ?? null;
}

/**
 * Hook that returns just the user ID
 * Used by other query hooks to enable/disable queries
 */
export function useUserId(): string | null {
  const { user } = use_auth_state();
  return user?.id ?? null;
}

/**
 * Hook that returns just the authentication status
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = use_auth_state();
  return isAuthenticated;
}
