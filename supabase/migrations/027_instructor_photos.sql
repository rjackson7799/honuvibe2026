-- ============================================================
-- INSTRUCTOR PHOTOS — set static photo_url for core instructors
-- ============================================================
-- Images already exist in /public/images/partners/instructors/
-- Using static paths served by Next.js from the public directory.
-- ============================================================

UPDATE instructor_profiles
SET photo_url    = '/images/partners/instructors/ryan.webp',
    updated_at   = now()
WHERE display_name ILIKE '%ryan%';

UPDATE instructor_profiles
SET photo_url    = '/images/partners/instructors/mizuho.webp',
    updated_at   = now()
WHERE display_name ILIKE '%mizuho%';

UPDATE instructor_profiles
SET photo_url    = '/images/partners/instructors/chimi.webp',
    updated_at   = now()
WHERE display_name ILIKE '%chiemi%' OR display_name ILIKE '%chimi%';
