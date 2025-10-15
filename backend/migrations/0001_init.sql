-- Minimal schema (optional; app also auto-creates with SQLAlchemy)
CREATE TYPE role_enum AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role role_enum NOT NULL DEFAULT 'editor',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INT NOT NULL,
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN DEFAULT TRUE,
    CONSTRAINT uq_prompt_name_version UNIQUE (name, version)
);

CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    prompt_id INT NOT NULL REFERENCES prompts(id),
    environment VARCHAR(32) NOT NULL,
    deployed_at TIMESTAMPTZ DEFAULT NOW(),
    deployed_by INT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ab_policies (
    id SERIAL PRIMARY KEY,
    prompt_name VARCHAR(255) UNIQUE NOT NULL,
    weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_assignments (
    id SERIAL PRIMARY KEY,
    experiment_name VARCHAR(255) NOT NULL,
    prompt_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    version INT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_assignment_unique UNIQUE (experiment_name, prompt_name, user_id)
);

CREATE TABLE IF NOT EXISTS usage_events (
    id SERIAL PRIMARY KEY,
    prompt_id INT NOT NULL REFERENCES prompts(id),
    user_id VARCHAR(255),
    output TEXT,
    success BOOLEAN DEFAULT TRUE,
    latency_ms INT,
    cost INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

