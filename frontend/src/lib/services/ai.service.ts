/**
 * AI Service
 *
 * Handles AI prompt generation using Supabase Edge Functions
 */

import { createClient } from "@/utils/supabase/client";

export interface GeneratePromptParams {
  goal: string;
  industry?: string;
  target_audience?: string;
  tone?:
    | "professional"
    | "casual"
    | "friendly"
    | "technical"
    | "creative"
    | "formal";
  output_format?: "text" | "json" | "markdown" | "html" | "code" | "list";
  context?: string;
  constraints?: string;
  examples?: string;
}

export interface GeneratePromptResponse {
  prompt_template: string;
  variables: string[];
  metadata: {
    char_count: number;
    word_count: number;
    variable_count: number;
    complexity: "simple" | "moderate" | "complex";
  };
  suggestions: string[];
}

export class AIService {
  private get supabase(): any {
    return createClient();
  }

  /**
   * Generate a prompt template using AI
   */
  async generatePrompt(
    params: GeneratePromptParams,
  ): Promise<GeneratePromptResponse> {
    const { data, error } = await this.supabase.functions.invoke(
      "generate-prompt",
      {
        body: params,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

export const aiService = new AIService();
