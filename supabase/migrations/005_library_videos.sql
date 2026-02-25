-- Library Videos: Quick-learn tutorial videos (3-7 min)
-- Part of the content flywheel: visitor → registered user → course student

-- ============================================================
-- Table: library_videos
-- ============================================================
create table library_videos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_jp text,
  description_en text,
  description_jp text,
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer not null,
  category text not null check (category in (
    'ai-basics',
    'coding-tools',
    'business-automation',
    'image-video',
    'productivity',
    'getting-started'
  )),
  language text default 'en' check (language in ('en', 'ja', 'both')),
  access_tier text default 'free_account' check (access_tier in ('open', 'free_account')),
  difficulty text default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  related_course_id uuid references courses(id) on delete set null,
  related_resource_slug text,
  related_glossary_slugs text[],
  tags text[],
  sort_order integer default 0,
  is_featured boolean default false,
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for common queries
create index idx_library_videos_category on library_videos(category) where is_published = true;
create index idx_library_videos_published on library_videos(is_published, published_at desc);
create index idx_library_videos_slug on library_videos(slug);

-- RLS: anyone can read published videos
alter table library_videos enable row level security;
create policy "library_videos_public_read" on library_videos
  for select using (is_published = true);

-- Admin write access
create policy "library_videos_admin_all" on library_videos
  for all using (public.is_admin());

-- ============================================================
-- Table: user_library_favorites
-- ============================================================
create table user_library_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references library_videos(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, video_id)
);

-- Index for fast lookup
create index idx_library_favorites_user on user_library_favorites(user_id);

-- RLS: users see and manage only their own
alter table user_library_favorites enable row level security;
create policy "favorites_select_own" on user_library_favorites
  for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on user_library_favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on user_library_favorites
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Table: user_library_progress
-- ============================================================
create table user_library_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references library_videos(id) on delete cascade,
  progress_percent integer default 0 check (progress_percent between 0 and 100),
  completed boolean default false,
  last_watched_at timestamptz default now(),
  completed_at timestamptz,
  unique(user_id, video_id)
);

-- Index for fast lookup
create index idx_library_progress_user on user_library_progress(user_id);

-- RLS: users see and manage only their own
alter table user_library_progress enable row level security;
create policy "progress_select_own" on user_library_progress
  for select using (auth.uid() = user_id);
create policy "progress_upsert_own" on user_library_progress
  for insert with check (auth.uid() = user_id);
create policy "progress_update_own" on user_library_progress
  for update using (auth.uid() = user_id);
