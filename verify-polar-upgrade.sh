#!/bin/bash
# Script to verify Polar checkout and webhook processed correctly

USER_ID="7dfe01a60dbd47701f07a12b9e84663c"
SESSION_ID="d88eaa36-9536-41be-8a37-9bd1c0023da2"
EMAIL="polartest1767830864@gmail.com"

echo "=== Polar Checkout Verification Script ==="
echo ""
echo "User: $EMAIL"
echo "User ID: $USER_ID"
echo ""
echo "=== Checking Current Subscription Status ==="
curl -s https://api.allfrontoffice.com/api/subscription/status \
  -H "Authorization: Bearer $SESSION_ID" | jq '{tier: .subscription.tier, status: .subscription.status, polar_customer_id: .subscription.polar_customer_id, polar_subscription_id: .subscription.polar_subscription_id}'

echo ""
echo "=== Checking Database Directly ==="
npx wrangler d1 execute gethiredpoc-db --remote --command="
SELECT
  email,
  subscription_tier,
  subscription_status,
  polar_customer_id,
  polar_subscription_id,
  datetime(subscription_started_at, 'unixepoch') as started_at,
  datetime(subscription_expires_at, 'unixepoch') as expires_at
FROM users
WHERE email = '$EMAIL';
"

echo ""
echo "=== Expected After Successful Checkout ==="
echo "  subscription_tier: 'pro'"
echo "  subscription_status: 'active'"
echo "  polar_customer_id: NOT NULL"
echo "  polar_subscription_id: NOT NULL"
echo "  subscription_started_at: NOT NULL"
echo "  subscription_expires_at: ~30 days from now"
