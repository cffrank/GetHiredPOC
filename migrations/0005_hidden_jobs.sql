-- Migration: Add hidden jobs functionality
-- Users can hide jobs they're not interested in from recommendations

-- Create hidden_jobs table
CREATE TABLE IF NOT EXISTS hidden_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  hidden_at INTEGER NOT NULL DEFAULT (unixepoch()),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,

  -- Ensure a user can only hide a job once
  UNIQUE(user_id, job_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_hidden_jobs_user_id ON hidden_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_jobs_job_id ON hidden_jobs(job_id);
