#!/bin/bash

# Check production logs for Phase 2 deployment
# This script helps identify any runtime errors in production

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Phase 2: Production Logs & Health Check              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "packages/backend/wrangler.toml" ]; then
  echo "❌ Error: Must run from project root"
  exit 1
fi

cd packages/backend

echo "📋 Fetching recent production logs..."
echo ""
echo "Looking for errors, warnings, and AI prompt activity..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get recent logs (last 100 entries)
wrangler tail --env production --format pretty 2>&1 | head -100 &

TAIL_PID=$!

echo "📡 Streaming logs for 30 seconds..."
echo "   Press Ctrl+C to stop early"
echo ""

# Wait 30 seconds or until user interrupts
sleep 30

# Stop tailing
kill $TAIL_PID 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Log check complete!"
echo ""
echo "💡 Tips:"
echo "   - Look for 'ai_prompts' table references"
echo "   - Check for database connection errors"
echo "   - Verify prompt retrieval is working"
echo ""
echo "To stream logs continuously:"
echo "   cd packages/backend && wrangler tail --env production"
echo ""
