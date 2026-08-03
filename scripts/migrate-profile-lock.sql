-- Migration: Add profile_completed and school_locked columns to teachers table
-- Run with: node scripts/run-migration.js scripts/migrate-profile-lock.sql

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS school_locked BOOLEAN NOT NULL DEFAULT false;

-- If teachers already have school_name set, consider them as having a completed profile
-- (useful if you have existing teachers). Comment out if not desired.
-- UPDATE teachers SET profile_completed = true WHERE school_name IS NOT NULL AND school_name != '';

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_teachers_profile_completed ON teachers (profile_completed);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers (email);

SELECT 'Migration migrate-profile-lock.sql completed successfully' as result;
