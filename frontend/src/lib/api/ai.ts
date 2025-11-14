/**
 * AI API Functions
 *
 * Functional API for AI-powered operations using Supabase Edge Functions.
 * Designed for use with TanStack Query.
 */

import { createClient } from '@/utils/supabase/client';

export interface GeneratePromptParams {
  goal: string;
  industry?: string;
  target_audience?: string;
  tone?:
    | 'professional'
    | 'casual'
    | 'friendly'
    | 'technical'
    | 'creative'
    | 'formal';
  output_format?: 'text' | 'json' | 'markdown' | 'html' | 'code' | 'list';
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
    complexity: 'simple' | 'moderate' | 'complex';
  };
  suggestions: string[];
}

/**
 * Generate a prompt template using AI
 */
export async function generate_prompt(
  params: GeneratePromptParams
): Promise<GeneratePromptResponse> {
  const supabase = createClient();

  const { data, error } = await supabase.functions.invoke('generate-prompt', {
    body: params,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
