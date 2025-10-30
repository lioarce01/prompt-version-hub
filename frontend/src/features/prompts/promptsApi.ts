import { api } from "@/lib/api";
import type {
  Prompt,
  PromptVersion,
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptListResponse,
  PromptVersionListResponse,
  PromptDiffResponse,
  PromptFilters,
  PromptCloneRequest,
  PromptVisibilityRequest,
} from "@/types/prompts";

export const promptsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get list of prompts with filters
    getPrompts: builder.query<PromptListResponse, PromptFilters | void>({
      query: (params) => {
        if (!params) {
          return { url: "/prompts/" };
        }
        return {
          url: "/prompts/",
          params,
        };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({
                type: "Prompt" as const,
                id,
              })),
              { type: "Prompt", id: "LIST" },
            ]
          : [{ type: "Prompt", id: "LIST" }],
    }),

    getMyPrompts: builder.query<PromptListResponse, PromptFilters | void>({
      query: (params) => {
        if (!params) {
          return { url: "/prompts/mine" };
        }
        return {
          url: "/prompts/mine",
          params,
        };
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({
                type: "Prompt" as const,
                id,
              })),
              { type: "Prompt", id: "MINE" },
            ]
          : [{ type: "Prompt", id: "MINE" }],
    }),

    // Get single prompt by name (active version)
    getPrompt: builder.query<Prompt, string>({
      query: (name) => `/prompts/${name}`,
      providesTags: (result, error, name) => [{ type: "Prompt", id: name }],
    }),

    // Create new prompt
    createPrompt: builder.mutation<Prompt, CreatePromptRequest>({
      query: (data) => ({
        url: "/prompts/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Prompt", id: "LIST" }],
    }),

    updateVisibility: builder.mutation<
      Prompt,
      { name: string; data: PromptVisibilityRequest }
    >({
      query: ({ name, data }) => ({
        url: `/prompts/${name}/visibility`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { name }) => [
        { type: "Prompt", id: name },
        { type: "Prompt", id: "LIST" },
        { type: "Prompt", id: "MINE" },
      ],
    }),

    // Update prompt (creates new version)
    updatePrompt: builder.mutation<
      Prompt,
      { name: string; data: UpdatePromptRequest }
    >({
      query: ({ name, data }) => ({
        url: `/prompts/${name}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { name }) => [
        { type: "Prompt", id: name },
        { type: "Prompt", id: "LIST" },
      ],
    }),

    // Delete prompt
    deletePrompt: builder.mutation<{ success: boolean }, string>({
      query: (name) => ({
        url: `/prompts/${name}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Prompt", id: "LIST" },
        { type: "Prompt", id: "MINE" },
      ],
    }),

    clonePrompt: builder.mutation<Prompt, { name: string; data?: PromptCloneRequest }>({
      query: ({ name, data }) => ({
        url: `/prompts/${name}/clone`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Prompt", id: "LIST" },
        { type: "Prompt", id: "MINE" },
      ],
    }),

    // Get all versions of a prompt
    getVersions: builder.query<PromptVersionListResponse, string>({
      query: (name) => `/prompts/${name}/versions`,
      transformResponse: (
        response: PromptVersion[] | PromptVersionListResponse,
      ) => {
        if (Array.isArray(response)) {
          return { items: response };
        }
        if ("items" in response) {
          return {
            items: response.items ?? [],
            limit: response.limit,
            offset: response.offset,
            count: response.count,
            has_next: response.has_next,
          };
        }
        return { items: [] };
      },
      providesTags: (result, error, name) => {
        const items = result?.items ?? [];
        return [
          { type: "Prompt", id: `${name}-versions` },
          ...items.map((version) => ({
            type: "Prompt" as const,
            id: `${name}-v${version.version}`,
          })),
        ];
      },
    }),

    // Get specific version of a prompt
    getVersion: builder.query<Prompt, { name: string; version: number }>({
      query: ({ name, version }) => `/prompts/${name}/versions/${version}`,
      providesTags: (result, error, { name, version }) => [
        { type: "Prompt", id: `${name}-v${version}` },
      ],
    }),

    // Rollback to a previous version
    rollback: builder.mutation<Prompt, { name: string; version: number }>({
      query: ({ name, version }) => ({
        url: `/prompts/${name}/rollback/${version}`,
        method: "POST",
      }),
      invalidatesTags: (result, error, { name }) => [
        { type: "Prompt", id: name },
        { type: "Prompt", id: `${name}-versions` },
        { type: "Prompt", id: "LIST" },
      ],
    }),

    // Get diff between two versions
    getDiff: builder.query<
      PromptDiffResponse,
      { name: string; from: number; to: number }
    >({
      query: ({ name, from, to }) => ({
        url: `/prompts/${name}/diff`,
        params: { from, to },
      }),
    }),
  }),
});

export const {
  useGetPromptsQuery,
  useGetMyPromptsQuery,
  useGetPromptQuery,
  useCreatePromptMutation,
  useUpdatePromptMutation,
  useUpdateVisibilityMutation,
  useDeletePromptMutation,
  useClonePromptMutation,
  useGetVersionsQuery,
  useGetVersionQuery,
  useRollbackMutation,
  useGetDiffQuery,
  useLazyGetDiffQuery,
} = promptsApi;
