-- Add additional Adzuna job fields
-- This migration adds fields for richer job data

ALTER TABLE jobs ADD COLUMN contract_time TEXT;
ALTER TABLE jobs ADD COLUMN contract_type TEXT; 
ALTER TABLE jobs ADD COLUMN category_tag TEXT;
ALTER TABLE jobs ADD COLUMN category_label TEXT;
ALTER TABLE jobs ADD COLUMN salary_is_predicted INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN latitude REAL;
ALTER TABLE jobs ADD COLUMN longitude REAL;
ALTER TABLE jobs ADD COLUMN adref TEXT;

-- Create indexes for common filters
CREATE INDEX IF NOT EXISTS idx_jobs_contract_time ON jobs(contract_time);
CREATE INDEX IF NOT EXISTS idx_jobs_contract_type ON jobs(contract_type);
CREATE INDEX IF NOT EXISTS idx_jobs_category_tag ON jobs(category_tag);
CREATE INDEX IF NOT EXISTS idx_jobs_location_coords ON jobs(latitude, longitude);
