# Polar Checkout Flow - Test Guide

## Test Environment

**Frontend:** https://gethiredpoc.pages.dev
**Backend:** https://gethiredpoc-api.carl-f-frank.workers.dev
**Webhook URL:** https://gethiredpoc-api.carl-f-frank.workers.dev/api/webhooks/polar

**Latest Deployment:** January 7, 2026

---

## Prerequisites

✅ Polar.sh account configured
✅ Product created: PRO ($39/month)
✅ Product ID: `fbfe9261-44b5-4a08-99b8-e094af09aa8f`
✅ Access token set in Cloudflare Workers secrets
✅ Webhooks configured in Polar dashboard (Required events below)

---

## Required Webhook Events

Configure these events in Polar dashboard at: https://polar.sh/dashboard/webhooks

**Essential:**
- ✅ subscription.created
- ✅ subscription.updated
- ✅ subscription.canceled
- ✅ subscription.revoked
- ✅ order.paid
- ✅ subscription.past_due
- ✅ subscription.active

**Webhook Format:** Raw (JSON)

---

## Complete Checkout Flow Test

### Step 1: Login to Application

1. Navigate to: https://gethiredpoc.pages.dev
2. Login with your test account (or create new account)
3. Verify you're logged in and see the navigation menu

### Step 2: Visit Subscription Page

1. Click "Subscription" in the navigation menu
2. OR navigate directly to: https://gethiredpoc.pages.dev/subscription
3. Verify you see:
   - Current tier badge: "FREE TRIAL"
   - Usage dashboard showing current limits
   - "Upgrade to PRO" section with benefits

### Step 3: Initiate Checkout

1. Scroll to the "Upgrade to PRO" section
2. Review the benefits:
   - Unlimited job imports
   - Unlimited applications
   - Unlimited AI-generated resumes
   - Unlimited cover letters
   - Priority support
3. Click the blue button: **"Upgrade to PRO - $39/month"**
4. Expected behavior:
   - Button shows loading spinner: "Creating checkout session..."
   - After 1-2 seconds, you're redirected to Polar.sh checkout page

### Step 4: Polar Checkout Page

You should now be on: `https://polar.sh/checkout/polar_c_...`

1. Verify the checkout page shows:
   - Product: "PRO"
   - Price: $39.00 USD/month
   - Billing interval: Monthly
   - Your email address (pre-filled)
2. Enter test payment details:
   - **Test Card:** 4242 4242 4242 4242
   - **Expiry:** Any future date (e.g., 12/28)
   - **CVC:** Any 3 digits (e.g., 123)
   - **ZIP:** Any 5 digits (e.g., 12345)
3. Review and complete checkout

### Step 5: Payment Success Redirect

After successful payment, Polar redirects back to:
`https://gethiredpoc.pages.dev/subscription?success=true`

**Expected behavior:**
1. Green success message appears:
   > "Payment Successful!
   > Thank you for upgrading to PRO! Your account is being activated. This may take a few moments."
2. Page automatically polls for subscription status update (every 2 seconds for 30 seconds)
3. Within 5-10 seconds, the tier badge should update from "FREE TRIAL" to "PRO"
4. Usage bars should change from limited to "Unlimited"

### Step 6: Verify Webhook Processing

Check backend logs in Cloudflare Workers dashboard:

1. Navigate to: https://dash.cloudflare.com/
2. Go to: Workers & Pages → gethiredpoc-api → Logs
3. Look for log entries:
   ```
   Received Polar webhook: subscription.created
   User {userId} upgraded to PRO (subscription: {subscriptionId})
   Received Polar webhook: order.paid
   ```

### Step 7: Verify Database Update

The webhook should have updated the database. You can verify by checking the subscription status:

**API Call:**
```bash
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  https://gethiredpoc-api.carl-f-frank.workers.dev/api/subscription/status
```

**Expected response:**
```json
{
  "success": true,
  "subscription": {
    "tier": "pro",
    "status": "active",
    "startedAt": 1704672000,
    "expiresAt": 1707264000,
    "daysRemaining": 30
  },
  "limits": {
    "searchesPerDay": 999999,
    "applicationsPerMonth": 999999,
    "resumesPerMonth": 999999,
    "coverLettersPerMonth": 999999
  }
}
```

### Step 8: Verify PRO Features Work

Test that PRO features are now unlocked:

1. **Job Import:** Navigate to Jobs page and import jobs
   - Should allow unlimited imports (no daily limit)
2. **Applications:** Create multiple applications
   - Should show "Unlimited" instead of count/limit
3. **Resume Generation:** Generate a resume
   - Should work without limit warnings
4. **Cover Letter:** Generate cover letters
   - Should work without limit warnings

---

## Expected Email Flow (Optional - if email configured)

