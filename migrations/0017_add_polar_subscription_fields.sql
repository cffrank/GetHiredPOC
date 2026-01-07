-- Migration: Add Polar.sh subscription fields to users table
-- Date: 2026-01-07
-- Purpose: Support Polar.sh payment integration for PRO tier subscriptions

-- Add new subscription fields for Polar integration
ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro'));
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'expired'));
ALTER TABLE users ADD COLUMN subscription_started_at INTEGER;
ALTER TABLE users ADD COLUMN subscription_expires_at INTEGER;
ALTER TABLE users ADD COLUMN polar_customer_id TEXT;
ALTER TABLE users ADD COLUMN polar_subscription_id TEXT;

-- Create indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_polar_customer_id ON users(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_polar_subscription_id ON users(polar_subscription_id);

-- Migrate existing users from old membership_tier to new subscription_tier
-- trial -> free, paid -> pro
UPDATE users SET subscription_tier = CASE
  WHEN membership_tier = 'trial' THEN 'free'
  WHEN membership_tier = 'paid' THEN 'pro'
  ELSE 'free'
END WHERE subscription_tier IS NULL OR subscription_tier = 'free';
