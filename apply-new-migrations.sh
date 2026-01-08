#!/bin/bash

# Script to apply new migrations (0019-0022) to remote database
# Usage: ./apply-new-migrations.sh

set -e  # Exit on error

echo "================================================"
echo "Applying New Migrations to Remote Database"
echo "================================================"
echo ""
echo "This script will apply the following migrations:"
echo "  - 0019_refactor_user_profile_fields.sql"
echo "  - 0020_interview_questions.sql"
echo "  - 0021_incomplete_jobs.sql"
echo "  - 0022_generated_content_versioning.sql"
echo ""
echo "⚠️  WARNING: This will modify the production database!"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Changing to backend directory..."
cd packages/backend

echo ""
echo "1/4 Applying migration 0019: User Profile Fields..."
npx wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0019_refactor_user_profile_fields.sql
echo "✓ Migration 0019 applied successfully"

echo ""
echo "2/4 Applying migration 0020: Interview Questions..."
npx wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0020_interview_questions.sql
echo "✓ Migration 0020 applied successfully"

echo ""
echo "3/4 Applying migration 0021: Incomplete Jobs..."
npx wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0021_incomplete_jobs.sql
echo "✓ Migration 0021 applied successfully"

echo ""
echo "4/4 Applying migration 0022: Generated Content Versioning..."
npx wrangler d1 execute gethiredpoc-db --remote --file=../../migrations/0022_generated_content_versioning.sql
echo "✓ Migration 0022 applied successfully"

echo ""
echo "================================================"
echo "All migrations applied successfully!"
echo "================================================"
echo ""
echo "Verification Commands:"
echo ""
echo "# Check new tables exist:"
echo "npx wrangler d1 execute gethiredpoc-db --remote --command=\"SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'generated_%' OR name = 'interview_questions');\""
echo ""
echo "# Check record counts:"
echo "npx wrangler d1 execute gethiredpoc-db --remote --command=\"SELECT (SELECT COUNT(*) FROM generated_resumes) as resumes, (SELECT COUNT(*) FROM generated_cover_letters) as cover_letters, (SELECT COUNT(*) FROM interview_questions) as questions;\""
echo ""
echo "Next steps:"
echo "1. Deploy updated application code"
echo "2. Test functionality on remote environment"
echo "3. Monitor logs for any issues"
echo ""
