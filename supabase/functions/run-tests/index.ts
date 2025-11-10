/**
 * Supabase Edge Function: Run Tests
 *
 * Executes test cases for a prompt (mock implementation)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { prompt_id, prompt_version, prompt_template, prompt_variables, test_cases, user_id } = await req.json();

    // Run each test case (this is a mock implementation)
    // In a real scenario, you would execute the prompt with the test input
    const testRuns = await Promise.all(
      test_cases.map(async (testCase: any) => {
        const startTime = Date.now();

        // Mock execution - in reality, you'd call your LLM here
        const mockOutput = `Executed prompt with input: ${testCase.input_text.substring(0, 50)}...`;
        const success = Math.random() > 0.1; // 90% success rate for demo
        const latency = Math.floor(Math.random() * 2000) + 500; // 500-2500ms

        const endTime = Date.now();

        const { data, error } = await supabaseClient
          .from('test_runs')
          .insert({
            prompt_id,
            prompt_version,
            test_case_id: testCase.id,
            input_text: testCase.input_text,
            output_text: mockOutput,
            success,
            latency_ms: endTime - startTime,
            tokens_used: Math.floor(Math.random() * 500) + 100,
            cost_cents: Math.floor(Math.random() * 10) + 1,
            error_message: success ? null : 'Mock error for testing',
            executed_by: user_id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      })
    );

    return new Response(JSON.stringify({ test_runs: testRuns }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
