-- Migration 0012: Add support for hybrid jobs (3-state remote field)
-- This migration updates the remote field to support:
-- remote = 0: On-site only
-- remote = 1: Remote only
-- remote = 2: Hybrid (can be done remote or on-site)

-- Update existing jobs that mention "hybrid" to remote = 2
UPDATE jobs
SET remote = 2
WHERE remote = 0
  AND (
    LOWER(title) LIKE '%hybrid%'
    OR LOWER(location) LIKE '%hybrid%'
    OR LOWER(description) LIKE '%hybrid%'
  );

-- Note: The remote column is already INTEGER, so it supports 0, 1, and 2
-- No schema change needed
