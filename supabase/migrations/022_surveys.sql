-- supabase/migrations/022_surveys.sql

-- 1. Survey registry
CREATE TABLE surveys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,
  title_en   TEXT NOT NULL,
  title_jp   TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the existing AI Essentials survey
INSERT INTO surveys (slug, title_en, title_jp)
VALUES (
  'ai-essentials',
  'AI Essentials Pre-Course Survey',
  'AIエッセンシャル 受講前アンケート'
);

-- 2. Per-student survey assignments
CREATE TABLE survey_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  survey_id    UUID NOT NULL REFERENCES surveys(id),
  token        UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'completed')),
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, survey_id)
);

-- Index for fast token lookups (used on every survey page load with a token)
CREATE INDEX survey_assignments_token_idx ON survey_assignments(token);

-- 3. Link survey_responses to users and assignments (backward-compatible)
ALTER TABLE survey_responses
  ADD COLUMN user_id       UUID REFERENCES auth.users(id),
  ADD COLUMN assignment_id UUID REFERENCES survey_assignments(id);
