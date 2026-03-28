-- 016: Bonus session support for course_sessions
-- Adds course_id (direct FK to courses) and bonus session columns/constraints.

-- 1. Add course_id column (nullable first for backfill)
ALTER TABLE course_sessions ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE CASCADE;

-- 2. Backfill course_id from existing curriculum sessions via their week
UPDATE course_sessions
SET course_id = (SELECT course_id FROM course_weeks WHERE id = course_sessions.week_id)
WHERE week_id IS NOT NULL;

-- 3. Make course_id NOT NULL now that all rows are populated
ALTER TABLE course_sessions ALTER COLUMN course_id SET NOT NULL;

-- 4. Add bonus session columns
ALTER TABLE course_sessions ADD COLUMN is_bonus BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE course_sessions ADD COLUMN bonus_type TEXT;
ALTER TABLE course_sessions ADD COLUMN description_en TEXT;
ALTER TABLE course_sessions ADD COLUMN description_jp TEXT;

-- 5. Make week_id and session_number nullable for bonus sessions
ALTER TABLE course_sessions ALTER COLUMN week_id DROP NOT NULL;
ALTER TABLE course_sessions ALTER COLUMN session_number DROP NOT NULL;

-- 6. Bonus sessions must have no week, curriculum sessions must have a week
ALTER TABLE course_sessions ADD CONSTRAINT chk_bonus_week
  CHECK (
    (is_bonus = false AND week_id IS NOT NULL)
    OR (is_bonus = true AND week_id IS NULL)
  );

-- 7. Bonus sessions must have a type, curriculum sessions must not
ALTER TABLE course_sessions ADD CONSTRAINT chk_bonus_type
  CHECK (
    (is_bonus = false AND bonus_type IS NULL)
    OR (is_bonus = true AND bonus_type IN ('office-hours', 'guest-speaker', 'workshop', 'qa'))
  );

-- 8. Index for efficient bonus session queries
CREATE INDEX idx_course_sessions_bonus ON course_sessions (course_id, is_bonus, scheduled_at);
