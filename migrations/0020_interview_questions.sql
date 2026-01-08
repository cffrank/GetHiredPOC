-- Migration 0020: Interview Questions Feature
-- Creates table for storing interview preparation questions and answers

CREATE TABLE interview_questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  application_id TEXT,  -- NULL if general prep, linked if specific to application
  job_id TEXT,          -- For easy filtering by job
  question TEXT NOT NULL,
  answer TEXT,          -- NULL if user hasn't answered yet
  is_behavioral INTEGER DEFAULT 0,  -- 0=technical, 1=behavioral
  difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
  notes TEXT,           -- Additional notes or context
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_interview_questions_user_id ON interview_questions(user_id);
CREATE INDEX idx_interview_questions_application_id ON interview_questions(application_id);
CREATE INDEX idx_interview_questions_job_id ON interview_questions(job_id);
CREATE INDEX idx_interview_questions_difficulty ON interview_questions(difficulty);
CREATE INDEX idx_interview_questions_is_behavioral ON interview_questions(is_behavioral);
