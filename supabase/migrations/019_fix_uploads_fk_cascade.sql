-- Fix: FKs without ON DELETE action block course deletion.
-- Change to SET NULL so referencing records are preserved but don't block deletes.

-- course_uploads.course_id (audit trail)
ALTER TABLE course_uploads DROP CONSTRAINT IF EXISTS course_uploads_course_id_fkey;
ALTER TABLE course_uploads
  ADD CONSTRAINT course_uploads_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- content_items.source_course_id (optional back-reference)
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_source_course_id_fkey;
ALTER TABLE content_items
  ADD CONSTRAINT content_items_source_course_id_fkey
  FOREIGN KEY (source_course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- content_items.source_session_id (optional back-reference)
ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_source_session_id_fkey;
ALTER TABLE content_items
  ADD CONSTRAINT content_items_source_session_id_fkey
  FOREIGN KEY (source_session_id) REFERENCES course_sessions(id) ON DELETE SET NULL;
