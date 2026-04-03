-- Make has_laptop nullable since the question has been removed from the survey.
-- All classes are remote so the laptop question is no longer relevant.
ALTER TABLE survey_responses ALTER COLUMN has_laptop DROP NOT NULL;
