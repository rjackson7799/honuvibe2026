-- HonuVibe.AI Phase 2 Database Schema
-- Covers Phase 2A (Cohort Courses), Phase 2B (Content Library), Phase 2C (Self-Study)
-- All tables use UUID PKs, timestamptz, bilingual _en/_jp fields, and RLS

-- ============================================================
-- PHASE 2A: COHORT COURSE PLATFORM
-- ============================================================

-- 1. Extend users table (created by Supabase Auth)
-- Note: Run these after Supabase Auth creates the users table in auth.users
-- We create a public.users profile table that mirrors auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  role text DEFAULT 'student' CHECK (role IN ('student', 'admin', 'instructor')),
  stripe_customer_id text,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_stripe_id text,
  subscription_status text DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'past_due', 'cancelled', 'trialing')),
  subscription_expires_at timestamptz,
  locale_preference text DEFAULT 'en' CHECK (locale_preference IN ('en', 'ja')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Courses
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  course_id_code text UNIQUE,
  course_type text NOT NULL DEFAULT 'cohort' CHECK (course_type IN ('cohort', 'self-study')),

  -- Basic info
  title_en text NOT NULL,
  title_jp text,
  description_en text,
  description_jp text,
  instructor_name text,

  -- Pricing (smallest unit: cents for USD, yen for JPY)
  price_usd integer,
  price_jpy integer,

  -- Course metadata
  language text DEFAULT 'en' CHECK (language IN ('en', 'ja', 'both')),
  subtitle_language text,
  level text CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  format text,

  -- Cohort-specific
  start_date date,
  end_date date,
  total_weeks integer,
  live_sessions_count integer,
  recorded_lessons_count integer,
  max_enrollment integer,
  current_enrollment integer DEFAULT 0,

  -- Learning outcomes
  learning_outcomes_en jsonb,
  learning_outcomes_jp jsonb,
  prerequisites_en text,
  prerequisites_jp text,
  who_is_for_en jsonb,
  who_is_for_jp jsonb,
  tools_covered jsonb,

  -- Community
  community_platform text,
  community_duration_months integer,
  community_link text,

  -- Logistics
  zoom_link text,
  schedule_notes_en text,
  schedule_notes_jp text,
  cancellation_policy_en text,
  cancellation_policy_jp text,

  -- Completion requirements
  completion_requirements_en jsonb,
  completion_requirements_jp jsonb,

  -- Materials summary
  materials_summary_en jsonb,
  materials_summary_jp jsonb,

  -- Media
  thumbnail_url text,
  hero_image_url text,

  -- Tags
  tags jsonb,

  -- Status
  is_published boolean DEFAULT false,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in-progress', 'completed', 'archived')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_courses_slug ON courses (slug);
CREATE INDEX idx_courses_status ON courses (status);
CREATE INDEX idx_courses_published ON courses (is_published);

-- 3. Course Weeks
CREATE TABLE course_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  week_number integer NOT NULL,

  title_en text NOT NULL,
  title_jp text,
  subtitle_en text,
  subtitle_jp text,
  description_en text,
  description_jp text,

  phase text,
  unlock_date date,
  is_unlocked boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),

  UNIQUE(course_id, week_number)
);

CREATE INDEX idx_course_weeks_course ON course_weeks (course_id, week_number);

-- 4. Course Sessions
CREATE TABLE course_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES course_weeks(id) ON DELETE CASCADE,
  session_number integer NOT NULL DEFAULT 1,

  title_en text NOT NULL,
  title_jp text,

  format text NOT NULL CHECK (format IN ('live', 'recorded', 'hybrid')),
  duration_minutes integer,
  scheduled_at timestamptz,
  materials_en jsonb,
  materials_jp jsonb,

  topics_en jsonb,
  topics_jp jsonb,

  zoom_link text,

  -- Post-session content
  replay_url text,
  transcript_url text,
  slide_deck_url text,

  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),

  created_at timestamptz DEFAULT now(),

  UNIQUE(week_id, session_number)
);

CREATE INDEX idx_course_sessions_week ON course_sessions (week_id);

-- 5. Course Assignments
CREATE TABLE course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES course_weeks(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 1,

  title_en text NOT NULL,
  title_jp text,
  description_en text NOT NULL,
  description_jp text,

  assignment_type text DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'action-challenge', 'project')),
  due_date date,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_course_assignments_week ON course_assignments (week_id);

