-- ============================================================
-- PARTNERS — Co-branded landing pages, course assignment,
-- attribution, and partner portal access.
-- ============================================================

-- 1. Extend users role to include 'partner'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'admin', 'instructor', 'partner'));

-- 2. Partners: branding + contact + settings
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,

  name_en text NOT NULL,
  name_jp text,
  tagline_en text,
  tagline_jp text,
  description_en text,
  description_jp text,

  logo_url text,
  primary_color text,   -- hex, overrides --accent-teal on landing page
  secondary_color text, -- hex, overrides --accent-gold

  website_url text,
  contact_email text,

  revenue_share_pct numeric(5,2) DEFAULT 0,

  is_public boolean DEFAULT true,   -- controls SEO indexability
  is_active boolean DEFAULT true,   -- soft-delete toggle

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active);

-- 3. Partner ↔ Course assignment (featured courses on partner landing)
CREATE TABLE IF NOT EXISTS partner_courses (
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  course_id  uuid REFERENCES courses(id)  ON DELETE CASCADE,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (partner_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_courses_partner
  ON partner_courses(partner_id, display_order);

-- 4. Partner portal access — which users can view a partner's dashboard
CREATE TABLE IF NOT EXISTS partner_admins (
  partner_id uuid REFERENCES partners(id)     ON DELETE CASCADE,
  user_id    uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (partner_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_admins_user ON partner_admins(user_id);

-- 5. Attribution — nullable, non-breaking additions
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id);
CREATE INDEX IF NOT EXISTS idx_enrollments_partner ON enrollments(partner_id);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by_partner_id uuid REFERENCES partners(id);
CREATE INDEX IF NOT EXISTS idx_users_referred_by_partner
  ON public.users(referred_by_partner_id);

-- 6. RLS helper — mirrors public.is_admin() pattern
CREATE OR REPLACE FUNCTION public.is_partner_for(p_partner_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_admins
    WHERE partner_id = p_partner_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. RLS policies
-- Note: is_public controls SEO indexability (meta robots), NOT read access.
-- Partners with is_public = false (e.g. invite-only programs) are still
-- viewable at their URL — they just aren't indexed by search engines.
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_public_read" ON partners
  FOR SELECT USING (is_active = true);
CREATE POLICY "partners_admin_all" ON partners
  FOR ALL USING (public.is_admin());
CREATE POLICY "partners_self_read" ON partners
  FOR SELECT USING (public.is_partner_for(id));

ALTER TABLE partner_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_courses_public_read" ON partner_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = partner_courses.partner_id
        AND is_active = true
    )
  );
CREATE POLICY "partner_courses_admin_all" ON partner_courses
  FOR ALL USING (public.is_admin());
CREATE POLICY "partner_courses_self_read" ON partner_courses
  FOR SELECT USING (public.is_partner_for(partner_id));

ALTER TABLE partner_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_admins_admin_all" ON partner_admins
  FOR ALL USING (public.is_admin());
CREATE POLICY "partner_admins_own_read" ON partner_admins
  FOR SELECT USING (user_id = auth.uid());

COMMENT ON TABLE partners IS
  'Partner organizations that co-brand HonuVibe courses via /partners/[slug] pages';
COMMENT ON COLUMN partners.is_public IS
  'When false, landing page is robots: noindex (invite-only programs like Vertice Society)';
COMMENT ON COLUMN partners.revenue_share_pct IS
  'Informational rev-share percentage; settlement is off-platform';
COMMENT ON COLUMN enrollments.partner_id IS
  'Attribution at purchase time — set from hv_partner cookie or first-touch fallback';
COMMENT ON COLUMN public.users.referred_by_partner_id IS
  'First-touch sticky attribution — the partner that originally brought this user in';
