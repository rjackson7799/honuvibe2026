-- 025: Add private course visibility flag.
-- Private courses stay published and reachable by direct URL,
-- but are hidden from public catalog surfaces like /learn.

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_courses_private
  ON courses (is_private);
