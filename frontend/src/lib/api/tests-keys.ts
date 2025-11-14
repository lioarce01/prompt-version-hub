/**
 * Tests Query Keys Factory
 *
 * Centralized query keys for test suite queries.
 * Follows TanStack Query best practices for key management.
 */

export const tests_keys = {
  all: ['tests'] as const,
  suites: () => [...tests_keys.all, 'suite'] as const,
  suite: (prompt_name: string | null) =>
    [...tests_keys.suites(), prompt_name] as const,
  results: (prompt_name: string | null) =>
    [...tests_keys.all, 'results', prompt_name] as const,
} as const;
