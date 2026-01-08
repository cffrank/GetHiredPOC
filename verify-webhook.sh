#!/bin/bash
# Verify webhook updated the database

echo "Checking subscription status for carl.f.frank@gmail.com..."
echo ""

npx wrangler d1 execute gethiredpoc-db --remote --command="SELECT email, subscription_tier, subscription_status, polar_customer_id, polar_subscription_id, datetime(subscription_started_at, 'unixepoch') as started_at FROM users WHERE email = 'carl.f.frank@gmail.com';"
