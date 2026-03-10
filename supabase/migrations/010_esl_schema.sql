-- ESL Lesson Generator Schema
-- Adds ESL content generation, audio, progress tracking, and purchase tables
-- ESL content maps to course_weeks (one ESL module per week)

-- ============================================================
-- 1. ALTER courses — add ESL configuration columns
-- ============================================================

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS esl_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS esl_included boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS esl_price_usd integer,
  ADD COLUMN IF NOT EXISTS esl_price_jpy integer,
  ADD COLUMN IF NOT EXISTS esl_settings_json jsonb;

-- ============================================================
-- 2. ESL Lessons — one per course_week
-- ============================================================

CREATE TABLE esl_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES course_weeks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating', 'review', 'published', 'failed')),
  vocabulary_json jsonb,
  grammar_json jsonb,
  cultural_notes_json jsonb,
  comprehension_json jsonb,
  generation_error text,
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(week_id)
);

CREATE INDEX idx_esl_lessons_course_id ON esl_lessons(course_id);
CREATE INDEX idx_esl_lessons_course_status ON esl_lessons(course_id, status);
CREATE INDEX idx_esl_lessons_week_id ON esl_lessons(week_id);

-- ============================================================
-- 3. ESL Audio — TTS audio files per ESL lesson
-- ============================================================

CREATE TABLE esl_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  esl_lesson_id uuid NOT NULL REFERENCES esl_lessons(id) ON DELETE CASCADE,
  reference_key text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  duration_seconds numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_esl_audio_lesson_id ON esl_audio(esl_lesson_id);

-- ============================================================
-- 4. ESL Progress — per-user per-week progress tracking
-- ============================================================

CREATE TABLE esl_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  esl_lesson_id uuid NOT NULL REFERENCES esl_lessons(id) ON DELETE CASCADE,
  vocabulary_completed jsonb DEFAULT '[]',
  comprehension_score integer,
  flashcard_known jsonb DEFAULT '[]',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, esl_lesson_id)
);

CREATE INDEX idx_esl_progress_user_id ON esl_progress(user_id);

-- ============================================================
-- 5. ESL Purchases — add-on purchases (when not bundled)
-- ============================================================

CREATE TABLE esl_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  stripe_checkout_session_id text,
  amount_paid integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_esl_purchases_user_course ON esl_purchases(user_id, course_id);

-- ============================================================
-- 6. Update payments type constraint to include esl_purchase
-- ============================================================

ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_type_check,
  ADD CONSTRAINT payments_type_check
    CHECK (type IN ('course_purchase', 'vault_subscription', 'vault_renewal', 'esl_purchase'));

-- ============================================================
-- 7. RLS Policies
-- ============================================================

-- ESL Lessons
ALTER TABLE esl_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published ESL lessons readable by enrolled students"
  ON esl_lessons FOR SELECT
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.user_id = auth.uid()
      AND e.course_id = esl_lessons.course_id
      AND e.status = 'active'
    )
  );

CREATE POLICY "Admin can view all ESL lessons"
  ON esl_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admin can insert ESL lessons"
  ON esl_lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Admin can update ESL lessons"
  ON esl_lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Service role can manage ESL lessons"
  ON esl_lessons FOR ALL
  USING (true)
  WITH CHECK (true);

-- ESL Audio
ALTER TABLE esl_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ESL audio readable when lesson is published"
  ON esl_audio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM esl_lessons el
      WHERE el.id = esl_audio.esl_lesson_id
      AND el.status = 'published'
    )
  );

CREATE POLICY "Admin can manage ESL audio"
  ON esl_audio FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'instructor')
    )
  )
  WITH CHECK (true);

CREATE POLICY "Service role can manage ESL audio"
  ON esl_audio FOR ALL
  USING (true)
  WITH CHECK (true);

-- ESL Progress
ALTER TABLE esl_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ESL progress"
  ON esl_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ESL progress"
  ON esl_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ESL progress"
  ON esl_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all ESL progress"
  ON esl_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ESL Purchases
ALTER TABLE esl_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ESL purchases"
  ON esl_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert ESL purchases"
  ON esl_purchases FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can view all ESL purchases"
  ON esl_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- 8. Supabase Storage bucket for ESL audio
-- ============================================================
-- Note: Create the 'esl-audio' bucket via Supabase dashboard
-- or via the Supabase CLI with public read access enabled.
-- Bucket policy: public read, authenticated upload (admin only).
