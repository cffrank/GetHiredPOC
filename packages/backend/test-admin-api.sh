#!/bin/bash

# Phase 2: Admin API Endpoint Tests
# Tests all 5 admin prompt management endpoints
#
# Prerequisites:
# 1. Dev server running: npm run dev
# 2. Admin user created with valid JWT token
# 3. Set ADMIN_TOKEN environment variable

set -e

# Configuration
BASE_URL="http://localhost:8787"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: ADMIN_TOKEN environment variable not set"
  echo "   Please set your admin JWT token:"
  echo "   export ADMIN_TOKEN='your-jwt-token-here'"
  exit 1
fi

echo "=========================================="
echo "Phase 2: Admin API Endpoint Tests"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test helper function
run_test() {
  local test_name="$1"
  local expected_status="$2"
  local response="$3"
  local actual_status="$4"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if [ "$actual_status" -eq "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name (HTTP $actual_status)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    echo "   Expected: HTTP $expected_status, Got: HTTP $actual_status"
    echo "   Response: $response"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

# TEST 1: GET /api/admin/prompts - List all prompts
echo "TEST 1: GET /api/admin/prompts - List all prompts"
echo "=================================================="
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/admin/prompts")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "List all active prompts" 200 "$BODY" "$HTTP_CODE"

if [ "$HTTP_CODE" -eq 200 ]; then
  COUNT=$(echo "$BODY" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
  echo "   Found $COUNT prompts"
  echo "   Response: $BODY" | head -c 200
  echo "..."
fi
echo ""

# TEST 2: GET /api/admin/prompts?active_only=false - List all including inactive
echo "TEST 2: GET /api/admin/prompts?active_only=false - Include inactive"
echo "====================================================================="
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/admin/prompts?active_only=false")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "List all prompts including inactive" 200 "$BODY" "$HTTP_CODE"
echo ""

# TEST 3: GET /api/admin/prompts/:key - Get single prompt
echo "TEST 3: GET /api/admin/prompts/:key - Get specific prompt"
echo "=========================================================="
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/admin/prompts/cover_letter")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Get cover_letter prompt" 200 "$BODY" "$HTTP_CODE"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   Prompt fetched successfully"
fi
echo ""

# TEST 4: GET /api/admin/prompts/:key - Non-existent key (should return 404)
echo "TEST 4: GET /api/admin/prompts/:key - Non-existent key"
echo "======================================================="
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/admin/prompts/non_existent_prompt")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Get non-existent prompt returns 404" 404 "$BODY" "$HTTP_CODE"
echo ""

# TEST 5: POST /api/admin/prompts - Create new prompt
echo "TEST 5: POST /api/admin/prompts - Create new prompt"
echo "===================================================="
NEW_PROMPT_JSON=$(cat <<EOF
{
  "prompt_key": "test_api_prompt",
  "prompt_name": "Test API Prompt",
  "prompt_template": "This is a test prompt with {{variable}}",
  "description": "Created via API test",
  "model_config": "{\"model\": \"@cf/meta/llama-3.1-8b-instruct\", \"temperature\": 0.7, \"max_tokens\": 500}"
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$NEW_PROMPT_JSON" \
  "$BASE_URL/api/admin/prompts")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Create new prompt" 200 "$BODY" "$HTTP_CODE"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   Prompt created successfully"
fi
echo ""

# TEST 6: POST /api/admin/prompts - Invalid JSON in model_config
echo "TEST 6: POST /api/admin/prompts - Invalid model_config JSON"
echo "============================================================"
INVALID_PROMPT_JSON=$(cat <<EOF
{
  "prompt_key": "invalid_prompt",
  "prompt_name": "Invalid Prompt",
  "prompt_template": "Test",
  "model_config": "invalid json {"
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$INVALID_PROMPT_JSON" \
  "$BASE_URL/api/admin/prompts")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Create prompt with invalid model_config returns 400" 400 "$BODY" "$HTTP_CODE"
echo ""

# TEST 7: POST /api/admin/prompts - Missing required fields
echo "TEST 7: POST /api/admin/prompts - Missing required fields"
echo "=========================================================="
INCOMPLETE_PROMPT_JSON=$(cat <<EOF
{
  "prompt_key": "incomplete_prompt"
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$INCOMPLETE_PROMPT_JSON" \
  "$BASE_URL/api/admin/prompts")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Create prompt with missing fields returns 400" 400 "$BODY" "$HTTP_CODE"
echo ""

# TEST 8: PUT /api/admin/prompts/:key - Update existing prompt
echo "TEST 8: PUT /api/admin/prompts/:key - Update existing prompt"
echo "============================================================="
UPDATE_PROMPT_JSON=$(cat <<EOF
{
  "prompt_name": "Test API Prompt UPDATED",
  "prompt_template": "This is an UPDATED test prompt with {{variable}}",
  "description": "Updated via API test"
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PROMPT_JSON" \
  "$BASE_URL/api/admin/prompts/test_api_prompt")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Update existing prompt" 200 "$BODY" "$HTTP_CODE"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   Prompt updated successfully"
  # Verify version incremented
  VERSION=$(echo "$BODY" | grep -o '"version":[0-9]*' | grep -o '[0-9]*' || echo "0")
  echo "   New version: $VERSION"
fi
echo ""

# TEST 9: PUT /api/admin/prompts/:key - Update non-existent prompt
echo "TEST 9: PUT /api/admin/prompts/:key - Update non-existent prompt"
echo "================================================================="
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt_name": "Test"}' \
  "$BASE_URL/api/admin/prompts/does_not_exist")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Update non-existent prompt returns 404" 404 "$BODY" "$HTTP_CODE"
echo ""

# TEST 10: DELETE /api/admin/prompts/:key - Soft delete prompt
echo "TEST 10: DELETE /api/admin/prompts/:key - Soft delete prompt"
echo "============================================================="
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE_URL/api/admin/prompts/test_api_prompt")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Soft delete prompt" 200 "$BODY" "$HTTP_CODE"

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "   Prompt deleted successfully"
fi
echo ""

# TEST 11: Verify deleted prompt is not in active list
echo "TEST 11: Verify deleted prompt is not in active list"
echo "====================================================="
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/admin/prompts/test_api_prompt")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Deleted prompt not accessible" 404 "$BODY" "$HTTP_CODE"
echo ""

# TEST 12: Authentication required (no token)
echo "TEST 12: Authentication required (no token)"
echo "============================================"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/admin/prompts")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)
run_test "Request without token returns 401" 401 "$BODY" "$HTTP_CODE"
echo ""

# TEST 13: Cache invalidation after update
echo "TEST 13: Cache invalidation verification"
echo "========================================="
echo "   This test requires manual verification:"
echo "   1. Check server logs for cache invalidation messages"
echo "   2. Verify second fetch after update is not a cache hit"
echo -e "   ${YELLOW}⚠️  MANUAL VERIFICATION REQUIRED${NC}"
echo ""

# Print Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS ✅${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS ❌${NC}"
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Please review errors above.${NC}"
  exit 1
fi
