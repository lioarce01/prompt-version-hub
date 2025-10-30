export type ToneOption =
  | "professional"
  | "casual"
  | "friendly"
  | "technical"
  | "creative"
  | "formal";

export type OutputFormatOption =
  | "text"
  | "json"
  | "markdown"
  | "html"
  | "code"
  | "list";

export interface PromptGenerationRequestPayload {
  goal: string;
  industry?: string;
  target_audience?: string;
  tone: ToneOption;
  output_format: OutputFormatOption;
  context?: string;
  constraints?: string;
  examples?: string;
}

export interface PromptGenerationMetadata {
  char_count: number;
  word_count: number;
  line_count: number;
  complexity: "simple" | "medium" | "complex";
}

export interface PromptGenerationResponse {
  prompt_template: string;
  variables: string[];
  metadata: PromptGenerationMetadata;
  suggestions: string[];
}
