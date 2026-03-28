-- Fix: Add course_id column to course_sessions for bonus session support.
-- Bonus sessions have week_id = NULL, so they need a direct course reference.

-- 1. Add the column (nullable first for backfill)
ALTER TABLE course_sessions ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE CASCADE;

-- 2. Backfill from existing curriculum sessions via their week
UPDATE course_sessions
SET course_id = (SELECT course_id FROM course_weeks WHERE id = course_sessions.week_id)
WHERE week_id IS NOT NULL;

-- 3. Make it NOT NULL now that all rows are populated
ALTER TABLE course_sessions ALTER COLUMN course_id SET NOT NULL;

-- 4. Create the index that migration 016 intended
CREATE INDEX IF NOT EXISTS idx_course_sessions_bonus ON course_sessions (course_id, is_bonus, scheduled_at);