After checkout, the user should receive:

1. **Payment Success Email** (from Polar)
   - Receipt with transaction details
   - Subscription confirmation

2. **Welcome to PRO Email** (from GetHiredPOC - if configured)
   - Sent by webhook handler
   - Includes subscription details, next billing date

---

## Troubleshooting

### Issue: Button shows error instead of redirecting

**Possible causes:**
1. Backend not reachable
2. Polar access token invalid
3. POLAR_PRODUCT_ID not configured

**Debug:**
```bash
# Check backend health
curl https://gethiredpoc-api.carl-f-frank.workers.dev/api/health

# Check if environment variable is set
npx wrangler secret list
```

### Issue: Redirect succeeds but tier doesn't update

**Possible causes:**
1. Webhook not configured in Polar dashboard
2. Webhook endpoint unreachable
3. Webhook signature verification failing

**Debug:**
1. Check Polar dashboard → Webhooks → Recent Deliveries
2. Look for failed webhook attempts
3. Check Cloudflare Workers logs for errors
4. Verify webhook URL is correct: `https://gethiredpoc-api.carl-f-frank.workers.dev/api/webhooks/polar`

### Issue: Checkout page shows wrong price

**Possible causes:**
1. Wrong product ID configured
2. Multiple products/prices in Polar account

**Debug:**
```bash
# Run product discovery script
npx tsx packages/backend/test-polar.ts

# Verify correct product ID in wrangler.toml
cat packages/backend/wrangler.toml | grep POLAR_PRODUCT_ID
```

---

## Test Scenarios

### Scenario 1: Happy Path (First Time User)
- FREE → Checkout → Payment Success → PRO ✅
- Expected: User upgraded, email sent, database updated

### Scenario 2: Already PRO User Tries to Upgrade
- PRO → Click Upgrade
- Expected: Error message "Already subscribed to PRO tier"

### Scenario 3: Payment Failure
- FREE → Checkout → Payment Declined
- Expected: Return to subscription page, tier remains FREE, no webhook fired

### Scenario 4: User Cancels Checkout
- FREE → Checkout → Click "Back" or close tab
- Expected: Return to subscription page, tier remains FREE

### Scenario 5: Webhook Delayed (Eventual Consistency)
- Checkout succeeds but webhook delayed 30+ seconds
- Expected: Page polls for 30 seconds, then manual refresh updates tier

---

## Success Criteria

✅ User can click "Upgrade to PRO" button
✅ Redirects to Polar checkout page with correct product
✅ Can complete payment with test card
✅ Redirects back to subscription page with success message
✅ Tier badge updates to "PRO" within 30 seconds
✅ Usage limits change to "Unlimited"
✅ Webhook logs show `subscription.created` event
✅ Database shows user with tier='pro', status='active'
✅ User can access PRO features without limits

---

## Production Checklist

Before enabling for real users:

- [ ] Test with real credit card (not test mode)
- [ ] Verify Polar test mode is disabled
- [ ] Test subscription cancellation flow
- [ ] Test subscription renewal (month later)
- [ ] Test failed payment recovery (dunning)
- [ ] Verify email notifications work
- [ ] Set up monitoring for webhook failures
- [ ] Document customer support process for payment issues
- [ ] Test refund process through Polar dashboard
- [ ] Verify tax compliance (VAT, GST) handled by Polar

---

## Quick Test Command

Test checkout session creation directly:

```bash
npx tsx packages/backend/test-checkout.ts
```

Expected output:
```
Creating test checkout session...

✅ Checkout session created successfully!

Checkout ID: c97073e1-94c4-474c-aa99-dd9a246a8e38
Customer ID: null
Checkout URL: https://polar.sh/checkout/polar_c_vGnSMNNQ6TY0oNZwKd2mIdQZ9X7lsIv79kSZp2UQMLe

Test the checkout by visiting this URL:
https://polar.sh/checkout/...
```

---

## Monitoring

### Key Metrics to Track

1. **Checkout Conversion Rate**
   - Checkouts created / Checkouts completed
   - Target: > 80%

2. **Webhook Success Rate**
   - Successful webhooks / Total webhooks
   - Target: > 99%

3. **Time to Activation**
   - Time from payment to tier update
   - Target: < 10 seconds

4. **Failed Payments**
   - Track via `subscription.past_due` webhook
   - Alert if > 5%

### Dashboard Links

- Polar Dashboard: https://polar.sh/dashboard
- Cloudflare Workers Logs: https://dash.cloudflare.com/
- Webhook Delivery History: https://polar.sh/dashboard/webhooks

---

**Last Updated:** January 7, 2026
**Test Status:** ✅ Checkout creation verified
**Next Steps:** Complete end-to-end checkout test with webhook verification
