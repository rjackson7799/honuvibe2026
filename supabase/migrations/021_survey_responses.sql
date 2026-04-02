CREATE TABLE survey_responses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_slug             TEXT NOT NULL DEFAULT 'ai-essentials',
  submitted_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Section 1: About You
  name                    TEXT NOT NULL,
  professional_background TEXT NOT NULL,
  role_description        TEXT NOT NULL,

  -- Section 2: AI Experience
  ai_knowledge_level      TEXT NOT NULL,
  ai_tools_used           TEXT[] NOT NULL,
  ai_usage_frequency      TEXT NOT NULL,

  -- Section 3: Goals
  learning_reasons        TEXT[] NOT NULL,
  ai_help_with            TEXT[] NOT NULL,

  -- Section 4: Expectations
  success_definition      TEXT NOT NULL,
  current_feeling         TEXT NOT NULL,

  -- Section 5: Free Writing (optional)
  specific_interests      TEXT,

  -- Section 6: Logistics
  has_laptop              TEXT NOT NULL,
  used_zoom_before        TEXT NOT NULL
);

-- No RLS — write-only from API route using service role key
-- Read access via admin panel only (server-side, role-gated)
