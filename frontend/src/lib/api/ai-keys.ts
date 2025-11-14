/**
 * AI Query Keys Factory
 *
 * Centralized mutation keys for AI-related operations.
 * Follows TanStack Query best practices for key management.
 */

export const ai_keys = {
  all: ['ai'] as const,
  generate_prompt: () => [...ai_keys.all, 'generate-prompt'] as const,
  generate_tests: () => [...ai_keys.all, 'generate-tests'] as const,
} as const;
