-- Migration: Add LinkedIn URL and full address to users table
-- Created: 2026-01-05

ALTER TABLE users ADD COLUMN linkedin_url TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
