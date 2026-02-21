-- Migration 0021: Incomplete Jobs Handling
-- Adds flag to identify jobs with missing or empty descriptions
-- Enables filtering out incomplete jobs from recommendations and search

-- Add is_complete column (1=complete, 0=incomplete)
ALTER TABLE jobs ADD COLUMN is_complete INTEGER DEFAULT 1;

-- Mark jobs with NULL or empty descriptions as incomplete
UPDATE jobs
SET is_complete = 0
WHERE description IS NULL OR description = '' OR trim(description) = '';

-- Create index for efficient filtering
CREATE INDEX idx_jobs_is_complete ON jobs(is_complete);

-- Note: Future improvements could include:
-- 1. Admin interface to review and fix incomplete jobs
-- 2. Automatic re-fetch from source for incomplete jobs
-- 3. Email alerts when imports have high incomplete rates
