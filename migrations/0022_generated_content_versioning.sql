-- Migration 0022: Generated Content Versioning
-- Creates tables for storing multiple versions of AI-generated resumes and cover letters
-- Enables users to generate, save, and compare multiple versions per job

-- Generated Resumes Table (multiple versions per job)
CREATE TABLE generated_resumes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  application_id TEXT,     -- Nullable: can exist before application created
  version_name TEXT,       -- User-friendly name: "Version 1", "Final Draft", etc.
  resume_data TEXT NOT NULL, -- JSON: { summary, experience, skills, education }
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
);

-- Indexes for generated_resumes
CREATE INDEX idx_generated_resumes_user_job ON generated_resumes(user_id, job_id);
CREATE INDEX idx_generated_resumes_user_id ON generated_resumes(user_id);
CREATE INDEX idx_generated_resumes_job_id ON generated_resumes(job_id);
CREATE INDEX idx_generated_resumes_created ON generated_resumes(created_at DESC);

-- Generated Cover Letters Table (multiple versions per job)
CREATE TABLE generated_cover_letters (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  application_id TEXT,     -- Nullable: can exist before application created
  version_name TEXT,       -- User-friendly name
  cover_letter_text TEXT NOT NULL, -- Plain text cover letter
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
);

-- Indexes for generated_cover_letters
CREATE INDEX idx_generated_cover_letters_user_job ON generated_cover_letters(user_id, job_id);
CREATE INDEX idx_generated_cover_letters_user_id ON generated_cover_letters(user_id);
CREATE INDEX idx_generated_cover_letters_job_id ON generated_cover_letters(job_id);
CREATE INDEX idx_generated_cover_letters_created ON generated_cover_letters(created_at DESC);

-- Migrate existing resume and cover letter data from applications table
-- This preserves any existing generated content as "Version 1"
INSERT INTO generated_resumes (user_id, job_id, application_id, version_name, resume_data, created_at)
SELECT
  user_id,
  job_id,
  id as application_id,
  'Version 1' as version_name,
  resume_content as resume_data,
  created_at
FROM applications
WHERE resume_content IS NOT NULL AND resume_content != '';

INSERT INTO generated_cover_letters (user_id, job_id, application_id, version_name, cover_letter_text, created_at)
SELECT
  user_id,
  job_id,
  id as application_id,
  'Version 1' as version_name,
  cover_letter as cover_letter_text,
  created_at
FROM applications
WHERE cover_letter IS NOT NULL AND cover_letter != '';

-- Note: We're keeping resume_content and cover_letter columns in applications table
-- for backward compatibility. They can be deprecated in a future migration.
-- The new pattern is:
-- - AI Analysis: stays in applications.ai_analysis (1:1, always latest)
-- - Resumes: versioned in generated_resumes table (1:many)
-- - Cover Letters: versioned in generated_cover_letters table (1:many)
