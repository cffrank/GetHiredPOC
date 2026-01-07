-- Migration: Add vector embedding support
-- This migration adds embedding columns to jobs and users tables for semantic search

-- Add embedding columns to jobs table
ALTER TABLE jobs ADD COLUMN embedding TEXT DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN embedding_updated_at INTEGER DEFAULT NULL;

-- Add embedding columns to users table
ALTER TABLE users ADD COLUMN embedding TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN embedding_updated_at INTEGER DEFAULT NULL;

-- Create indexes for faster lookups on embedding status
CREATE INDEX IF NOT EXISTS idx_jobs_embedding_updated ON jobs(embedding_updated_at) WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_embedding_updated ON users(embedding_updated_at) WHERE embedding IS NOT NULL;
