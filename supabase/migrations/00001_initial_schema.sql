-- ================================
-- Prompt Version Hub - Supabase Schema Migration
-- ================================
-- This migration creates all tables and sets up Row Level Security (RLS)

-- ================================
-- Enable Required Extensions
-- ================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================
-- Custom Types (Enums)
-- ================================

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

-- Test case categories
CREATE TYPE test_category AS ENUM ('happy_path', 'edge_case', 'boundary', 'negative');

-- ================================
-- Tables
-- ================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'editor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prompts table
CREATE TABLE prompts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_prompt_name_version UNIQUE (name, version)
);

-- Create indexes for prompts
CREATE INDEX idx_prompts_name ON prompts(name);
CREATE INDEX idx_prompts_created_by ON prompts(created_by);
CREATE INDEX idx_prompts_active ON prompts(active);
CREATE INDEX idx_prompts_is_public ON prompts(is_public);
CREATE INDEX idx_prompts_created_at ON prompts(created_at DESC);

-- Deployments table
CREATE TABLE deployments (
    id BIGSERIAL PRIMARY KEY,
    prompt_id BIGINT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deployed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for deployments
CREATE INDEX idx_deployments_prompt_id ON deployments(prompt_id);
CREATE INDEX idx_deployments_environment ON deployments(environment);
CREATE INDEX idx_deployments_deployed_at ON deployments(deployed_at DESC);

-- AB Testing Policies table
CREATE TABLE ab_policies (
    id BIGSERIAL PRIMARY KEY,
    prompt_name TEXT NOT NULL,
    weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes and constraints for ab_policies
CREATE UNIQUE INDEX uq_ab_policies_prompt_name_user ON ab_policies(prompt_name, created_by);
CREATE INDEX idx_ab_policies_created_by ON ab_policies(created_by);
CREATE INDEX idx_ab_policies_is_public ON ab_policies(is_public);

-- AB Assignments table
CREATE TABLE ab_assignments (
    id BIGSERIAL PRIMARY KEY,
    experiment_name TEXT NOT NULL,
    prompt_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assignment_unique UNIQUE (experiment_name, prompt_name, user_id)
);

-- Create index for ab_assignments
CREATE INDEX idx_ab_assignments_experiment ON ab_assignments(experiment_name);

-- Usage Events table
CREATE TABLE usage_events (
    id BIGSERIAL PRIMARY KEY,
    prompt_id BIGINT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id TEXT,
    output TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    latency_ms INTEGER,
    cost INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for usage_events
CREATE INDEX idx_usage_events_prompt_id ON usage_events(prompt_id);
CREATE INDEX idx_usage_events_created_at ON usage_events(created_at DESC);

-- Test Cases table
CREATE TABLE test_cases (
    id BIGSERIAL PRIMARY KEY,
    prompt_id BIGINT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    input_text TEXT NOT NULL,
    expected_output TEXT,
    category test_category NOT NULL DEFAULT 'happy_path',
    auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for test_cases
CREATE INDEX idx_test_cases_prompt_id ON test_cases(prompt_id);
CREATE INDEX idx_test_cases_category ON test_cases(category);

-- Test Runs table
CREATE TABLE test_runs (
    id BIGSERIAL PRIMARY KEY,
    prompt_id BIGINT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    prompt_version INTEGER NOT NULL,
    test_case_id BIGINT REFERENCES test_cases(id) ON DELETE SET NULL,
    input_text TEXT NOT NULL,
    output_text TEXT,
    success BOOLEAN,
    latency_ms INTEGER,
    tokens_used INTEGER,
    cost_cents INTEGER,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for test_runs
CREATE INDEX idx_test_runs_prompt_id ON test_runs(prompt_id);
CREATE INDEX idx_test_runs_test_case_id ON test_runs(test_case_id);
CREATE INDEX idx_test_runs_executed_at ON test_runs(executed_at DESC);

-- AI Generations table
CREATE TABLE ai_generations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_data JSONB NOT NULL,
    response_data JSONB NOT NULL,
    prompt_template TEXT NOT NULL,
    variables JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ai_provider TEXT,
    ai_model TEXT,
    tokens_used INTEGER,
    cost_cents INTEGER
);

-- Create indexes for ai_generations
CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at DESC);

-- Refresh Tokens table (for custom JWT implementation if needed)
CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create indexes for refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ================================
-- Row Level Security (RLS) Policies
-- ================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- ================================
-- Users Table RLS Policies
-- ================================

-- Users can read their own data
CREATE POLICY "Users can view own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their own data (except role)
CREATE POLICY "Users can update own data"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Allow insert for new users (triggered by Supabase Auth)
CREATE POLICY "Allow insert for authenticated users"
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ================================
-- Prompts Table RLS Policies
-- ================================

-- Anyone can view public prompts
CREATE POLICY "Anyone can view public prompts"
    ON prompts FOR SELECT
    USING (is_public = TRUE);

-- Users can view their own prompts
CREATE POLICY "Users can view own prompts"
    ON prompts FOR SELECT
    USING (created_by = auth.uid());

-- Editors and admins can create prompts
CREATE POLICY "Editors and admins can create prompts"
    ON prompts FOR INSERT
    WITH CHECK (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Users can update their own prompts (if editor or admin)
CREATE POLICY "Users can update own prompts"
    ON prompts FOR UPDATE
    USING (
        created_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Only admins can delete prompts
CREATE POLICY "Admins can delete prompts"
    ON prompts FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ================================
-- Deployments Table RLS Policies
-- ================================

-- Users can view all deployments (authenticated)
CREATE POLICY "Authenticated users can view deployments"
    ON deployments FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Editors and admins can create deployments
CREATE POLICY "Editors and admins can create deployments"
    ON deployments FOR INSERT
    WITH CHECK (
        auth.uid() = deployed_by AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- ================================
-- AB Policies Table RLS Policies
-- ================================

-- Users can view public AB policies
CREATE POLICY "Users can view public AB policies"
    ON ab_policies FOR SELECT
    USING (is_public = TRUE);

-- Users can view their own AB policies
CREATE POLICY "Users can view own AB policies"
    ON ab_policies FOR SELECT
    USING (created_by = auth.uid());

-- Editors and admins can create AB policies
CREATE POLICY "Editors and admins can create AB policies"
    ON ab_policies FOR INSERT
    WITH CHECK (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Users can update their own AB policies
CREATE POLICY "Users can update own AB policies"
    ON ab_policies FOR UPDATE
    USING (created_by = auth.uid());

-- Users can delete their own AB policies
CREATE POLICY "Users can delete own AB policies"
    ON ab_policies FOR DELETE
    USING (created_by = auth.uid());

-- ================================
-- AB Assignments Table RLS Policies
-- ================================

-- Users can view all AB assignments (authenticated)
CREATE POLICY "Authenticated users can view AB assignments"
    ON ab_assignments FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Authenticated users can create AB assignments
CREATE POLICY "Authenticated users can create AB assignments"
    ON ab_assignments FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ================================
-- Usage Events Table RLS Policies
-- ================================

-- Users can view all usage events (authenticated)
CREATE POLICY "Authenticated users can view usage events"
    ON usage_events FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Anyone can insert usage events (for tracking)
CREATE POLICY "Anyone can insert usage events"
    ON usage_events FOR INSERT
    WITH CHECK (TRUE);

-- ================================
-- Test Cases Table RLS Policies
-- ================================

-- Users can view test cases for prompts they can access
CREATE POLICY "Users can view test cases"
    ON test_cases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM prompts
            WHERE prompts.id = test_cases.prompt_id
            AND (prompts.is_public = TRUE OR prompts.created_by = auth.uid())
        )
    );

-- Editors and admins can create test cases
CREATE POLICY "Editors and admins can create test cases"
    ON test_cases FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Users can update test cases for their prompts
CREATE POLICY "Users can update test cases for own prompts"
    ON test_cases FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM prompts
            WHERE prompts.id = test_cases.prompt_id
            AND prompts.created_by = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Users can delete test cases for their prompts
CREATE POLICY "Users can delete test cases for own prompts"
    ON test_cases FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM prompts
            WHERE prompts.id = test_cases.prompt_id
            AND prompts.created_by = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- ================================
-- Test Runs Table RLS Policies
-- ================================

-- Users can view all test runs (authenticated)
CREATE POLICY "Authenticated users can view test runs"
    ON test_runs FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Editors and admins can create test runs
CREATE POLICY "Editors and admins can create test runs"
    ON test_runs FOR INSERT
    WITH CHECK (
        auth.uid() = executed_by AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- ================================
-- AI Generations Table RLS Policies
-- ================================

-- Users can view their own AI generations
CREATE POLICY "Users can view own AI generations"
    ON ai_generations FOR SELECT
    USING (user_id = auth.uid());

-- Users can create AI generations
CREATE POLICY "Users can create AI generations"
    ON ai_generations FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ================================
-- Refresh Tokens Table RLS Policies
-- ================================

-- Users can view their own refresh tokens
CREATE POLICY "Users can view own refresh tokens"
    ON refresh_tokens FOR SELECT
    USING (user_id = auth.uid());

-- Users can create their own refresh tokens
CREATE POLICY "Users can create own refresh tokens"
    ON refresh_tokens FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own refresh tokens
CREATE POLICY "Users can update own refresh tokens"
    ON refresh_tokens FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own refresh tokens
CREATE POLICY "Users can delete own refresh tokens"
    ON refresh_tokens FOR DELETE
    USING (user_id = auth.uid());

-- ================================
-- Functions and Triggers
-- ================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ab_policies updated_at
CREATE TRIGGER update_ab_policies_updated_at
    BEFORE UPDATE ON ab_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'editor');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ================================
-- Initial Data / Seed
-- ================================

-- Note: Admin user should be created through Supabase Auth UI or via Edge Function
-- The role can be updated manually in the users table after creation

-- ================================
-- Grants
-- ================================

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant access to tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
