import { api } from "@/lib/api";
import type {
  PromptGenerationRequestPayload,
  PromptGenerationResponse,
} from "@/types/ai";

export const aiApi = api.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    generatePrompt: builder.mutation<
      PromptGenerationResponse,
      PromptGenerationRequestPayload
    >({
      query: (body) => ({
        url: "/ai/generate-prompt",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useGeneratePromptMutation } = aiApi;
