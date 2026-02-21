# Polar Sandbox Environment Setup

## Why Use Sandbox?

Polar provides a **dedicated sandbox environment** (https://sandbox.polar.sh) for testing without:
- Processing real money
- Affecting production data
- Interfering with live subscriptions

The sandbox is a completely isolated server where you can safely test the entire payment flow.

---

## Setup Steps

### Step 1: Create Sandbox Account

1. Navigate to: **https://sandbox.polar.sh/start**
2. Create a new user account (separate from your production account)
3. Complete email verification
4. Create a new organization for your sandbox testing

### Step 2: Create Sandbox Product

1. In sandbox dashboard, go to: **Products**
2. Click **"Create Product"**
3. Configure:
   - **Name:** GetHiredPOC PRO
   - **Description:** Unlimited job searching and AI-powered tools
   - **Price:** $39.00 USD/month
   - **Recurring:** Monthly
   - **Features:**
     - Unlimited job imports
     - Unlimited applications
     - Unlimited AI-generated resumes
     - Unlimited cover letters
     - Priority support
4. Click **"Create"**
5. Copy the **Product ID** (e.g., `fbfe9261-44b5-4a08-99b8-e094af09aa8f`)

### Step 3: Create Sandbox Access Token

1. In sandbox dashboard, go to: **Settings → API**
2. Click **"Create Access Token"**
3. Configure:
   - **Name:** GetHiredPOC Backend
   - **Permissions:** Select all relevant permissions
4. Click **"Create"**
5. **Copy the token immediately** (it won't be shown again)
   - Format: `polar_sat_...` (sandbox access token)

### Step 4: Configure Backend Environment

Update the Cloudflare Workers secret with your **sandbox** access token:

```bash
cd packages/backend
npx wrangler secret put POLAR_ACCESS_TOKEN
# When prompted, paste your SANDBOX access token (polar_sat_...)
```

Update `wrangler.toml` with your sandbox product ID:

```toml
# Polar.sh Configuration
POLAR_PRODUCT_ID = "YOUR_SANDBOX_PRODUCT_ID_HERE"
POLAR_SANDBOX = "true"  # Keep this as "true" for testing
```

### Step 5: Configure Sandbox Webhooks

1. In sandbox dashboard, go to: **Settings → Webhooks**
2. Click **"Create Webhook"**
3. Configure:
   - **URL:** `https://gethiredpoc-api.carl-f-frank.workers.dev/api/webhooks/polar`
   - **Format:** Raw (JSON)
   - **Events to enable:**
     - ✅ subscription.created
     - ✅ subscription.updated
     - ✅ subscription.canceled
     - ✅ subscription.revoked
     - ✅ subscription.active
     - ✅ subscription.past_due
     - ✅ order.paid
     - ✅ order.refunded
4. Click **"Create"**
5. (Optional) Copy the webhook signing secret for signature verification

### Step 6: Test Product Discovery

Run the test script to verify your sandbox is configured correctly:

```bash
npx tsx packages/backend/test-polar.ts
```

Expected output:
```
Fetching products from Polar...

Found products: {...}

Product details:

---
Product ID: fbfe9261-44b5-4a08-99b8-e094af09aa8f
Name: GetHiredPOC PRO
Description: Unlimited job searching and AI-powered tools

Prices:
  - Price ID: d11b05ca-3f6d-4a15-8eb2-672a7e3866ab
    Amount: 39 USD
    Type: recurring
    Recurring: month
```

### Step 7: Test Checkout Creation

Run the checkout test script:

```bash
npx tsx packages/backend/test-checkout.ts
```

Expected output:
```
Creating test checkout session...

✅ Checkout session created successfully!

Checkout ID: c97073e1-94c4-474c-aa99-dd9a246a8e38
Customer ID: null
Checkout URL: https://sandbox.polar.sh/checkout/polar_c_vGnSMNNQ6TY0oNZwKd2mIdQZ9X7lsIv79kSZp2UQMLe

Test the checkout by visiting this URL:
https://sandbox.polar.sh/checkout/...
```

**Note:** The checkout URL should be on `sandbox.polar.sh`, not `polar.sh`!

### Step 8: Deploy Backend

Deploy the backend with sandbox configuration:

```bash
cd packages/backend
npm run deploy
```

Verify the deployment shows:
```
- Vars:
  ...
  POLAR_PRODUCT_ID: "fbfe9261-44b5-4a08-99b8-e094af09aa8f"
  POLAR_SANDBOX: "true"
```

---

## Testing with Sandbox

### Test Payment Cards

Use Stripe's test card numbers for sandbox payments:

**Successful Payment:**
```
Card Number: 4242 4242 4242 4242
Expiry: 12/28 (any future date)
CVC: 123 (any 3 digits)
ZIP: 12345 (any 5 digits)
```

**Payment Declined:**
```
Card Number: 4000 0000 0000 0002
```

**Insufficient Funds:**
```
Card Number: 4000 0000 0000 9995
```

More test cards: https://docs.stripe.com/testing#cards

### End-to-End Test Flow

1. **Visit Frontend:**
   - https://gethiredpoc.pages.dev/subscription
   - Login with your test account

2. **Start Checkout:**
   - Click "Upgrade to PRO - $39/month"
   - Verify redirect to `https://sandbox.polar.sh/checkout/...`

3. **Complete Payment:**
   - Use test card: 4242 4242 4242 4242
   - Complete checkout

4. **Verify Success:**
   - Redirected back to frontend with success message
   - Tier badge updates to "PRO"
   - Usage limits show "Unlimited"

5. **Check Webhook:**
   - Go to: https://sandbox.polar.sh/dashboard/webhooks
   - Verify webhook delivery succeeded
   - Check response status code (should be 200)

6. **Check Backend Logs:**
   - https://dash.cloudflare.com/ → Workers → gethiredpoc-api → Logs
   - Look for: `Received Polar webhook: subscription.created`

---

## Sandbox Limitations

**Important:** Subscriptions created in sandbox are **automatically canceled after 90 days**.

This is intentional and only applies to sandbox. Production subscriptions continue indefinitely until manually canceled.

---

## Switching to Production

When ready to accept real payments:

### 1. Create Production Organization

1. Navigate to: **https://polar.sh** (not sandbox)
2. Create production account and organization
3. Create production product (same config as sandbox)
4. Get production access token (starts with `polar_oat_...`)
5. Copy production product ID

### 2. Update Backend Configuration

```bash
# Update access token (use production token)
npx wrangler secret put POLAR_ACCESS_TOKEN
# Paste: polar_oat_... (production token)
```

Update `wrangler.toml`:
```toml
POLAR_PRODUCT_ID = "PRODUCTION_PRODUCT_ID_HERE"
POLAR_SANDBOX = "false"  # Switch to production
```

### 3. Configure Production Webhooks

Same as sandbox, but in production dashboard:
- URL: `https://gethiredpoc-api.carl-f-frank.workers.dev/api/webhooks/polar`
- Enable same events as sandbox

### 4. Deploy

```bash
npm run deploy
```

### 5. Test with Real Card

**IMPORTANT:** Test with a real credit card first (small amount) before announcing to users.

---

## Troubleshooting

### Issue: "Product does not exist"

**Cause:** Using production access token with sandbox product ID (or vice versa)

**Fix:** Ensure:
- Access token matches environment (sandbox vs production)
- Product ID is from the same environment
- `POLAR_SANDBOX` setting matches your intent

### Issue: Checkout redirects to wrong environment

**Cause:** SDK server parameter doesn't match configuration

**Fix:** Verify `wrangler.toml`:
- `POLAR_SANDBOX = "true"` → redirects to `sandbox.polar.sh`
- `POLAR_SANDBOX = "false"` → redirects to `polar.sh`

### Issue: Webhook not received

**Cause:** Webhook not configured or URL incorrect

**Fix:**
1. Check webhook configuration in Polar dashboard
2. Verify URL: `https://gethiredpoc-api.carl-f-frank.workers.dev/api/webhooks/polar`
3. Check webhook delivery history in Polar dashboard
4. Check Cloudflare Workers logs for errors

### Issue: Database not updating after payment

**Cause:** Webhook handler error or userId missing from metadata

**Fix:**
1. Check Cloudflare Workers logs for webhook errors
2. Verify webhook payload includes `metadata.userId`
3. Test webhook manually from Polar dashboard

---

## Quick Reference

### Sandbox URLs
- Dashboard: https://sandbox.polar.sh
- API: https://sandbox-api.polar.sh
- Checkout: https://sandbox.polar.sh/checkout/...

### Production URLs
- Dashboard: https://polar.sh
- API: https://api.polar.sh
- Checkout: https://polar.sh/checkout/...

### Environment Variables
```toml
# Testing (Sandbox)
POLAR_SANDBOX = "true"
POLAR_ACCESS_TOKEN = "polar_sat_..." (secret)
POLAR_PRODUCT_ID = "sandbox_product_id"

# Production
POLAR_SANDBOX = "false"
POLAR_ACCESS_TOKEN = "polar_oat_..." (secret)
POLAR_PRODUCT_ID = "production_product_id"
```

### Test Commands
```bash
# Discover products in sandbox
npx tsx packages/backend/test-polar.ts

# Test checkout creation in sandbox
npx tsx packages/backend/test-checkout.ts

# Deploy backend
cd packages/backend && npm run deploy

# Check logs
# Visit: https://dash.cloudflare.com/
```

---

## Next Steps

1. ✅ Complete sandbox setup following this guide
2. ✅ Test end-to-end checkout flow in sandbox
3. ✅ Verify webhooks work correctly
4. ✅ Test subscription cancellation
5. ✅ Test failed payment scenarios
6. ⬜ When ready, switch to production environment
7. ⬜ Test production with real card (small amount)
8. ⬜ Enable for users

---

**Last Updated:** January 7, 2026
**Status:** Sandbox configuration added to codebase
**Current Mode:** Sandbox (`POLAR_SANDBOX = "true"`)
