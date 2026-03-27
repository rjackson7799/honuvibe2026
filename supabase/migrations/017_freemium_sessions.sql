-- 017: Add freemium preview support to courses
-- Allows the first N sessions of a course to be freely accessible to logged-in users

ALTER TABLE courses
  ADD COLUMN free_preview_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN courses.free_preview_count IS
  'Number of sessions (from beginning, ordered by week+session number) available for free to logged-in users. 0 = fully paid.';
