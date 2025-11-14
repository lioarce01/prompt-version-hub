/**
 * Auth Query Keys Factory
 *
 * Centralized query keys for auth-related queries.
 * Follows TanStack Query best practices for key management.
 */

export const auth_keys = {
  all: ['auth'] as const,
  session: () => [...auth_keys.all, 'session'] as const,
  user: (userId?: string) => [...auth_keys.all, 'user', userId] as const,
} as const;
