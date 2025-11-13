/**
 * TanStack Query hooks for Test Suites
 *
 * These hooks handle test case management and execution
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  testsService,
  type CreateTestCaseParams,
  type UpdateTestCaseParams,
  type RunTestsParams,
} from "@/lib/services/tests.service";
import { useUserId } from "./useAuth";
import { useGenerateTestsMutation as useGenerateTestsMutationFromAI } from "./useAI";

/**
 * Fetch test suite for a prompt
 *
 * @param promptName - Name of the prompt to fetch tests for
 */
export function useGetTestSuitesQuery(promptName: string | null) {
  const userId = useUserId();

  return useQuery({
    queryKey: ["tests", "suite", promptName],
    queryFn: async () => {
      if (!promptName || !userId) return null;
      return testsService.getTestSuite(promptName, userId);
    },
    enabled: !!promptName && !!userId,
  });
}

/**
 * Fetch test execution results for a prompt
 *
 * @param promptName - Name of the prompt to fetch results for
 */
export function useGetTestResultsQuery(promptName: string | null) {
  const userId = useUserId();

  return useQuery({
    queryKey: ["tests", "results", promptName],
    queryFn: async () => {
      if (!promptName || !userId) return null;
      const suiteData = await testsService.getTestSuite(promptName, userId);
      // Return only the test runs
      return suiteData.runs;
    },
    enabled: !!promptName && !!userId,
  });
}

/**
 * Create a new test case for a prompt with optimistic update
 */
export function useCreateTestCaseMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      promptName: string;
      testCase: CreateTestCaseParams;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      return testsService.createTestCase(
        params.promptName,
        userId,
        params.testCase,
      );
    },
    // Optimistic update: add test case to cache immediately
    onMutate: async (variables) => {
      const { promptName, testCase } = variables;

      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: ["tests", "suite", promptName],
      });

      // Snapshot previous value for rollback
      const previousSuite = queryClient.getQueryData([
        "tests",
        "suite",
        promptName,
      ]);

      // Optimistically add test case to suite
      queryClient.setQueryData(
        ["tests", "suite", promptName],
        (old: any) => {
          if (!old) return old;

          // Create optimistic test case with temporary ID
          const optimisticCase = {
            id: -Date.now(), // Temporary negative ID
            ...testCase,
            created_at: new Date().toISOString(),
            auto_generated: false,
          };

          return {
            ...old,
            cases: [...(old.cases || []), optimisticCase],
          };
        }
      );

      return { previousSuite };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousSuite) {
        queryClient.setQueryData(
          ["tests", "suite", variables.promptName],
          context.previousSuite
        );
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate test suite to refetch with real data
      queryClient.invalidateQueries({
        queryKey: ["tests", "suite", variables.promptName],
      });
    },
  });
}

/**
 * Run tests for a prompt
 */
export function useRunTestsMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      promptName: string;
      testParams: RunTestsParams;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      return testsService.runTests(
        params.promptName,
        userId,
        params.testParams,
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate test suite and results to show new execution
      queryClient.invalidateQueries({
        queryKey: ["tests", "suite", variables.promptName],
      });
      queryClient.invalidateQueries({
        queryKey: ["tests", "results", variables.promptName],
      });
    },
  });
}

/**
 * Update an existing test case
 */
export function useUpdateTestCaseMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      caseId: number;
      updates: UpdateTestCaseParams;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      return testsService.updateTestCase(params.caseId, userId, params.updates);
    },
    onSuccess: () => {
      // Invalidate all test suites to refresh
      queryClient.invalidateQueries({ queryKey: ["tests", "suite"] });
    },
  });
}

/**
 * Delete a test case
 */
export function useDeleteTestCaseMutation() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: number) => {
      if (!userId) throw new Error("Not authenticated");
      await testsService.deleteTestCase(caseId, userId);
    },
    onSuccess: () => {
      // Invalidate all test suites to refresh
      queryClient.invalidateQueries({ queryKey: ["tests", "suite"] });
    },
  });
}

// Aliases for compatibility
export const useGetTestSuiteQuery = useGetTestSuitesQuery;
export const useGenerateTestCasesMutation = useGenerateTestsMutationFromAI;
