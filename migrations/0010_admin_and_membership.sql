-- Migration 0010: Add admin and membership system
-- This migration adds role-based access control and membership management to the users table
-- It also creates tables for admin audit logging and system metrics tracking

-- Add role and membership columns to users table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'));
ALTER TABLE users ADD COLUMN membership_tier TEXT DEFAULT 'trial' CHECK(membership_tier IN ('trial', 'paid'));
ALTER TABLE users ADD COLUMN membership_started_at INTEGER;
ALTER TABLE users ADD COLUMN membership_expires_at INTEGER;
ALTER TABLE users ADD COLUMN trial_started_at INTEGER DEFAULT (unixepoch());

-- Create admin audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for efficient audit log queries by user and timestamp
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Create system metrics table for dashboard analytics
CREATE TABLE IF NOT EXISTS system_metrics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  metric_key TEXT NOT NULL,
  metric_value REAL NOT NULL,
  recorded_at INTEGER DEFAULT (unixepoch())
);

-- Create index for efficient metrics queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_key ON system_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);