-- 6. Course Vocabulary
CREATE TABLE course_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES course_weeks(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 1,

  term_en text NOT NULL,
  term_jp text NOT NULL,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_course_vocabulary_week ON course_vocabulary (week_id);

-- 7. Course Resources
CREATE TABLE course_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES course_weeks(id) ON DELETE CASCADE,
  session_id uuid REFERENCES course_sessions(id) ON DELETE CASCADE,
  content_item_id uuid, -- References content_items (added after that table is created)
  sort_order integer DEFAULT 1,

  title_en text NOT NULL,
  title_jp text,
  url text,
  resource_type text CHECK (resource_type IN ('article', 'video', 'tool', 'template', 'download', 'guide')),
  description_en text,
  description_jp text,

  is_public boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),

  CHECK (week_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX idx_course_resources_week ON course_resources (week_id);
CREATE INDEX idx_course_resources_session ON course_resources (session_id);

-- 8. Enrollments
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,

  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_paid integer,
  currency text DEFAULT 'usd',

  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'refunded', 'cancelled')),

  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,

  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_enrollments_user ON enrollments (user_id);
CREATE INDEX idx_enrollments_course ON enrollments (course_id);

-- 9. Course Uploads (Audit Trail)
CREATE TABLE course_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.users(id),
  filename text,
  raw_markdown text NOT NULL,
  parsed_json jsonb,
  course_id uuid REFERENCES courses(id),

  status text DEFAULT 'parsed' CHECK (status IN ('parsing', 'parsed', 'confirmed', 'failed')),
  error_message text,

  uploaded_at timestamptz DEFAULT now()
);

-- 10. Applications (from Phase 1)
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  website text,
  engagement_type text,
  project_description text,
  desired_outcome text,
  referral_source text,
  timeline text,
  budget_range text,
  locale text DEFAULT 'en',
  status text DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'responded', 'archived')),
  notes text,

  submitted_at timestamptz DEFAULT now()
);

CREATE INDEX idx_applications_status ON applications (status);

-- ============================================================
-- PHASE 2B: CONTENT LIBRARY
-- ============================================================

-- 11. Content Items
CREATE TABLE content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title_en text NOT NULL,
  title_jp text,
  description_en text,
  description_jp text,

  content_type text NOT NULL CHECK (content_type IN (
    'video_custom', 'video_youtube', 'article', 'tool',
    'template', 'guide', 'course_recording'
  )),

  url text NOT NULL,
  source text NOT NULL DEFAULT 'external' CHECK (source IN ('honuvibe', 'youtube', 'external')),
  thumbnail_url text,

  duration_minutes integer,
  author_name text,
  publish_date date,

  difficulty_level text DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  language text DEFAULT 'en' CHECK (language IN ('en', 'ja', 'both')),

  tags jsonb DEFAULT '[]',

  access_tier text DEFAULT 'free' CHECK (access_tier IN ('free', 'premium')),

  source_course_id uuid REFERENCES courses(id),
  source_session_id uuid REFERENCES course_sessions(id),

  admin_notes text,

  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,

  view_count integer DEFAULT 0,
  usage_in_paths integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_content_items_tags ON content_items USING GIN (tags);
CREATE INDEX idx_content_items_type ON content_items (content_type);
CREATE INDEX idx_content_items_tier ON content_items (access_tier);
CREATE INDEX idx_content_items_published ON content_items (is_published);

-- Add FK to course_resources now that content_items exists
ALTER TABLE course_resources
  ADD CONSTRAINT fk_course_resources_content_item
  FOREIGN KEY (content_item_id) REFERENCES content_items(id);

