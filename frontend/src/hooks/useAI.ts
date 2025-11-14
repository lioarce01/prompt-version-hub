/**
 * TanStack Query hooks for AI-powered features
 *
 * These hooks handle AI-powered prompt generation and test case generation
 */

import { useMutation } from "@tanstack/react-query";
import { testsService } from "@/lib/services/tests.service";
import { generate_prompt, type GeneratePromptParams } from "@/lib/api/ai";
import { useUserId } from "@/hooks/auth/useAuth";

/**
 * Generate a prompt using AI based on user requirements
 *
 * @returns Mutation hook for generating prompts
 */
export function useGeneratePromptMutation() {
  return useMutation({
    mutationFn: (params: GeneratePromptParams) => generate_prompt(params),
  });
}

/**
 * Generate test cases for a prompt using AI
 *
 * @returns Mutation hook for generating test cases
 */
export function useGenerateTestsMutation() {
  const userId = useUserId();

  return useMutation({
    mutationFn: async (params: { promptName: string; count: number }) => {
      if (!userId) throw new Error("Not authenticated");
      return testsService.generateTestCases(
        params.promptName,
        userId,
        params.count,
      );
    },
  });
}
