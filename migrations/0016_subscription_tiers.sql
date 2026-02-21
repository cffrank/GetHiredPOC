-- Migration: 0016_subscription_tiers.sql
-- Description: Add subscription tier system with usage tracking
-- Date: 2026-01-07

-- Add subscription-related columns to users table
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro'));
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active' CHECK(subscription_status IN ('active', 'canceled', 'expired'));
ALTER TABLE users ADD COLUMN subscription_started_at INTEGER;
ALTER TABLE users ADD COLUMN subscription_expires_at INTEGER;
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;

-- Create usage_tracking table for monitoring user activity and enforcing limits
CREATE TABLE IF NOT EXISTS usage_tracking (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    month TEXT NOT NULL, -- Format: YYYY-MM
    job_imports_count INTEGER DEFAULT 0,
    jobs_imported_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    resumes_generated_count INTEGER DEFAULT 0,
    cover_letters_generated_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, month)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month);

-- Subscription tier limits (for reference):
-- FREE tier:
--   - 25 jobs per search
--   - 3 searches per day
--   - 10 applications per month
--   - 5 resumes per month
--   - 10 cover letters per month
--
-- PRO tier:
--   - 100 jobs per search
--   - Unlimited searches
--   - Unlimited applications
--   - Unlimited resumes
--   - Unlimited cover letters