-- 12. Tags (Canonical)
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_jp text,
  category text CHECK (category IN ('topic', 'tool', 'skill', 'industry', 'format')),
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed initial tags
INSERT INTO tags (slug, name_en, name_jp, category) VALUES
  ('ai-fundamentals', 'AI Fundamentals', 'AI基礎', 'topic'),
  ('prompt-engineering', 'Prompt Engineering', 'プロンプトエンジニアリング', 'topic'),
  ('business-ai', 'Business AI', 'ビジネスAI', 'topic'),
  ('productivity', 'Productivity', '生産性', 'topic'),
  ('content-creation', 'Content Creation', 'コンテンツ作成', 'topic'),
  ('research', 'Research & Analysis', 'リサーチ・分析', 'topic'),
  ('automation', 'Automation', '自動化', 'topic'),
  ('ethics', 'AI Ethics', 'AI倫理', 'topic'),
  ('bilingual', 'Bilingual / EN-JP', 'バイリンガル', 'topic'),
  ('career', 'Career Development', 'キャリア開発', 'topic'),
  ('chatgpt', 'ChatGPT', 'ChatGPT', 'tool'),
  ('claude', 'Claude', 'Claude', 'tool'),
  ('gemini', 'Gemini', 'Gemini', 'tool'),
  ('perplexity', 'Perplexity', 'Perplexity', 'tool'),
  ('notebooklm', 'NotebookLM', 'NotebookLM', 'tool'),
  ('zapier', 'Zapier', 'Zapier', 'tool'),
  ('canva-ai', 'Canva AI', 'Canva AI', 'tool'),
  ('gamma', 'Gamma', 'Gamma', 'tool'),
  ('cursor', 'Cursor', 'Cursor', 'tool'),
  ('deepl', 'DeepL', 'DeepL', 'tool'),
  ('writing', 'Writing & Communication', 'ライティング・コミュニケーション', 'skill'),
  ('data-analysis', 'Data Analysis', 'データ分析', 'skill'),
  ('translation', 'Translation & Localization', '翻訳・ローカリゼーション', 'skill'),
  ('project-management', 'Project Management', 'プロジェクト管理', 'skill'),
  ('small-business', 'Small Business', 'スモールビジネス', 'industry'),
  ('nonprofit', 'Nonprofit', '非営利団体', 'industry'),
  ('freelance', 'Freelance / Solopreneur', 'フリーランス', 'industry'),
  ('tutorial', 'Tutorial', 'チュートリアル', 'format'),
  ('overview', 'Overview / Explainer', '概要', 'format'),
  ('case-study', 'Case Study', 'ケーススタディ', 'format'),
  ('hands-on', 'Hands-On / Workshop', '実践ワークショップ', 'format'),
  ('comparison', 'Tool Comparison', 'ツール比較', 'format');

-- 13. Content Collections
CREATE TABLE content_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_jp text,
  description_en text,
  description_jp text,
  is_published boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE content_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES content_collections(id) ON DELETE CASCADE,
  content_item_id uuid REFERENCES content_items(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  note_en text,
  note_jp text,
  UNIQUE(collection_id, content_item_id)
);

-- ============================================================
-- PHASE 2C: SELF-STUDY & AI PATHS
-- ============================================================

-- 14. Study Paths
CREATE TABLE study_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,

  goal_description text NOT NULL,
  difficulty_preference text DEFAULT 'beginner' CHECK (difficulty_preference IN ('beginner', 'intermediate', 'advanced')),
  language_preference text DEFAULT 'en' CHECK (language_preference IN ('en', 'ja')),
  focus_areas jsonb,

  title_en text,
  title_jp text,
  description_en text,
  description_jp text,
  estimated_hours numeric(4,1),
  total_items integer,
  free_items integer,
  premium_items integer,

  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived', 'regenerating')),

  generation_model text,
  generation_prompt_version text,

  generated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_accessed_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_study_paths_user ON study_paths (user_id);
CREATE INDEX idx_study_paths_status ON study_paths (status);

-- 15. Study Path Items
CREATE TABLE study_path_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid REFERENCES study_paths(id) ON DELETE CASCADE,
  content_item_id uuid REFERENCES content_items(id) ON DELETE CASCADE,

  sort_order integer NOT NULL,

  rationale_en text,
  rationale_jp text,
  learning_focus_en text,
  learning_focus_jp text,

  is_completed boolean DEFAULT false,
  completed_at timestamptz,

  -- Denormalized for quick rendering
  item_title_en text,
  item_content_type text,
  item_access_tier text,
  item_duration_minutes integer,

  created_at timestamptz DEFAULT now(),

  UNIQUE(path_id, content_item_id)
);

CREATE INDEX idx_path_items_path ON study_path_items (path_id, sort_order);

-- 16. Path Generation Logs
CREATE TABLE path_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid REFERENCES study_paths(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id),

  goal_description text,
  preferences jsonb,
  content_catalog_size integer,
  prompt_version text,

  raw_response text,
  parsed_successfully boolean,
  items_generated integer,
  generation_time_ms integer,

  input_tokens integer,
  output_tokens integer,

  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function to check admin role (SECURITY DEFINER bypasses RLS to avoid circular reference)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users: users can read/update their own profile
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_read" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_own_update" ON public.users
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL USING (
    public.is_admin()
  );

