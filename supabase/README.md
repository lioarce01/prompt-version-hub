# Supabase Configuration

This directory contains the Supabase configuration for the Prompt Version Hub.

## Directory Structure

```
supabase/
├── migrations/          # Database schema migrations
│   └── 00001_initial_schema.sql
└── functions/          # Edge Functions
    ├── generate-prompt/
    │   └── index.ts
    ├── generate-test-cases/
    │   └── index.ts
    └── run-tests/
        └── index.ts
```

## Migrations

### 00001_initial_schema.sql

Creates the complete database schema including:
- All tables (users, prompts, deployments, ab_policies, etc.)
- Indexes for optimized queries
- Row Level Security (RLS) policies
- Triggers for automatic timestamps
- Functions for user profile creation

**To apply this migration:**
1. Go to your Supabase project's SQL Editor
2. Copy the contents of `migrations/00001_initial_schema.sql`
3. Paste and run the query

## Edge Functions

### generate-prompt

Generates AI-powered prompt templates using Google Gemini.

**Endpoint**: `/functions/v1/generate-prompt`

**Request body**:
```json
{
  "goal": "string",
  "industry": "string (optional)",
  "target_audience": "string (optional)",
  "tone": "professional | casual | friendly | technical | creative | formal",
  "output_format": "text | json | markdown | html | code | list",
  "context": "string (optional)",
  "constraints": "string (optional)",
  "examples": "string (optional)"
}
```

**Response**:
```json
{
  "prompt_template": "string",
  "variables": ["string"],
  "metadata": {
    "char_count": number,
    "word_count": number,
    "variable_count": number,
    "complexity": "simple | moderate | complex"
  },
  "suggestions": ["string"]
}
```

### generate-test-cases

Generates AI-powered test cases for a prompt.

**Endpoint**: `/functions/v1/generate-test-cases`

**Request body**:
```json
{
  "prompt_id": number,
  "prompt_template": "string",
  "prompt_variables": ["string"],
  "count": number,
  "user_id": "string"
}
```

### run-tests

Executes test cases for a prompt.

**Endpoint**: `/functions/v1/run-tests`

**Request body**:
```json
{
  "prompt_id": number,
  "prompt_version": number,
  "prompt_template": "string",
  "prompt_variables": ["string"],
  "test_cases": [TestCase],
  "user_id": "string"
}
```

## Deploying Edge Functions

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

3. Set environment secrets:
   ```bash
   supabase secrets set GOOGLE_GENAI_API_KEY=your_key
   supabase secrets set GOOGLE_GENAI_MODEL=gemini-2.0-flash-exp
   ```

4. Deploy functions:
   ```bash
   # Deploy all functions
   supabase functions deploy

   # Or deploy individually
   supabase functions deploy generate-prompt
   supabase functions deploy generate-test-cases
   supabase functions deploy run-tests
   ```

## Local Development

To test Edge Functions locally:

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-prompt' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"goal":"Generate product descriptions"}'
```

## Environment Variables

Edge Functions have access to these environment variables:
- `SUPABASE_URL`: Your project URL
- `SUPABASE_ANON_KEY`: Public anon key
- `GOOGLE_GENAI_API_KEY`: Google Gemini API key (set via secrets)
- `GOOGLE_GENAI_MODEL`: Gemini model to use (set via secrets)

## Security

- Edge Functions automatically verify authentication via the Authorization header
- They use the user's session to access the database (respecting RLS policies)
- Never expose the service role key in Edge Functions code
- Use `supabase secrets` for sensitive configuration

## Monitoring

View Edge Function logs in:
1. Supabase Dashboard > Edge Functions
2. Click on a function name
3. Go to "Logs" tab

## Troubleshooting

**Function not found error:**
- Ensure you've deployed the function
- Check the function name in your code matches the deployment name

**Authentication errors:**
- Verify the Authorization header is being sent
- Check that the token is valid

**CORS errors:**
- Edge Functions include CORS headers by default
- Ensure you handle OPTIONS requests for preflight

**Timeout errors:**
- Edge Functions have a 150-second timeout
- Optimize long-running operations
- Consider breaking into smaller functions

## References

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
