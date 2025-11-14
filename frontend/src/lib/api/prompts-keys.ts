/**
 * Prompts Query Keys Factory
 *
 * Centralized query keys for prompt-related queries.
 * Follows TanStack Query best practices for key management.
 */

import type { ListPromptsParams } from './prompts';

export const prompts_keys = {
  all: ['prompts'] as const,
  lists: () => [...prompts_keys.all, 'list'] as const,
  list: (params: ListPromptsParams) => [...prompts_keys.lists(), params] as const,
  details: () => [...prompts_keys.all, 'detail'] as const,
  detail: (name: string, version?: number) =>
    version !== undefined
      ? [...prompts_keys.details(), name, version] as const
      : [...prompts_keys.details(), name] as const,
  versions: (name: string) => [...prompts_keys.all, 'versions', name] as const,
} as const;
