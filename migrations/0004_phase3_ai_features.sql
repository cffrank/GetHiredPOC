-- Phase 3: AI Features Migration
-- Adds columns for AI-powered job matching, resume generation, and analytics

-- Add AI fields to applications table (skip ai_match_score, ai_analysis, notes - already exist)
ALTER TABLE applications ADD COLUMN resume_content TEXT; -- Generated resume JSON
ALTER TABLE applications ADD COLUMN cover_letter TEXT;
ALTER TABLE applications ADD COLUMN response_time INTEGER; -- Days to get response

-- Add notification preferences to users table
ALTER TABLE users ADD COLUMN email_notifications INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN daily_job_alerts INTEGER DEFAULT 1;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_match_score ON applications(ai_match_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_notifications ON users(email_notifications, daily_job_alerts);
