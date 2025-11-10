/**
 * Supabase Edge Function: Generate Prompt
 *
 * Generates a prompt template using Google Gemini AI
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GENAI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GOOGLE_GENAI_MODEL') || 'gemini-2.0-flash-exp';

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check API key
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const {
      goal,
      industry,
      target_audience,
      tone = 'professional',
      output_format = 'text',
      context,
      constraints,
      examples,
    } = await req.json();

    if (!goal || goal.length < 10 || goal.length > 1000) {
      return new Response(JSON.stringify({ error: 'Goal must be between 10 and 1000 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit (50 per day per user)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from('ai_generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo);

    if (count && count >= 50) {
      return new Response(JSON.stringify({ error: 'Daily AI generation limit reached (50 requests)' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build the AI prompt
    let aiPrompt = `You are an expert prompt engineer. Generate a professional, production-ready prompt template based on the following requirements:\n\n`;
    aiPrompt += `Goal: ${goal}\n`;
    if (industry) aiPrompt += `Industry: ${industry}\n`;
    if (target_audience) aiPrompt += `Target Audience: ${target_audience}\n`;
    aiPrompt += `Tone: ${tone}\n`;
    aiPrompt += `Output Format: ${output_format}\n`;
    if (context) aiPrompt += `Additional Context: ${context}\n`;
    if (constraints) aiPrompt += `Constraints: ${constraints}\n`;
    if (examples) aiPrompt += `Examples: ${examples}\n`;

    aiPrompt += `\n\nPlease generate a prompt template that:\n`;
    aiPrompt += `1. Is clear, concise, and follows best practices\n`;
    aiPrompt += `2. Uses {{variable_name}} format for dynamic variables\n`;
    aiPrompt += `3. Includes appropriate instructions and context\n`;
    aiPrompt += `4. Is optimized for the specified tone and output format\n\n`;
    aiPrompt += `Respond with a JSON object containing:\n`;
    aiPrompt += `- prompt_template: the generated prompt (string)\n`;
    aiPrompt += `- variables: array of variable names found in the template (e.g., ["user_name", "product_id"])\n`;
    aiPrompt += `- suggestions: array of improvement suggestions (strings)\n`;

    // Call Google Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: aiPrompt }],
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let result;

    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback if AI didn't return JSON
      result = {
        prompt_template: responseText,
        variables: [],
        suggestions: [],
      };
    }

    // Extract variables if not provided
    if (!result.variables || result.variables.length === 0) {
      const variableMatches = result.prompt_template.match(/\{\{(\w+)\}\}/g) || [];
      result.variables = variableMatches.map((v: string) => v.replace(/\{\{|\}\}/g, ''));
    }

    // Calculate metadata
    const charCount = result.prompt_template.length;
    const wordCount = result.prompt_template.split(/\s+/).length;

    result.metadata = {
      char_count: charCount,
      word_count: wordCount,
      variable_count: result.variables.length,
      complexity: wordCount > 200 ? 'complex' : wordCount > 100 ? 'moderate' : 'simple',
    };

    // Store in database
    await supabaseClient.from('ai_generations').insert({
      user_id: user.id,
      request_data: { goal, industry, target_audience, tone, output_format, context, constraints, examples },
      response_data: result,
      prompt_template: result.prompt_template,
      variables: result.variables,
      ai_provider: 'google',
      ai_model: GEMINI_MODEL,
      tokens_used: null, // Gemini doesn't provide this in the free tier
      cost_cents: null,
    });

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error generating prompt:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
