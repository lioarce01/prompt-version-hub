/**
 * Experiments Query Keys Factory
 *
 * Centralized query keys for A/B testing experiment queries.
 * Follows TanStack Query best practices for key management.
 */

export const experiments_keys = {
  all: ['experiments'] as const,
  lists: () => [...experiments_keys.all, 'list'] as const,
  list: (include_public: boolean) =>
    [...experiments_keys.lists(), include_public] as const,
  details: () => [...experiments_keys.all, 'detail'] as const,
  detail: (prompt_name: string | null) =>
    [...experiments_keys.details(), prompt_name] as const,
  results: (experiment_name: string | null) =>
    [...experiments_keys.all, 'results', experiment_name] as const,
} as const;
