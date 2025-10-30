import { api } from "@/lib/api";
import type { Deployment, DeployRequest, Environment } from "@/types/deployments";

interface DeploymentWithPromptInfo extends Deployment {
  prompt: {
    id: number;
    name: string;
    version: number;
    template: string;
  };
  user: {
    id: number;
    email: string;
  };
}

interface DeploymentHistoryResponse {
  items: DeploymentWithPromptInfo[];
  count: number;
  limit: number;
  offset: number;
  has_next: boolean;
}

export const deploymentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Deploy a prompt to an environment
    deploy: builder.mutation<DeploymentWithPromptInfo, DeployRequest>({
      query: (data) => ({
        url: "/deployments/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { environment }) => [
        { type: "Deployment", id: environment },
        { type: "Deployment", id: "HISTORY" },
      ],
    }),

    // Get current deployment for an environment
    getCurrentDeployment: builder.query<
      DeploymentWithPromptInfo | null,
      { environment: Environment; prompt?: string }
    >({
      query: ({ environment, prompt }) => ({
        url: `/deployments/${environment}`,
        params: prompt ? { prompt } : undefined,
      }),
      providesTags: (result, error, { environment, prompt }) => [
        { type: "Deployment", id: prompt ? `${environment}-${prompt}` : environment },
      ],
      transformResponse: (
        response: DeploymentWithPromptInfo | { detail: string },
      ) => {
        // Backend returns 404 with detail if no deployment exists
        if ("detail" in response) {
          return null;
        }
        return response;
      },
      transformErrorResponse: (response) => {
        // Transform 404 to null instead of error
        if (response.status === 404) {
          return null;
        }
        return response;
      },
    }),

    // Get deployment history for an environment
    getDeploymentHistory: builder.query<
      DeploymentHistoryResponse,
      { environment?: Environment; prompt?: string; limit?: number; offset?: number }
    >({
      query: (params) => {
        const environment = params.environment || "dev";
        return {
          url: `/deployments/history/${environment}`,
          params: {
            limit: params.limit ?? 20,
            offset: params.offset ?? 0,
            ...(params.prompt ? { prompt: params.prompt } : {}),
          },
        };
      },
      providesTags: (result) => [
        { type: "Deployment", id: "HISTORY" },
        ...(result?.items || []).map((deployment) => ({
          type: "Deployment" as const,
          id: deployment.id,
        })),
      ],
    }),

    // Get all deployment history (across all environments) - custom query
    getAllDeploymentHistory: builder.query<
      DeploymentHistoryResponse,
      { limit?: number; offset?: number }
    >({
      async queryFn(arg, queryApi, extraOptions, baseQuery) {
        // Fetch ALL records from all 3 environments (we'll paginate after merging)
        const environments: Environment[] = ["dev", "staging", "production"];
        const results = await Promise.all(
          environments.map((env) =>
            baseQuery({
              url: `/deployments/history/${env}`,
              params: {
                limit: 100, // Fetch more records to ensure we have enough after merging
                offset: 0,
              },
            })
          )
        );

        // Merge and sort by deployed_at
        const allItems: DeploymentWithPromptInfo[] = [];
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.data) {
            const items = (result.data as any).items;
            allItems.push(...items);
          }
        }

        // Sort by deployed_at desc (most recent first)
        allItems.sort(
          (a, b) =>
            new Date(b.deployed_at).getTime() - new Date(a.deployed_at).getTime()
        );

        // Apply pagination AFTER merging and sorting
        const limit = arg.limit ?? 20;
        const offset = arg.offset ?? 0;
        const paginatedItems = allItems.slice(offset, offset + limit + 1);
        const items = paginatedItems.slice(0, limit);
        const has_next = paginatedItems.length > limit;

        return {
          data: {
            items,
            count: allItems.length,
            limit,
            offset,
            has_next,
          },
        };
      },
      providesTags: (result) => [
        { type: "Deployment", id: "HISTORY" },
        ...(result?.items || []).map((deployment) => ({
          type: "Deployment" as const,
          id: deployment.id,
        })),
      ],
    }),
  }),
});

export const {
  useDeployMutation,
  useGetCurrentDeploymentQuery,
  useGetDeploymentHistoryQuery,
  useGetAllDeploymentHistoryQuery,
} = deploymentsApi;
