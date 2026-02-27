-- Add is_featured column if it doesn't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Mark the first 3 published courses as featured for the homepage section
UPDATE courses
SET is_featured = true
WHERE slug IN (
  'ai-foundations-for-business',
  'ai-powered-productivity',
  'building-ai-first-products'
);
