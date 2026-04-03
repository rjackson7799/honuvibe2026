-- Add optional email column to survey_responses for anonymous submissions.
-- Allows sending personalized AI profiles to users who provide their email
-- without having a registered account (no assignment token required).
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS email TEXT;
