-- has_laptop was removed from the survey form but the column remained NOT NULL,
-- causing all survey submissions to fail. Make it nullable.
ALTER TABLE survey_responses ALTER COLUMN has_laptop DROP NOT NULL;
