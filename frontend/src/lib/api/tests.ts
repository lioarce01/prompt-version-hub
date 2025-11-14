/**
 * Tests API Functions
 *
 * Functional API for test case and test run operations.
 * Designed for use with TanStack Query.
 */

import { createClient } from '@/utils/supabase/client';
import type { Database } from '../supabase/types';

type TestCase = Database['public']['Tables']['test_cases']['Row'];
type TestRun = Database['public']['Tables']['test_runs']['Row'];
type TestCategory = Database['public']['Enums']['test_category'];

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

/**
 * Get test suite for a prompt
 */
export async function get_test_suite(prompt_name: string, user_id: string) {
  const supabase = createClient();

  // Get the active prompt
  const { data: prompt, error: prompt_error } = await (supabase
    .from('prompts') as any)
    .select('*')
    .eq('name', prompt_name)
    .eq('active', true)
    .or(`is_public.eq.true,created_by.eq.${user_id}`)
    .single();

  if (prompt_error || !prompt) {
    throw new Error('Prompt not found');
  }

  // Check permission
  if (!((prompt as any).is_public) && (prompt as any).created_by !== user_id) {
    throw new Error('You do not have permission to view this prompt');
  }

  // Get test cases
  const { data: test_cases, error: cases_error } = await supabase
    .from('test_cases')
    .select('*')
    .eq('prompt_id', (prompt as any).id)
    .order('created_at', { ascending: false });

  if (cases_error) {
    throw new Error(cases_error.message);
  }

  // Get recent test runs
  const { data: test_runs, error: runs_error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('prompt_id', (prompt as any).id)
    .order('executed_at', { ascending: false })
    .limit(50);

  if (runs_error) {
    throw new Error(runs_error.message);
  }

  return {
    cases: test_cases || [],
    runs: test_runs || [],
    prompt,
  };
}

/**
 * Create a test case
 */
export async function create_test_case(
  prompt_name: string,
  user_id: string,
  params: CreateTestCaseParams
): Promise<TestCase> {
  const supabase = createClient();

  // Get the prompt
  const { data: prompt, error: prompt_error } = await (supabase
    .from('prompts') as any)
    .select('*')
    .eq('name', prompt_name)
    .eq('active', true)
    .or(`is_public.eq.true,created_by.eq.${user_id}`)
    .single();

  if (prompt_error || !prompt) {
    throw new Error('Prompt not found');
  }

  // Check permission (only owner can create test cases)
  if ((prompt as any).created_by !== user_id) {
    throw new Error(
      'You do not have permission to create test cases for this prompt'
    );
  }

  const { data, error } = await (supabase.from('test_cases') as any)
    .insert({
      prompt_id: (prompt as any).id,
      name: params.name,
      input_text: params.input_text,
      expected_output: params.expected_output || null,
      category: params.category || 'happy_path',
      auto_generated: params.auto_generated ?? false,
      created_by: user_id,
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
export async function update_test_case(
  case_id: number,
  user_id: string,
  params: UpdateTestCaseParams
): Promise<TestCase> {
  const supabase = createClient();

  // Get the test case
  const { data: test_case, error: get_case_error } = await supabase
    .from('test_cases')
    .select('*, prompt:prompts(*)')
    .eq('id', case_id)
    .single();

  if (get_case_error || !test_case) {
    throw new Error('Test case not found');
  }

  // Check permission
  const prompt = (test_case as any).prompt;
  if ((prompt as any).created_by !== user_id) {
    throw new Error('You do not have permission to update this test case');
  }

  const { data, error } = await (supabase.from('test_cases') as any)
    .update(params)
    .eq('id', case_id)
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
export async function delete_test_case(
  case_id: number,
  user_id: string
): Promise<void> {
  const supabase = createClient();

  // Get the test case
  const { data: test_case, error: get_case_error } = await supabase
    .from('test_cases')
    .select('*, prompt:prompts(*)')
    .eq('id', case_id)
    .single();

  if (get_case_error || !test_case) {
    throw new Error('Test case not found');
  }

  // Check permission
  const prompt = (test_case as any).prompt;
  if ((prompt as any).created_by !== user_id) {
    throw new Error('You do not have permission to delete this test case');
  }

  const { error } = await supabase
    .from('test_cases')
    .delete()
    .eq('id', case_id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Generate test cases using AI (calls Edge Function)
 */
export async function generate_test_cases(
  prompt_name: string,
  user_id: string,
  count: number
): Promise<TestCase[]> {
  const supabase = createClient();

  // Get the prompt
  const { data: prompt, error: prompt_error } = await (supabase
    .from('prompts') as any)
    .select('*')
    .eq('name', prompt_name)
    .eq('active', true)
    .or(`is_public.eq.true,created_by.eq.${user_id}`)
    .single();

  if (prompt_error || !prompt) {
    throw new Error('Prompt not found');
  }

  // Check permission
  if ((prompt as any).created_by !== user_id) {
    throw new Error(
      'You do not have permission to generate test cases for this prompt'
    );
  }

  // Call Edge Function to generate test cases
  const { data, error } = await supabase.functions.invoke(
    'generate-test-cases',
    {
      body: {
        prompt_id: (prompt as any).id,
        prompt_template: (prompt as any).template,
        prompt_variables: (prompt as any).variables,
        count,
        user_id,
      },
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data.test_cases;
}

/**
 * Run tests for a prompt
 */
export async function run_tests(
  prompt_name: string,
  user_id: string,
  params: RunTestsParams
): Promise<TestRun[]> {
  const supabase = createClient();

  // Get the prompt
  const { data: prompt, error: prompt_error } = await (supabase
    .from('prompts') as any)
    .select('*')
    .eq('name', prompt_name)
    .eq('active', true)
    .or(`is_public.eq.true,created_by.eq.${user_id}`)
    .single();

  if (prompt_error || !prompt) {
    throw new Error('Prompt not found');
  }

  // Check permission
  if ((prompt as any).created_by !== user_id) {
    throw new Error('You do not have permission to run tests for this prompt');
  }

  // Get test cases
  let test_cases_query = supabase
    .from('test_cases')
    .select('*')
    .eq('prompt_id', (prompt as any).id);

  if (params.test_case_ids && params.test_case_ids.length > 0) {
    test_cases_query = test_cases_query.in('id', params.test_case_ids);
  }

  const { data: test_cases, error: cases_error } = await test_cases_query;

  if (cases_error) {
    throw new Error(cases_error.message);
  }

  if (!test_cases || test_cases.length === 0) {
    throw new Error('No test cases found');
  }

  // Call Edge Function to run tests
  const { data, error } = await supabase.functions.invoke('run-tests', {
    body: {
      prompt_id: (prompt as any).id,
      prompt_version: (prompt as any).version,
      prompt_template: (prompt as any).template,
      prompt_variables: (prompt as any).variables,
      test_cases,
      user_id,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.test_runs;
}
