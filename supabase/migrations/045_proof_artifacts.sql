-- ============================================================================
-- 045_proof_artifacts.sql — Social-proof library (testimonials / case studies)
-- ============================================================================
-- See docs/plans/2026-06-07-maven-conversion-build.md (P1a).
--
-- Admin-authored proof stories surfaced on marketing pages. This round is
-- admin-entry only (no learner self-serve capture) — Ryan enters the 3 real
-- permissioned stories via /admin/proof.
--
-- Security model (the important part):
--   * The base table is ADMIN-ONLY at the row level (no public SELECT policy).
--   * The PUBLIC reads a SANITIZED VIEW (proof_artifacts_public) that exposes
--     only published rows AND gates sensitive columns by the per-row permission
--     flags. RLS is row-level, so a published row would otherwise leak columns
--     even when name_public / logo_permission are false. The view does the
--     column-level gating the base table cannot.
--   * Permission flags and notes are NEVER exposed by the view.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.proof_artifacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_type     text NOT NULL DEFAULT 'testimonial'
                      CHECK (artifact_type IN ('testimonial', 'case_study', 'student_outcome')),
  proof_source      text NOT NULL DEFAULT 'manual'
                      CHECK (proof_source IN ('cohort', 'event', 'consulting', 'manual')),

  -- Bilingual narrative (quote is the core asset; title is an optional headline)
  quote_en          text NOT NULL,
  quote_jp          text,
  title_en          text,
  title_jp          text,

  -- Attribution
  person_name       text,
  role_en           text,
  role_jp           text,
  org               text,
  organization_url  text,
  person_image_url  text,
  logo_url          text,
  rating            integer CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  metrics_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  course_id         uuid REFERENCES public.courses(id) ON DELETE SET NULL,

  -- Permissions (admin-recorded). Gate public display column-by-column.
  quote_permission  boolean NOT NULL DEFAULT false,
  name_public       boolean NOT NULL DEFAULT false,
  logo_permission   boolean NOT NULL DEFAULT false,
  permission_notes  text,

  -- Publication
  is_published      boolean NOT NULL DEFAULT false,
  is_featured       boolean NOT NULL DEFAULT false,
  display_order     integer NOT NULL DEFAULT 0,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proof_artifacts_published
  ON public.proof_artifacts(is_published, is_featured, display_order);

-- ----------------------------------------------------------------------------
-- RLS — base table is admin-only. No public SELECT policy: the public reads the
-- sanitized view below, never raw rows.
-- ----------------------------------------------------------------------------
ALTER TABLE public.proof_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proof_artifacts_admin_all" ON public.proof_artifacts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- Sanitized public view — published rows only, with COLUMN-LEVEL permission
-- gating. security_invoker = false (default): the view runs as its owner and
-- bypasses the base-table RLS, exposing only this permitted projection. The
-- querying role needs SELECT on the view (granted below), not on the table.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.proof_artifacts_public
WITH (security_invoker = false) AS
  SELECT
    id,
    artifact_type,
    CASE WHEN quote_permission THEN quote_en ELSE NULL END AS quote_en,
    CASE WHEN quote_permission THEN quote_jp ELSE NULL END AS quote_jp,
    title_en,
    title_jp,
    CASE WHEN name_public THEN person_name ELSE NULL END AS person_name,
    CASE WHEN name_public THEN role_en ELSE NULL END AS role_en,
    CASE WHEN name_public THEN role_jp ELSE NULL END AS role_jp,
    CASE WHEN name_public THEN org ELSE NULL END AS org,
    CASE WHEN name_public THEN person_image_url ELSE NULL END AS person_image_url,
    CASE WHEN logo_permission THEN logo_url ELSE NULL END AS logo_url,
    CASE WHEN logo_permission THEN organization_url ELSE NULL END AS organization_url,
    rating,
    metrics_json,
    course_id,
    is_featured,
    display_order
  FROM public.proof_artifacts
  WHERE is_published = true;

-- Permission/notes columns are intentionally absent from the view.
GRANT SELECT ON public.proof_artifacts_public TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- updated_at trigger (mirrors 044 sync_*_updated_at pattern)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_proof_artifacts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proof_artifacts_updated_at
  BEFORE UPDATE ON public.proof_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.sync_proof_artifacts_updated_at();

COMMIT;
