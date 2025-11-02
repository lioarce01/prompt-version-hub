export type TestCategory = "happy_path" | "edge_case" | "boundary" | "negative";

export interface TestCase {
  id: number;
  prompt_id: number;
  name: string;
  input_text: string;
  expected_output?: string | null;
  category: TestCategory;
  auto_generated: boolean;
  created_at: string;
  created_by?: number | null;
}

export interface CreateTestCaseRequest {
  name: string;
  input_text: string;
  expected_output?: string;
  category: TestCategory;
}

export interface UpdateTestCaseRequest {
  name?: string;
  input_text?: string;
  expected_output?: string | null;
  category?: TestCategory;
}

export interface TestRun {
  id: number;
  prompt_id: number;
  prompt_version: number;
  test_case_id?: number | null;
  input_text: string;
  output_text?: string | null;
  success?: boolean | null;
  latency_ms?: number | null;
  tokens_used?: number | null;
  cost_cents?: number | null;
  error_message?: string | null;
  executed_at: string;
  executed_by?: number | null;
}

export interface TestSuiteResponse {
  cases: TestCase[];
  runs: TestRun[];
  prompt_version: number;
  prompt_template: string;
  prompt_variables: string[];
}

export interface GenerateTestsRequest {
  count?: number;
}

export interface RunTestsRequest {
  case_ids?: number[];
  prompt_version?: number;
}
