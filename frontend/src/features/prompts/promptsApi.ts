import { api } from "@/lib/api";
import type {
  Prompt,
  PromptVersion,
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptListResponse,
  PromptDiffResponse,
} from "@/types/prompts";

export const promptsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get list of prompts with filters
    getPrompts: builder.query<
      PromptListResponse,
      {
        q?: string;
        active?: boolean;
        created_by?: number;
        latest_only?: boolean;
        sort_by?: string;
        order?: "asc" | "desc";
        limit?: number;
        offset?: number;
      }
    >({
      query: (params) => ({
        url: "/prompts/",
        params,
      }),
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
      invalidatesTags: [{ type: "Prompt", id: "LIST" }],
    }),

    // Get all versions of a prompt
    getVersions: builder.query<PromptVersion[], string>({
      query: (name) => `/prompts/${name}/versions`,
      providesTags: (result, error, name) => [
        { type: "Prompt", id: `${name}-versions` },
      ],
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
  useGetPromptQuery,
  useCreatePromptMutation,
  useUpdatePromptMutation,
  useDeletePromptMutation,
  useGetVersionsQuery,
  useGetVersionQuery,
  useRollbackMutation,
  useGetDiffQuery,
  useLazyGetDiffQuery,
} = promptsApi;
