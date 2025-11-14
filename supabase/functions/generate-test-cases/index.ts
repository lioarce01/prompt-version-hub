/**
 * Supabase Edge Function: Generate Test Cases
 *
 * Generates test cases for a prompt using Google Gemini AI
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GOOGLE_GENAI_MODEL') || 'gemini-2.0-flash-exp';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt_id, prompt_template, prompt_variables, count = 5, user_id } = await req.json();

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build AI prompt
    let aiPrompt = `You are a QA engineer. Generate ${count} diverse test cases for the following prompt template:\n\n`;
    aiPrompt += `Template: ${prompt_template}\n`;
    aiPrompt += `Variables: ${JSON.stringify(prompt_variables)}\n\n`;
    aiPrompt += `Generate test cases covering:\n`;
    aiPrompt += `1. Happy path scenarios\n`;
    aiPrompt += `2. Edge cases\n`;
    aiPrompt += `3. Boundary conditions\n`;
    aiPrompt += `4. Negative cases\n\n`;
    aiPrompt += `Respond with a JSON array of test cases, each with:\n`;
    aiPrompt += `- name: descriptive test name\n`;
    aiPrompt += `- input_text: test input\n`;
    aiPrompt += `- expected_output: expected result (optional)\n`;
    aiPrompt += `- category: one of "happy_path", "edge_case", "boundary", "negative"\n`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: aiPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error('Failed to generate test cases');
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const testCasesData = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Insert test cases into database
    const testCases = await Promise.all(
      testCasesData.map(async (tc: any) => {
        const { data, error } = await supabaseClient
          .from('test_cases')
          .insert({
            prompt_id,
            name: tc.name,
            input_text: tc.input_text,
            expected_output: tc.expected_output || null,
            category: tc.category || 'happy_path',
            auto_generated: true,
            created_by: user_id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      })
    );

    return new Response(JSON.stringify({ test_cases: testCases }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
