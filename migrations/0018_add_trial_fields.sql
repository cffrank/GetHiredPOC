-- Add trial tracking fields
ALTER TABLE users ADD COLUMN trial_expires_at INTEGER;
ALTER TABLE users ADD COLUMN is_trial INTEGER DEFAULT 0;

-- Create index for trial expiration queries
CREATE INDEX IF NOT EXISTS idx_users_trial_expires ON users(trial_expires_at) WHERE is_trial = 1;

-- Migrate existing users: Anyone with trial_started_at but no paid subscription gets trial
UPDATE users
SET is_trial = 1,
    trial_expires_at = trial_started_at + (14 * 24 * 60 * 60)
WHERE trial_started_at IS NOT NULL
  AND polar_subscription_id IS NULL;
