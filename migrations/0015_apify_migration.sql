-- Migration 0015: Apify Scraper Integration
-- Adds rate limiting and cost control tables for Apify job imports

-- Create import requests table for rate limiting
CREATE TABLE IF NOT EXISTS import_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  scraper_type TEXT NOT NULL CHECK(scraper_type IN ('linkedin', 'indeed', 'dice', 'all')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  jobs_imported INTEGER DEFAULT 0,
  jobs_updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_message TEXT,
  requested_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_import_requests_user_id ON import_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_import_requests_requested_at ON import_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_requests_status ON import_requests(status);

-- Create daily scraper runs tracking table for cost controls
CREATE TABLE IF NOT EXISTS daily_scraper_runs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  run_date TEXT NOT NULL, -- YYYY-MM-DD format
  scraper_type TEXT NOT NULL CHECK(scraper_type IN ('linkedin', 'indeed', 'dice', 'all')),
  run_count INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(run_date, scraper_type)
);

CREATE INDEX IF NOT EXISTS idx_daily_scraper_runs_date ON daily_scraper_runs(run_date DESC);

-- No changes needed to jobs table - 'source' column already exists
-- We'll use 'linkedin', 'indeed', 'dice' as source values instead of 'adzuna'
