-- ============================================================
-- VERTICE SOCIETY PARTNER SEED
-- ============================================================
-- Seeds a 'vertice-society' row into the partners table so
-- Vertice enrollments (created manually via /admin/students/new
-- with Partner attribution set) show up in
-- /admin/partners/<vertice_id>/enrollments for reporting.
--
-- The existing bespoke /partners/vertice-society landing page
-- stays live (it has custom invite-code enrollment logic).
-- This seed is for attribution only — NOT a migration to the
-- generic /partners/[slug] template.
--
-- Usage:
--   psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed_vertice_partner.sql
--   OR paste into Supabase Dashboard SQL Editor
--
-- Safe to re-run: uses ON CONFLICT upserts.
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
  'vertice-society',
  'Vertice Society', 'Vertice Society',
  'AI Essentials — exclusive 5-week program for Vertice Society members',
  'Vertice Society メンバー限定 5週間AI教育プログラム',
  'HonuVibe partners with Vertice Society to deliver a 5-week AI education program exclusively for their members. Payments are collected by Vertice Society directly; HonuVibe grants course access upon confirmed enrollment.',
  'HonuVibeはVertice Societyと提携し、メンバー限定の5週間AI教育プログラムを提供しています。受講料はVertice Societyが直接徴収し、HonuVibeは確認後にコースアクセスを付与します。',
  NULL,
  NULL,
  NULL,
  NULL,
  'partners@honuvibe.ai',
  0,                         -- rev-share % — payments collected off-platform by Vertice
  false,                     -- is_public=false → noindex (invite-only program)
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_jp = EXCLUDED.name_jp,
  tagline_en = EXCLUDED.tagline_en,
  tagline_jp = EXCLUDED.tagline_jp,
  description_en = EXCLUDED.description_en,
  description_jp = EXCLUDED.description_jp,
  is_public = EXCLUDED.is_public,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Verify
SELECT
  p.slug,
  p.name_en,
  p.is_public,
  p.is_active,
  (SELECT count(*) FROM enrollments e WHERE e.partner_id = p.id) AS attributed_enrollments
FROM partners p
WHERE p.slug = 'vertice-society';
