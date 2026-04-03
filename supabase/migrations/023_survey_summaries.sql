-- AI-generated cohort summary for each survey.
-- Depends on 022_surveys.sql which creates the surveys table.
CREATE TABLE survey_summaries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id            UUID NOT NULL UNIQUE REFERENCES surveys(id) ON DELETE CASCADE,
  response_count       INTEGER NOT NULL DEFAULT 0,
  stats                JSONB NOT NULL DEFAULT '{}',
  summary_text         TEXT NOT NULL,
  key_takeaways        TEXT[] NOT NULL DEFAULT '{}',
  tool_recommendations TEXT NOT NULL,
  instructor_notes     TEXT NOT NULL,
  generated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
