-- Migration: Job Search Preferences
-- Description: Add comprehensive job search preferences for users including job titles, locations,
--              industries, employment context, legal requirements, and optional demographics
-- Pattern: Follows email_preferences table structure (user_id as PRIMARY KEY, defaults for all fields)

CREATE TABLE IF NOT EXISTS job_search_preferences (
  user_id TEXT PRIMARY KEY,

  -- Core Job Search (stored as JSON arrays/strings)
  desired_job_titles TEXT, -- JSON array: ["Software Engineer", "Full Stack Developer"]
  work_locations TEXT, -- JSON array: ["San Francisco, CA", "New York, NY", "Remote"]
  work_mode TEXT DEFAULT 'any', -- 'remote' | 'hybrid' | 'onsite' | 'any'
  industries TEXT, -- JSON array: ["Technology", "Finance", "Healthcare"]

  -- Employment Context
  employment_status TEXT DEFAULT 'employed-open', -- 'unemployed-urgent' | 'unemployed-relaxed' | 'badly-employed' | 'employed-open'
  availability_date TEXT, -- ISO date string or null
  willing_to_relocate INTEGER DEFAULT 0, -- boolean: 0 or 1

  -- Legal Requirements
  requires_visa_sponsorship TEXT DEFAULT 'prefer-not-to-say', -- 'yes' | 'no' | 'prefer-not-to-say'
  has_drivers_license TEXT DEFAULT 'prefer-not-to-say', -- 'yes' | 'no' | 'prefer-not-to-say'
  has_security_clearance TEXT DEFAULT 'prefer-not-to-say', -- 'yes' | 'no' | 'prefer-not-to-say'

  -- Demographics (optional)
  gender_identity TEXT DEFAULT 'prefer-not-to-say', -- 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | 'self-describe'
  gender_self_describe TEXT, -- Free text if gender_identity = 'self-describe'
  has_disability TEXT DEFAULT 'prefer-not-to-say', -- 'yes' | 'no' | 'prefer-not-to-say'

  -- Metadata
  onboarding_completed INTEGER DEFAULT 0, -- Track if user completed onboarding wizard
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for querying onboarding status
CREATE INDEX IF NOT EXISTS idx_job_prefs_onboarding ON job_search_preferences(onboarding_completed);
