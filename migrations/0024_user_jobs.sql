-- Add user_id column to jobs table for user-private imported jobs
-- NULL = public job (from scrapers/Adzuna), non-NULL = private job visible only to that user
ALTER TABLE jobs ADD COLUMN user_id TEXT DEFAULT NULL;
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
