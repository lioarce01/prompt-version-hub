import { api } from "@/lib/api";
import type {
  TestCase,
  TestRun,
  TestSuiteResponse,
  CreateTestCaseRequest,
  UpdateTestCaseRequest,
  GenerateTestsRequest,
  RunTestsRequest,
} from "@/types/tests";

export const testsApi = api.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getTestSuite: builder.query<TestSuiteResponse, string>({
      query: (promptName) => `/tests/${promptName}`,
      providesTags: (result, _error, promptName) => [
        { type: "Test" as const, id: promptName },
      ],
    }),

    createTestCase: builder.mutation<TestCase, { promptName: string; body: CreateTestCaseRequest }>({
      query: ({ promptName, body }) => ({
        url: `/tests/${promptName}`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, { promptName }) => [
        { type: "Test" as const, id: promptName },
      ],
    }),

    updateTestCase: builder.mutation<TestCase, { id: number; body: UpdateTestCaseRequest; promptName: string }>({
      query: ({ id, body }) => ({
        url: `/tests/cases/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, _error, { promptName }) => [
        { type: "Test" as const, id: promptName },
      ],
    }),

    deleteTestCase: builder.mutation<void, { id: number; promptName: string }>({
      query: ({ id }) => ({
        url: `/tests/cases/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, _error, { promptName }) => [
        { type: "Test" as const, id: promptName },
      ],
    }),

    generateTestCases: builder.mutation<TestCase[], { promptName: string; body: GenerateTestsRequest }>({
      query: ({ promptName, body }) => ({
        url: `/tests/${promptName}/generate`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, { promptName }) => [
        { type: "Test" as const, id: promptName },
      ],
    }),

    runTests: builder.mutation<TestRun[], { promptName: string; body: RunTestsRequest }>({
      query: ({ promptName, body }) => ({
        url: `/tests/${promptName}/run`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, { promptName }) => [
        { type: "Test" as const, id: promptName },
      ],
    }),
  }),
});

export const {
  useGetTestSuiteQuery,
  useCreateTestCaseMutation,
  useUpdateTestCaseMutation,
  useDeleteTestCaseMutation,
  useGenerateTestCasesMutation,
  useRunTestsMutation,
} = testsApi;
