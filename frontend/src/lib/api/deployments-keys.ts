/**
 * Deployments Query Keys Factory
 *
 * Centralized query keys for deployment-related queries.
 * Follows TanStack Query best practices for key management.
 */

export const deployments_keys = {
  all: ['deployments'] as const,
  history: (
    environment: string | null,
    limit?: number,
    offset?: number,
    prompt_name?: string
  ) => [...deployments_keys.all, environment, 'history', limit, offset, prompt_name] as const,
  current: (environment: string | null, prompt_name?: string) =>
    [...deployments_keys.all, environment, 'current', prompt_name] as const,
  all_history: (limit?: number, offset?: number, prompt_name?: string) =>
    [...deployments_keys.all, 'all-history', limit, offset, prompt_name] as const,
} as const;
