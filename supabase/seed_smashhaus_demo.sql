-- ============================================================
-- SMASHHAUS DEMO PARTNER SEED
-- ============================================================
-- Seeds a SmashHaus partner row for demo purposes so
-- /partners/smashhaus renders a co-branded landing page.
--
-- Usage:
--   psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed_smashhaus_demo.sql
--   OR paste into Supabase Dashboard SQL Editor
--
-- Safe to re-run: uses ON CONFLICT upserts.
--
-- NOTE: Colors, copy, and course selection are PLACEHOLDERS.
-- Swap with final SmashHaus branding before sharing the URL
-- with Dylan.
-- ============================================================

INSERT INTO partners (
  slug,
  name_en, name_jp,
  tagline_en, tagline_jp,
  description_en, description_jp,
  logo_url,
  primary_color, secondary_color,
  website_url,
  contact_email,
  revenue_share_pct,
  is_public,
  is_active
) VALUES (
  'smashhaus',
  'SmashHaus', 'スマッシュハウス',
  'AI tools for the world''s music makers',
  '世界の音楽制作者のためのAIツール',
  'HonuVibe partners with SmashHaus to bring AI fluency to a global community of producers, engineers, and creators. Learn to use Claude, ChatGPT, and agentic workflows to accelerate your craft — without losing the human touch.',
  'HonuVibeはSmashHausと提携し、世界中のプロデューサー、エンジニア、クリエイターにAIの活用法を届けます。人間らしさを保ちながら、Claude・ChatGPT・エージェント型ワークフローで制作を加速させましょう。',
  NULL,                      -- logo_url: replace with SmashHaus logo URL
  '#FF3366',                 -- primary_color placeholder (swap with SmashHaus brand)
  '#FFB800',                 -- secondary_color placeholder
  'https://smashhaus.com',
  'partners@honuvibe.ai',
  0,                         -- rev-share % finalized off-platform
  false,                     -- is_public=false → noindex during demo
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_jp = EXCLUDED.name_jp,
  tagline_en = EXCLUDED.tagline_en,
  tagline_jp = EXCLUDED.tagline_jp,
  description_en = EXCLUDED.description_en,
  description_jp = EXCLUDED.description_jp,
  logo_url = EXCLUDED.logo_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  website_url = EXCLUDED.website_url,
  contact_email = EXCLUDED.contact_email,
  is_public = EXCLUDED.is_public,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Attach the three demo courses (or whichever courses are live) so the
-- page renders with content. Adjust the WHERE IN list to feature the
-- specific courses Dylan's audience would care about.
INSERT INTO partner_courses (partner_id, course_id, display_order)
SELECT
  p.id,
  c.id,
  ROW_NUMBER() OVER (ORDER BY c.created_at) - 1
FROM partners p
CROSS JOIN courses c
WHERE p.slug = 'smashhaus'
  AND c.is_published = true
  AND c.is_private = false
ORDER BY c.created_at
LIMIT 3
ON CONFLICT (partner_id, course_id) DO NOTHING;

-- Verify
SELECT
  p.slug,
  p.name_en,
  p.is_public,
  p.is_active,
  (SELECT count(*) FROM partner_courses pc WHERE pc.partner_id = p.id) AS course_count
FROM partners p
WHERE p.slug = 'smashhaus';
