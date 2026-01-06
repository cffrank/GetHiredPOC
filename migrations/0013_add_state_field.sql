-- Migration 0013: Add state field to jobs table for better location searching
-- This migration adds a state column to store the US state abbreviation (e.g., WI, CA, NY)

-- Add state column to jobs table
ALTER TABLE jobs ADD COLUMN state TEXT;

-- Create index for efficient state-based queries
CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);

-- Try to extract and populate state from existing location data
-- This will handle some common patterns, but won't catch everything
-- Examples:
-- "Madison, WI" -> WI
-- "San Diego, California" -> California (would need manual update to CA)
-- "Boston, Suffolk County" -> NULL (no state info)

-- Note: Since we don't have reliable state data in existing locations,
-- we'll populate this field properly as new jobs are imported
