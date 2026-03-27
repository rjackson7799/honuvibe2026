-- Bonus session support for course_sessions
ALTER TABLE course_sessions ADD COLUMN is_bonus BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE course_sessions ADD COLUMN bonus_type TEXT;
ALTER TABLE course_sessions ADD COLUMN description_en TEXT;
ALTER TABLE course_sessions ADD COLUMN description_jp TEXT;

-- Make week_id and session_number nullable for bonus sessions
ALTER TABLE course_sessions ALTER COLUMN week_id DROP NOT NULL;
ALTER TABLE course_sessions ALTER COLUMN session_number DROP NOT NULL;

-- Bonus sessions must have no week, curriculum sessions must have a week
ALTER TABLE course_sessions ADD CONSTRAINT chk_bonus_week
  CHECK (
    (is_bonus = false AND week_id IS NOT NULL)
    OR (is_bonus = true AND week_id IS NULL)
  );

-- Bonus sessions must have a type, curriculum sessions must not
ALTER TABLE course_sessions ADD CONSTRAINT chk_bonus_type
  CHECK (
    (is_bonus = false AND bonus_type IS NULL)
    OR (is_bonus = true AND bonus_type IN ('office-hours', 'guest-speaker', 'workshop', 'qa'))
  );

-- Index for efficient bonus session queries
CREATE INDEX idx_course_sessions_bonus ON course_sessions (course_id, is_bonus, scheduled_at);
