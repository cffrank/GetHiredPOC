-- Migration 0019: Refactor User Profile Fields
-- Adds structured name and address fields, phone number
-- Migrates existing data from full_name to first_name/last_name

-- Add new structured user fields
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN street_address TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN state TEXT;
ALTER TABLE users ADD COLUMN zip_code TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;

-- Migrate existing data: split full_name into first_name and last_name
-- Simple split on first space - users can correct in profile if needed
UPDATE users
SET first_name = CASE
    WHEN instr(full_name, ' ') > 0
    THEN substr(full_name, 1, instr(full_name, ' ') - 1)
    ELSE full_name
END,
last_name = CASE
    WHEN instr(full_name, ' ') > 0
    THEN substr(full_name, instr(full_name, ' ') + 1)
    ELSE ''
END
WHERE full_name IS NOT NULL;

-- Migrate existing address to street_address (users can split into components later)
UPDATE users
SET street_address = address
WHERE address IS NOT NULL;

-- Note: We're keeping the old full_name and address columns for backward compatibility
-- They can be deprecated and removed in a future migration after confirming the new structure works
-- For now, application code should compute full_name as first_name + ' ' + last_name when reading
