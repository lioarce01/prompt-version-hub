import { api } from "@/lib/api";
import type {
  ABPolicy,
  ABPolicyListItem,
  ABPolicyInput,
  ABAssignment,
  ABAssignmentInput,
  ABStats,
} from "@/types/api";

export const experimentsApi = api.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getExperiments: builder.query<
      ABPolicyListItem[],
      { includePublic?: boolean }
    >({
      query: ({ includePublic = true }) => ({
        url: "/ab/policies",
        params: { include_public: includePublic },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Experiment" as const, id })),
              { type: "Experiment", id: "LIST" },
            ]
          : [{ type: "Experiment", id: "LIST" }],
    }),

    getExperiment: builder.query<ABPolicy, string>({
      query: (promptName) => `/ab/policy/${promptName}`,
      providesTags: (result, error, promptName) => [
        { type: "Experiment", id: promptName },
      ],
    }),

    createExperiment: builder.mutation<ABPolicy, ABPolicyInput>({
      query: (body) => ({
        url: "/ab/policy",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Experiment", id: "LIST" }],
    }),

    updateExperiment: builder.mutation<ABPolicy, ABPolicyInput>({
      query: (body) => ({
        url: "/ab/policy",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Experiment", id: "LIST" },
        { type: "Experiment", id: arg.prompt_name },
      ],
    }),

    deleteExperiment: builder.mutation<void, { id: number; promptName: string }>({
      query: ({ id }) => ({
        url: `/ab/policy/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { promptName }) => [
        { type: "Experiment", id: "LIST" },
        { type: "Experiment", id: promptName },
        { type: "Experiment", id: `${promptName}-stats` },
      ],
    }),

    getExperimentStats: builder.query<ABStats, string>({
      query: (experimentName) => `/ab/stats/${experimentName}`,
      providesTags: (result, error, experimentName) => [
        { type: "Experiment", id: `${experimentName}-stats` },
      ],
    }),

    assignVariant: builder.mutation<ABAssignment, ABAssignmentInput>({
      query: (body) => ({
        url: "/ab/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Experiment", id: `${arg.experiment_name}-stats` },
      ],
    }),
  }),
});

export const {
  useGetExperimentsQuery,
  useGetExperimentQuery,
  useCreateExperimentMutation,
  useUpdateExperimentMutation,
  useDeleteExperimentMutation,
  useGetExperimentStatsQuery,
  useAssignVariantMutation,
} = experimentsApi;
