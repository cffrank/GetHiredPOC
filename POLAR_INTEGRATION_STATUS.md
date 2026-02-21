# Polar.sh Integration Status

## ✅ Completed Tasks (Week 1, Days 1-3)

### Backend Integration
- [x] Installed `@polar-sh/sdk` in backend
- [x] Created `/packages/backend/src/services/polar.service.ts` with:
  - `createCheckoutSession()` - Creates Polar checkout for user
  - `retrieveCustomer()` - Gets customer details
  - `retrieveSubscription()` - Gets subscription status
  - `cancelSubscription()` - Cancels a subscription
  - `verifyWebhookSignature()` - Placeholder for webhook verification
- [x] Created `/packages/backend/src/routes/webhooks.ts` with handlers for:
  - `subscription.created` - Upgrades user to PRO
  - `subscription.updated` - Updates subscription status
  - `subscription.canceled` - Marks subscription as canceled
  - `subscription.expired` - Downgrades user to FREE
  - `payment.succeeded` - Logs successful payment
  - `payment.failed` - Triggers dunning email (placeholder)
- [x] Updated `/packages/backend/src/routes/subscription.ts`:
  - Replaced manual upgrade with Polar checkout session creation
  - Added `POST /api/subscription/cancel` endpoint
- [x] Added webhooks route to `/packages/backend/src/index.ts`
- [x] Updated `Env` interface in `db.service.ts` with:
  - `POLAR_ACCESS_TOKEN`
  - `POLAR_PRODUCT_PRICE_ID`
- [x] Updated `wrangler.toml` with Polar configuration comments
- [x] Created migration `/migrations/0017_polar_integration.sql`:
  - Added `polar_customer_id` column
  - Added `polar_subscription_id` column
  - Added indexes for faster lookups

### Frontend Integration
- [x] Installed `@polar-sh/sdk` in frontend (for reference)
- [x] Created `/packages/frontend/src/components/PolarCheckout.tsx`:
  - Button with loading state
  - Error handling
  - Calls backend to create checkout session
  - Redirects to Polar checkout page
- [x] Updated `/packages/frontend/src/pages/Subscription.tsx`:
  - Replaced `alert()` stub with `<PolarCheckout>` component
  - Added success message banner
  - Added `useEffect` to detect `?success=true` redirect
  - Polls `/api/subscription/status` after checkout to update UI
  - Invalidates TanStack Query cache on success

---

## 🚫 Blocked Tasks (Require Manual Setup)

### Polar.sh Account Setup (Day 1, Morning)
**User must complete these tasks manually:**

1. **Sign up for Polar.sh account**
   - Go to https://polar.sh
   - Create account with email
   - Verify email

2. **Create PRO product in Polar dashboard**
   - Product name: "GetHiredPOC PRO Monthly"
   - Price: $39.00 USD/month
   - Billing: Recurring monthly
   - Description: "Unlimited job searches, applications, AI-generated resumes and cover letters"

3. **Get API credentials**
   - Navigate to Settings → API Keys
   - Create new API key
   - Copy the access token (starts with `polar_sk_...`)
   - Copy the product price ID (starts with `price_...`)

4. **Set Cloudflare Workers secrets**
   ```bash
   cd packages/backend
   npx wrangler secret put POLAR_ACCESS_TOKEN
   # Paste your access token when prompted
   ```

5. **Update wrangler.toml with product price ID**
   ```toml
   # Add this line to wrangler.toml [vars] section
   POLAR_PRODUCT_PRICE_ID = "price_xxx"  # Replace with actual price ID
   ```

6. **Configure Polar webhook (Day 4)**
   - In Polar dashboard, go to Settings → Webhooks
   - Create new webhook
   - URL: `https://gethiredpoc-api.carl-f-frank.workers.dev/api/webhooks/polar`
   - Events: Select all `subscription.*` and `payment.*` events
   - Copy webhook secret
   - **TODO**: Implement webhook signature verification in `webhooks.ts`

7. **Run migration**
   ```bash
   cd packages/backend
   npx wrangler d1 migrations apply gethiredpoc-db --remote
   ```

8. **Deploy backend & frontend**
   ```bash
   # Backend
   cd packages/backend
   npm run deploy

   # Frontend
   cd packages/frontend
   npm run build
   npm run deploy
   ```

---

## 🧪 Testing Checklist (After Manual Setup)

Once credentials are configured:

- [ ] Test checkout session creation:
  ```bash
  curl -X POST https://gethiredpoc-api.carl-f-frank.workers.dev/api/subscription/upgrade \
    -H "Authorization: Bearer <your-jwt-token>"
  # Should return checkout_url
  ```

- [ ] Click "Upgrade to PRO" button in frontend
  - Should redirect to Polar checkout page
  - Complete test payment (use Polar test mode if available)
  - Should redirect back to `/subscription?success=true`
  - Success banner should appear
  - Subscription status should update to PRO (may take a few seconds)

- [ ] Test webhook delivery:
  - Check Cloudflare Workers logs for webhook events
  - Verify database updates after payment
  - Verify user tier changes to 'pro'

- [ ] Test cancellation:
  ```bash
  curl -X POST https://gethiredpoc-api.carl-f-frank.workers.dev/api/subscription/cancel \
    -H "Authorization: Bearer <your-jwt-token>"
  # Should cancel Polar subscription
  ```

---

## 📝 Next Steps

### Week 1, Day 4: Production Deployment
- [ ] Complete blocked tasks above
- [ ] Configure production webhook with signature verification
- [ ] Deploy backend with Polar credentials
- [ ] End-to-end production testing
- [ ] Document Polar integration in README
- [ ] Create troubleshooting guide

### Week 1, Day 5: Refinement
- [ ] Implement proper webhook signature verification
- [ ] Add error handling for edge cases
- [ ] Improve loading states
- [ ] Add Polar customer portal link for self-service billing
- [ ] Write admin guide for subscription issues
- [ ] Create customer support scripts
- [ ] Set up monitoring for webhook failures

### Week 2+: Continue with TanStack Table, Email Automation, Analytics
- Week 2: Admin efficiency with TanStack Table
- Week 3: Email automation for retention
- Week 4: Analytics dashboard

---

## 🔒 Security Notes

**IMPORTANT:**
1. **Webhook signature verification** is currently a placeholder (`TODO`)
   - MUST implement actual verification before production
   - Without it, anyone could send fake webhook events
   - See Polar.sh docs for signature verification method

2. **Environment variables** must be kept secure
   - NEVER commit `POLAR_ACCESS_TOKEN` to git
   - Use Cloudflare Wrangler secrets only
   - Rotate keys if accidentally exposed

3. **Test mode recommended** for initial testing
   - Use Polar test mode to avoid real charges
   - Switch to production mode only when ready

---

## 📚 References

- Polar.sh Documentation: https://docs.polar.sh/
- Polar.sh SDK: https://github.com/polarsource/polar-js
- Cloudflare Workers Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Webhook Best Practices: https://docs.polar.sh/webhooks

---

## Summary

**Code Status:** ✅ COMPLETE - All Week 1 Day 1-3 code is written and ready

**Deployment Status:** 🚫 BLOCKED - Requires Polar account setup and credentials

**Next Action:** User must create Polar.sh account, create product, and configure credentials as outlined above.
