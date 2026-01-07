-- Migration: 0017_polar_integration.sql
-- Description: Add Polar.sh-specific columns for payment processing
-- Date: 2026-01-07
-- Note: Can reuse stripe_customer_id/stripe_subscription_id as generic payment provider fields,
--       or add Polar-specific fields for clarity

-- Add Polar-specific columns (alternative to reusing Stripe columns)
ALTER TABLE users ADD COLUMN polar_customer_id TEXT;
ALTER TABLE users ADD COLUMN polar_subscription_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_polar_customer ON users(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_polar_subscription ON users(polar_subscription_id);

-- Notes:
-- - polar_customer_id: Polar customer ID for this user
-- - polar_subscription_id: Current active subscription ID in Polar
-- - These fields are populated when user completes Polar checkout
-- - Webhooks from Polar will update these fields and subscription_tier/status
