/**
 * TanStack Query hooks for Test Suites
 *
 * These hooks handle test case management and execution
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  get_test_suite,
  create_test_case,
  update_test_case,
  delete_test_case,
  generate_test_cases,
  run_tests,
  type CreateTestCaseParams,
  type UpdateTestCaseParams,
  type RunTestsParams,
} from "@/lib/api/tests";
import { tests_keys } from "@/lib/api/tests-keys";
import { useUserId } from "@/hooks/auth/useAuth";
import { useGenerateTestsMutation as useGenerateTestsMutationFromAI } from "./useAI";

/**
 * Fetch test suite for a prompt
 *
 * @param promptName - Name of the prompt to fetch tests for
 */
export function useGetTestSuitesQuery(promptName: string | null) {
  const userId = useUserId();

  return useQuery({
    queryKey: tests_keys.suite(promptName),
    queryFn: async () => {
      if (!promptName || !userId) return null;
      return get_test_suite(promptName, userId);
    },
    enabled: !!promptName && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    queryKey: tests_keys.results(promptName),
    queryFn: async () => {
      if (!promptName || !userId) return null;
      const suite_data = await get_test_suite(promptName, userId);
      // Return only the test runs
      return suite_data.runs;
    },
    enabled: !!promptName && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute (test results update frequently)
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
      return create_test_case(params.promptName, userId, params.testCase);
    },
    // Optimistic update: add test case to cache immediately
    onMutate: async (variables) => {
      const { promptName, testCase } = variables;

      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: tests_keys.suite(promptName),
      });

      // Snapshot previous value for rollback
      const previous_suite = queryClient.getQueryData(
        tests_keys.suite(promptName)
      );

      // Optimistically add test case to suite
      queryClient.setQueryData(tests_keys.suite(promptName), (old: any) => {
        if (!old) return old;

        // Create optimistic test case with temporary ID
        const optimistic_case = {
          id: -Date.now(), // Temporary negative ID
          ...testCase,
          created_at: new Date().toISOString(),
          auto_generated: false,
        };

        return {
          ...old,
          cases: [...(old.cases || []), optimistic_case],
        };
      });

      return { previous_suite };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previous_suite) {
        queryClient.setQueryData(
          tests_keys.suite(variables.promptName),
          context.previous_suite
        );
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate test suite to refetch with real data
      queryClient.invalidateQueries({
        queryKey: tests_keys.suite(variables.promptName),
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
      return run_tests(params.promptName, userId, params.testParams);
    },
    onSuccess: (_, variables) => {
      // Invalidate test suite and results to show new execution
      queryClient.invalidateQueries({
        queryKey: tests_keys.suite(variables.promptName),
      });
      queryClient.invalidateQueries({
        queryKey: tests_keys.results(variables.promptName),
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
      return update_test_case(params.caseId, userId, params.updates);
    },
    onSuccess: () => {
      // Invalidate all test suites to refresh
      queryClient.invalidateQueries({ queryKey: tests_keys.suites() });
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
      await delete_test_case(caseId, userId);
    },
    onSuccess: () => {
      // Invalidate all test suites to refresh
      queryClient.invalidateQueries({ queryKey: tests_keys.suites() });
    },
  });
}

// Aliases for compatibility
export const useGetTestSuiteQuery = useGetTestSuitesQuery;
export const useGenerateTestCasesMutation = useGenerateTestsMutationFromAI;
