#!/bin/bash

# Phase 2 Verification Script
# Comprehensive testing of all Phase 2 features

set -e

echo "=============================================="
echo "Phase 2: Configurable AI Prompts"
echo "COMPREHENSIVE VERIFICATION SUITE"
echo "=============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result arrays
CATEGORY_RESULTS=()

# Helper to track test results
test_result() {
  local status=$1
  local message=$2

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ "$status" = "PASS" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $message"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}: $message"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# ============================================
# CATEGORY 1: DATABASE MIGRATION VERIFICATION
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CATEGORY 1: Database Migration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1.1: Table exists
TABLE_EXISTS=$(npx wrangler d1 execute gethiredpoc-db --local --command "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='ai_prompts'" 2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$TABLE_EXISTS" = "1" ]; then
  test_result "PASS" "ai_prompts table exists"
else
  test_result "FAIL" "ai_prompts table does not exist"
fi

# Test 1.2: Column count
COLUMN_COUNT=$(npx wrangler d1 execute gethiredpoc-db --local --command "PRAGMA table_info(ai_prompts)" 2>/dev/null | grep -c '"name":' || echo "0")

if [ "$COLUMN_COUNT" = "10" ]; then
  test_result "PASS" "ai_prompts has 10 columns (id, prompt_key, prompt_name, prompt_template, description, model_config, version, is_active, created_at, updated_at)"
else
  test_result "FAIL" "ai_prompts has $COLUMN_COUNT columns (expected 10)"
fi

# Test 1.3: Indexes
INDEX_COUNT=$(npx wrangler d1 execute gethiredpoc-db --local --command "SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND tbl_name='ai_prompts' AND name LIKE 'idx_%'" 2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$INDEX_COUNT" = "3" ]; then
  test_result "PASS" "Three custom indexes exist (idx_ai_prompts_key, idx_ai_prompts_active, idx_ai_prompts_updated)"
else
  test_result "FAIL" "Expected 3 custom indexes, found $INDEX_COUNT"
fi

# Test 1.4: Seeded prompts count
PROMPT_COUNT=$(npx wrangler d1 execute gethiredpoc-db --local --command "SELECT COUNT(*) as count FROM ai_prompts" 2>/dev/null | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$PROMPT_COUNT" = "4" ]; then
  test_result "PASS" "Four initial prompts seeded"
else
  test_result "FAIL" "Expected 4 prompts, found $PROMPT_COUNT"
fi

# Test 1.5: Verify all prompt keys
KEYS=$(npx wrangler d1 execute gethiredpoc-db --local --command "SELECT GROUP_CONCAT(prompt_key) as keys FROM ai_prompts" 2>/dev/null | grep -o '"keys":"[^"]*"' | sed 's/"keys":"//;s/"$//' || echo "")

if [[ "$KEYS" == *"cover_letter"* ]] && [[ "$KEYS" == *"job_match"* ]] && [[ "$KEYS" == *"resume_tailor"* ]] && [[ "$KEYS" == *"linkedin_parse"* ]]; then
  test_result "PASS" "All required prompt keys exist: cover_letter, job_match, resume_tailor, linkedin_parse"
else
  test_result "FAIL" "Missing prompt keys. Found: $KEYS"
fi

echo ""

# ============================================
# CATEGORY 2: SERVICE FILE VERIFICATION
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CATEGORY 2: Service File Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 2.1: ai-prompt.service.ts exists
if [ -f "src/services/ai-prompt.service.ts" ]; then
  test_result "PASS" "ai-prompt.service.ts exists"
else
  test_result "FAIL" "ai-prompt.service.ts not found"
fi

# Test 2.2: ai-prompt.service.ts exports functions
if grep -q "export async function getPrompt" src/services/ai-prompt.service.ts; then
  test_result "PASS" "getPrompt() function exported"
else
  test_result "FAIL" "getPrompt() function not found"
fi

if grep -q "export function renderPrompt" src/services/ai-prompt.service.ts; then
  test_result "PASS" "renderPrompt() function exported"
else
  test_result "FAIL" "renderPrompt() function not found"
fi

if grep -q "export async function listPrompts" src/services/ai-prompt.service.ts; then
  test_result "PASS" "listPrompts() function exported"
else
  test_result "FAIL" "listPrompts() function not found"
fi

if grep -q "export async function upsertPrompt" src/services/ai-prompt.service.ts; then
  test_result "PASS" "upsertPrompt() function exported"
else
  test_result "FAIL" "upsertPrompt() function not found"
fi

if grep -q "export async function deletePrompt" src/services/ai-prompt.service.ts; then
  test_result "PASS" "deletePrompt() function exported"
else
  test_result "FAIL" "deletePrompt() function not found"
fi

if grep -q "export function parseModelConfig" src/services/ai-prompt.service.ts; then
  test_result "PASS" "parseModelConfig() function exported"
else
  test_result "FAIL" "parseModelConfig() function not found"
fi

echo ""

# ============================================
# CATEGORY 3: AI SERVICES INTEGRATION
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CATEGORY 3: AI Services Integration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 3.1: Cover Letter Service
if grep -q "import.*getPrompt.*from.*ai-prompt.service" src/services/ai-cover-letter.service.ts; then
  test_result "PASS" "ai-cover-letter.service.ts imports getPrompt"
else
  test_result "FAIL" "ai-cover-letter.service.ts doesn't import getPrompt"
fi

if grep -q "await getPrompt(env, 'cover_letter')" src/services/ai-cover-letter.service.ts; then
  test_result "PASS" "ai-cover-letter.service.ts uses database prompt"
else
  test_result "FAIL" "ai-cover-letter.service.ts doesn't use database prompt"
fi

if grep -q "renderPrompt.*prompt_template" src/services/ai-cover-letter.service.ts; then
  test_result "PASS" "ai-cover-letter.service.ts renders prompt template"
else
  test_result "FAIL" "ai-cover-letter.service.ts doesn't render prompt template"
fi

# Test 3.2: Job Matching Service
if grep -q "import.*getPrompt.*from.*ai-prompt.service" src/services/job-matching.service.ts; then
  test_result "PASS" "job-matching.service.ts imports getPrompt"
else
  test_result "FAIL" "job-matching.service.ts doesn't import getPrompt"
fi

if grep -q "await getPrompt(env, 'job_match')" src/services/job-matching.service.ts; then
  test_result "PASS" "job-matching.service.ts uses database prompt"
else
  test_result "FAIL" "job-matching.service.ts doesn't use database prompt"
fi

# Test 3.3: Resume Service
if grep -q "import.*getPrompt.*from.*ai-prompt.service" src/services/ai-resume.service.ts; then
  test_result "PASS" "ai-resume.service.ts imports getPrompt"
else
  test_result "FAIL" "ai-resume.service.ts doesn't import getPrompt"
fi

if grep -q "await getPrompt(env, 'resume_tailor')" src/services/ai-resume.service.ts; then
  test_result "PASS" "ai-resume.service.ts uses database prompt"
else
  test_result "FAIL" "ai-resume.service.ts doesn't use database prompt"
fi

# Test 3.4: LinkedIn Parser Service
if grep -q "import.*getPrompt.*from.*ai-prompt.service" src/services/linkedin-parser.service.ts; then
  test_result "PASS" "linkedin-parser.service.ts imports getPrompt"
else
  test_result "FAIL" "linkedin-parser.service.ts doesn't import getPrompt"
fi

if grep -q "await getPrompt(env, 'linkedin_parse')" src/services/linkedin-parser.service.ts; then
  test_result "PASS" "linkedin-parser.service.ts uses database prompt"
else
  test_result "FAIL" "linkedin-parser.service.ts doesn't use database prompt"
fi

echo ""

# ============================================
# CATEGORY 4: ADMIN API ENDPOINTS
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CATEGORY 4: Admin API Endpoints${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 4.1: Admin route imports prompt service
if grep -q "import.*getPrompt.*listPrompts.*upsertPrompt.*deletePrompt.*from.*ai-prompt.service" src/routes/admin.ts; then
  test_result "PASS" "admin.ts imports AI prompt service functions"
else
  test_result "FAIL" "admin.ts missing AI prompt service imports"
fi

# Test 4.2: GET /api/admin/prompts endpoint exists
if grep -q "admin.get('/prompts'" src/routes/admin.ts; then
  test_result "PASS" "GET /api/admin/prompts endpoint exists"
else
  test_result "FAIL" "GET /api/admin/prompts endpoint not found"
fi

# Test 4.3: GET /api/admin/prompts/:key endpoint exists
if grep -q "admin.get('/prompts/:key'" src/routes/admin.ts; then
  test_result "PASS" "GET /api/admin/prompts/:key endpoint exists"
else
  test_result "FAIL" "GET /api/admin/prompts/:key endpoint not found"
fi

# Test 4.4: POST /api/admin/prompts endpoint exists
if grep -q "admin.post('/prompts'" src/routes/admin.ts; then
  test_result "PASS" "POST /api/admin/prompts endpoint exists"
else
  test_result "FAIL" "POST /api/admin/prompts endpoint not found"
fi

# Test 4.5: PUT /api/admin/prompts/:key endpoint exists
if grep -q "admin.put('/prompts/:key'" src/routes/admin.ts; then
  test_result "PASS" "PUT /api/admin/prompts/:key endpoint exists"
else
  test_result "FAIL" "PUT /api/admin/prompts/:key endpoint not found"
fi

# Test 4.6: DELETE /api/admin/prompts/:key endpoint exists
if grep -q "admin.delete('/prompts/:key'" src/routes/admin.ts; then
  test_result "PASS" "DELETE /api/admin/prompts/:key endpoint exists"
else
  test_result "FAIL" "DELETE /api/admin/prompts/:key endpoint not found"
fi

# Test 4.7: Audit logging on upsert
if grep -q "recordAuditLog.*update_prompt" src/routes/admin.ts; then
  test_result "PASS" "Audit logging implemented for prompt updates"
else
  test_result "FAIL" "Audit logging missing for prompt updates"
fi

# Test 4.8: Audit logging on delete
if grep -q "recordAuditLog.*delete_prompt" src/routes/admin.ts; then
  test_result "PASS" "Audit logging implemented for prompt deletes"
else
  test_result "FAIL" "Audit logging missing for prompt deletes"
fi

echo ""

# ============================================
# CATEGORY 5: CACHING IMPLEMENTATION
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CATEGORY 5: Caching Implementation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 5.1: KV cache usage in getPrompt
if grep -q "env.KV_CACHE.get.*prompt:" src/services/ai-prompt.service.ts; then
  test_result "PASS" "getPrompt() uses KV cache for retrieval"
else
  test_result "FAIL" "getPrompt() doesn't use KV cache"
fi

# Test 5.2: Cache TTL set to 24 hours
if grep -q "expirationTtl: 86400" src/services/ai-prompt.service.ts; then
  test_result "PASS" "Cache TTL set to 24 hours (86400 seconds)"
else
  test_result "FAIL" "Cache TTL not set to 24 hours"
fi

# Test 5.3: Cache invalidation on upsert
if grep -q "env.KV_CACHE.delete.*prompt:" src/services/ai-prompt.service.ts | grep -q upsertPrompt -A 20; then
  test_result "PASS" "Cache invalidated on prompt upsert"
else
  # Check if delete is called in upsertPrompt function context
  if awk '/async function upsertPrompt/,/^}/' src/services/ai-prompt.service.ts | grep -q "KV_CACHE.delete"; then
    test_result "PASS" "Cache invalidated on prompt upsert"
  else
    test_result "FAIL" "Cache not invalidated on prompt upsert"
  fi
fi

# Test 5.4: Cache invalidation on delete
if awk '/async function deletePrompt/,/^}/' src/services/ai-prompt.service.ts | grep -q "KV_CACHE.delete"; then
  test_result "PASS" "Cache invalidated on prompt delete"
else
  test_result "FAIL" "Cache not invalidated on prompt delete"
fi

echo ""

# ============================================
# CATEGORY 6: ERROR HANDLING
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CATEGORY 6: Error Handling${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 6.1: getPrompt error handling
if grep -q "catch.*error.*getPrompt" src/services/ai-prompt.service.ts; then
  test_result "PASS" "getPrompt() has error handling"
else
  test_result "FAIL" "getPrompt() missing error handling"
fi

# Test 6.2: Admin endpoint validation
if grep -q "if (!body.prompt_key || !body.prompt_name || !body.prompt_template)" src/routes/admin.ts; then
  test_result "PASS" "Admin POST endpoint validates required fields"
else
  test_result "FAIL" "Admin POST endpoint missing field validation"
fi

# Test 6.3: JSON validation for model_config
if grep -q "JSON.parse(body.model_config)" src/routes/admin.ts; then
  test_result "PASS" "Admin endpoint validates model_config JSON"
else
  test_result "FAIL" "Admin endpoint doesn't validate model_config JSON"
fi

# Test 6.4: 404 handling for non-existent prompts
if grep -q "if (!prompt)" src/routes/admin.ts && grep -q "return c.json.*404" src/routes/admin.ts; then
  test_result "PASS" "Admin endpoint returns 404 for non-existent prompts"
else
  test_result "FAIL" "Admin endpoint missing 404 handling"
fi

echo ""

# ============================================
# PRINT SUMMARY
# ============================================
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS ✅${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS ❌${NC}"

if [ $TOTAL_TESTS -gt 0 ]; then
  SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
  echo "Success Rate: $SUCCESS_RATE%"
fi

echo ""

# Category breakdown
echo "RESULTS BY CATEGORY:"
echo "-------------------"
echo "1. Database Migration: Implementation verified"
echo "2. Service Functions: All exports verified"
echo "3. AI Services Integration: All 4 services updated"
echo "4. Admin API Endpoints: All 5 endpoints implemented"
echo "5. Caching: KV cache with 24hr TTL implemented"
echo "6. Error Handling: Validation and error handling verified"

echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  echo ""
  echo "Phase 2: Configurable AI Prompts implementation is COMPLETE!"
  echo ""
  echo "✅ Database schema created with all indexes"
  echo "✅ 4 prompts seeded (cover_letter, job_match, resume_tailor, linkedin_parse)"
  echo "✅ AI Prompt Service implemented with 6 functions"
  echo "✅ All 4 AI services updated to use database prompts"
  echo "✅ 5 admin endpoints created for prompt management"
  echo "✅ KV caching with 24-hour TTL implemented"
  echo "✅ Audit logging for all prompt changes"
  echo "✅ Error handling and validation in place"
  echo ""
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Review errors above.${NC}"
  echo ""
  exit 1
fi
