-- ============================================================
-- VERTICE SOCIETY — add membership flag to users
-- ============================================================
-- Vertice Society members receive a 40% discount on courses
-- ($500 off the standard $1,250 price = $750 total).
-- The discount is applied automatically at Stripe Checkout
-- via a programmatic coupon. The flag also drives the
-- community badge shown next to member profiles.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_vertice_member BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_vertice_member
  IS 'Vertice Society membership — grants 40% course discount and community badge';
