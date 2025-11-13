/**
 * Tests Service
 *
 * Handles test case and test run operations
 */

import { getSupabaseBrowserClient } from "../supabase/client";
import type { Database } from "../supabase/types";

type TestCase = Database["public"]["Tables"]["test_cases"]["Row"];
type TestRun = Database["public"]["Tables"]["test_runs"]["Row"];
type TestCategory = Database["public"]["Enums"]["test_category"];

export interface CreateTestCaseParams {
  name: string;
  input_text: string;
  expected_output?: string;
  category?: TestCategory;
  auto_generated?: boolean;
}

export interface UpdateTestCaseParams {
  name?: string;
  input_text?: string;
  expected_output?: string;
  category?: TestCategory;
}

export interface RunTestsParams {
  test_case_ids?: number[];
}

export class TestsService {
  private get supabase(): any {
    return getSupabaseBrowserClient();
  }

  /**
   * Get test suite for a prompt
   */
  async getTestSuite(promptName: string, userId: string) {
    // Get the active prompt
    const { data: prompt, error: promptError } = await this.supabase
      .from("prompts")
      .select("*")
      .eq("name", promptName)
      .eq("active", true)
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .single();

    if (promptError || !prompt) {
      throw new Error("Prompt not found");
    }

    // Check permission
    if (!prompt.is_public && prompt.created_by !== userId) {
      throw new Error("You do not have permission to view this prompt");
    }

    // Get test cases
    const { data: testCases, error: casesError } = await this.supabase
      .from("test_cases")
      .select("*")
      .eq("prompt_id", prompt.id)
      .order("created_at", { ascending: false });

    if (casesError) {
      throw new Error(casesError.message);
    }

    // Get recent test runs
    const { data: testRuns, error: runsError } = await this.supabase
      .from("test_runs")
      .select("*")
      .eq("prompt_id", prompt.id)
      .order("executed_at", { ascending: false })
      .limit(50);

    if (runsError) {
      throw new Error(runsError.message);
    }

    return {
      cases: testCases || [],
      runs: testRuns || [],
      prompt,
    };
  }

  /**
   * Create a test case
   */
  async createTestCase(
    promptName: string,
    userId: string,
    params: CreateTestCaseParams,
  ): Promise<TestCase> {
    // Get the prompt
    const { data: prompt, error: promptError } = await this.supabase
      .from("prompts")
      .select("*")
      .eq("name", promptName)
      .eq("active", true)
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .single();

    if (promptError || !prompt) {
      throw new Error("Prompt not found");
    }

    // Check permission (only owner can create test cases)
    if (prompt.created_by !== userId) {
      throw new Error(
        "You do not have permission to create test cases for this prompt",
      );
    }

    const { data, error } = await this.supabase
      .from("test_cases")
      .insert({
        prompt_id: prompt.id,
        name: params.name,
        input_text: params.input_text,
        expected_output: params.expected_output || null,
        category: params.category || "happy_path",
        auto_generated: params.auto_generated ?? false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Update a test case
   */
  async updateTestCase(
    caseId: number,
    userId: string,
    params: UpdateTestCaseParams,
  ): Promise<TestCase> {
    // Get the test case
    const { data: testCase, error: getCaseError } = await this.supabase
      .from("test_cases")
      .select("*, prompt:prompts(*)")
      .eq("id", caseId)
      .single();

    if (getCaseError || !testCase) {
      throw new Error("Test case not found");
    }

    // Check permission
    const prompt = testCase.prompt as any;
    if (prompt.created_by !== userId) {
      throw new Error("You do not have permission to update this test case");
    }

    const { data, error } = await this.supabase
      .from("test_cases")
      .update(params)
      .eq("id", caseId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Delete a test case
   */
  async deleteTestCase(caseId: number, userId: string): Promise<void> {
    // Get the test case
    const { data: testCase, error: getCaseError } = await this.supabase
      .from("test_cases")
      .select("*, prompt:prompts(*)")
      .eq("id", caseId)
      .single();

    if (getCaseError || !testCase) {
      throw new Error("Test case not found");
    }

    // Check permission
    const prompt = testCase.prompt as any;
    if (prompt.created_by !== userId) {
      throw new Error("You do not have permission to delete this test case");
    }

    const { error } = await this.supabase
      .from("test_cases")
      .delete()
      .eq("id", caseId);

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Generate test cases using AI (calls Edge Function)
   */
  async generateTestCases(
    promptName: string,
    userId: string,
    count: number,
  ): Promise<TestCase[]> {
    // Get the prompt
    const { data: prompt, error: promptError } = await this.supabase
      .from("prompts")
      .select("*")
      .eq("name", promptName)
      .eq("active", true)
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .single();

    if (promptError || !prompt) {
      throw new Error("Prompt not found");
    }

    // Check permission
    if (prompt.created_by !== userId) {
      throw new Error(
        "You do not have permission to generate test cases for this prompt",
      );
    }

    // Call Edge Function to generate test cases
    const { data, error } = await this.supabase.functions.invoke(
      "generate-test-cases",
      {
        body: {
          prompt_id: prompt.id,
          prompt_template: prompt.template,
          prompt_variables: prompt.variables,
          count,
          user_id: userId,
        },
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    return data.test_cases;
  }

  /**
   * Run tests for a prompt
   */
  async runTests(
    promptName: string,
    userId: string,
    params: RunTestsParams,
  ): Promise<TestRun[]> {
    // Get the prompt
    const { data: prompt, error: promptError } = await this.supabase
      .from("prompts")
      .select("*")
      .eq("name", promptName)
      .eq("active", true)
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .single();

    if (promptError || !prompt) {
      throw new Error("Prompt not found");
    }

    // Check permission
    if (prompt.created_by !== userId) {
      throw new Error(
        "You do not have permission to run tests for this prompt",
      );
    }

    // Get test cases
    let testCasesQuery = this.supabase
      .from("test_cases")
      .select("*")
      .eq("prompt_id", prompt.id);

    if (params.test_case_ids && params.test_case_ids.length > 0) {
      testCasesQuery = testCasesQuery.in("id", params.test_case_ids);
    }

    const { data: testCases, error: casesError } = await testCasesQuery;

    if (casesError) {
      throw new Error(casesError.message);
    }

    if (!testCases || testCases.length === 0) {
      throw new Error("No test cases found");
    }

    // Call Edge Function to run tests
    const { data, error } = await this.supabase.functions.invoke("run-tests", {
      body: {
        prompt_id: prompt.id,
        prompt_version: prompt.version,
        prompt_template: prompt.template,
        prompt_variables: prompt.variables,
        test_cases: testCases,
        user_id: userId,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.test_runs;
  }
}

export const testsService = new TestsService();
