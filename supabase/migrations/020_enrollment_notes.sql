-- Add notes column to enrollments for manual enrollment audit trail
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS notes text;
