-- ============================================================
-- Community RLS test fixtures — partner rows
-- ============================================================
-- Idempotent seed of fixture partner records (Vertice + SmashHaus).
-- The auth.users / public.users rows themselves are seeded from
-- supabase/tests/helpers/fixtures.ts via the admin API, so the IDs
-- match between auth.users and public.users.
--
-- Run via: psql "$TEST_DB_URL" -f supabase/seed_community_test_users.sql
-- (the test runner also calls seedFixtures() in helpers/fixtures.ts which
--  upserts these rows defensively, so running this manually is optional.)
-- ============================================================

BEGIN;

INSERT INTO partners (id, slug, name_en, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'vertice-society', 'Vertice Society (fixture)', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO partners (id, slug, name_en, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'smashhaus', 'SmashHaus (fixture)', true)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
