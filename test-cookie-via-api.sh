#!/bin/bash

# Test LinkedIn cookie via deployed backend API

BACKEND_URL="https://gethiredpoc-api.carl-f-frank.workers.dev"
COOKIE_FILE="/tmp/linkedin-cookies.json"

echo "🧪 Testing LinkedIn Cookie Authentication"
echo "=========================================="
echo ""

# Read admin credentials
read -p "Enter admin email: " ADMIN_EMAIL
read -sp "Enter admin password: " ADMIN_PASSWORD
echo ""
echo ""

# Step 1: Login
echo "1️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Step 2: Upload cookie
echo "2️⃣  Uploading LinkedIn cookie..."
COOKIE_JSON=$(cat $COOKIE_FILE)

UPLOAD_RESPONSE=$(curl -s -X PUT "$BACKEND_URL/api/admin/linkedin-cookie" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cookie\":$(cat $COOKIE_FILE | jq -c .)}")

echo "Response: $UPLOAD_RESPONSE"
echo ""

# Step 3: Check cookie status
echo "3️⃣  Checking cookie status..."
STATUS_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/admin/linkedin-cookie/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Status: $STATUS_RESPONSE"
echo ""

# Step 4: Test import
echo "4️⃣  Testing job import with LinkedIn scraper..."
echo "   This will take 2-5 minutes..."
echo ""

IMPORT_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/admin/import-jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"queries":["software engineer remote"],"scrapers":["linkedin"]}')

echo "=========================================="
echo "Import Result:"
echo "$IMPORT_RESPONSE" | jq '.'
echo "=========================================="

# Check if successful
SUCCESS=$(echo $IMPORT_RESPONSE | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
  IMPORTED=$(echo $IMPORT_RESPONSE | jq -r '.imported')
  echo ""
  echo "✅ SUCCESS! Imported $IMPORTED jobs from LinkedIn"
  echo "🎉 Your cookie is working!"
else
  echo ""
  echo "❌ Import failed. Check the error message above."
fi
