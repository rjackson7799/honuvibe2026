-- ============================================================
-- MULTI-INSTRUCTOR SUPPORT
-- ============================================================
-- Adds many-to-many course↔instructor relationship and
-- per-session instructor assignment.
-- ============================================================

-- 1. Join table: course_instructors (many-to-many)
CREATE TABLE course_instructors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES instructor_profiles(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'instructor'
                CHECK (role IN ('lead', 'instructor', 'guest')),
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(course_id, instructor_id)
);

CREATE INDEX idx_course_instructors_course ON course_instructors(course_id);
CREATE INDEX idx_course_instructors_instructor ON course_instructors(instructor_id);

-- 2. Per-session instructor assignment
ALTER TABLE course_sessions
  ADD COLUMN instructor_id uuid REFERENCES instructor_profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_course_sessions_instructor ON course_sessions(instructor_id);

-- 3. RLS policies for course_instructors
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;

-- Public can read instructors for published courses
CREATE POLICY "course_instructors_public_read" ON course_instructors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_instructors.course_id
        AND courses.is_published = true
    )
  );

-- Admin can do everything
CREATE POLICY "course_instructors_admin_all" ON course_instructors
  FOR ALL USING (public.is_admin());

-- 4. Migrate existing single-instructor data into the join table
INSERT INTO course_instructors (course_id, instructor_id, role, sort_order)
SELECT id, instructor_id, 'lead', 0
FROM courses
WHERE instructor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- NOTE: courses.instructor_id is kept for backward compatibility.
-- It will be removed in a future migration once all code reads from course_instructors.