-- Courses: public read for published, admin all
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_public_read" ON courses
  FOR SELECT USING (is_published = true);
CREATE POLICY "courses_admin_all" ON courses
  FOR ALL USING (
    public.is_admin()
  );

-- Course weeks: public read for published courses
ALTER TABLE course_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weeks_public_read" ON course_weeks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE courses.id = course_weeks.course_id AND courses.is_published = true)
  );
CREATE POLICY "weeks_admin_all" ON course_weeks
  FOR ALL USING (
    public.is_admin()
  );

-- Course sessions: public read for published courses
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_public_read" ON course_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_weeks w
      JOIN courses c ON c.id = w.course_id
      WHERE w.id = course_sessions.week_id AND c.is_published = true
    )
  );
CREATE POLICY "sessions_admin_all" ON course_sessions
  FOR ALL USING (
    public.is_admin()
  );

-- Course assignments: public read for published courses
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_public_read" ON course_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_weeks w
      JOIN courses c ON c.id = w.course_id
      WHERE w.id = course_assignments.week_id AND c.is_published = true
    )
  );
CREATE POLICY "assignments_admin_all" ON course_assignments
  FOR ALL USING (
    public.is_admin()
  );

-- Course vocabulary: public read for published courses
ALTER TABLE course_vocabulary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocabulary_public_read" ON course_vocabulary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_weeks w
      JOIN courses c ON c.id = w.course_id
      WHERE w.id = course_vocabulary.week_id AND c.is_published = true
    )
  );
CREATE POLICY "vocabulary_admin_all" ON course_vocabulary
  FOR ALL USING (
    public.is_admin()
  );

-- Course resources: public read for published courses (public resources only)
ALTER TABLE course_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources_public_read" ON course_resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_weeks w
      JOIN courses c ON c.id = w.course_id
      WHERE w.id = course_resources.week_id AND c.is_published = true
    )
  );
CREATE POLICY "resources_admin_all" ON course_resources
  FOR ALL USING (
    public.is_admin()
  );

-- Enrollments: users see only their own
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_own_read" ON enrollments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "enrollments_own_insert" ON enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "enrollments_admin_all" ON enrollments
  FOR ALL USING (
    public.is_admin()
  );

-- Course uploads: admin only
ALTER TABLE course_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uploads_admin_only" ON course_uploads
  FOR ALL USING (
    public.is_admin()
  );

-- Applications: admin only
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_admin_only" ON applications
  FOR ALL USING (
    public.is_admin()
  );
-- Allow unauthenticated inserts for the apply form
CREATE POLICY "applications_public_insert" ON applications
  FOR INSERT WITH CHECK (true);

-- Content items: published items readable by all
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_public_read" ON content_items
  FOR SELECT USING (is_published = true);
CREATE POLICY "content_admin_all" ON content_items
  FOR ALL USING (
    public.is_admin()
  );

-- Tags: readable by all
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_public_read" ON tags FOR SELECT USING (true);
CREATE POLICY "tags_admin_all" ON tags
  FOR ALL USING (
    public.is_admin()
  );

-- Content collections: published readable by all
ALTER TABLE content_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_public_read" ON content_collections
  FOR SELECT USING (is_published = true);
CREATE POLICY "collections_admin_all" ON content_collections
  FOR ALL USING (
    public.is_admin()
  );

ALTER TABLE content_collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collection_items_public_read" ON content_collection_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM content_collections WHERE id = collection_id AND is_published = true)
  );
CREATE POLICY "collection_items_admin_all" ON content_collection_items
  FOR ALL USING (
    public.is_admin()
  );

-- Study paths: users see only their own
ALTER TABLE study_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paths_own" ON study_paths
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "paths_admin_read" ON study_paths
  FOR SELECT USING (
    public.is_admin()
  );

-- Path items: users see only items in their own paths
ALTER TABLE study_path_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "path_items_own" ON study_path_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM study_paths WHERE id = study_path_items.path_id AND user_id = auth.uid())
  );
CREATE POLICY "path_items_admin_read" ON study_path_items
  FOR SELECT USING (
    public.is_admin()
  );

-- Generation logs: admin only
ALTER TABLE path_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gen_logs_admin" ON path_generation_logs
  FOR SELECT USING (
    public.is_admin()
  );
