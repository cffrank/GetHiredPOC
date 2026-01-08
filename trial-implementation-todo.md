# 14-Day Free Trial Implementation Todo

## Phase 1: Database Changes
- [ ] Create migration `migrations/0018_add_trial_fields.sql`
  - Add `trial_expires_at` INTEGER column
  - Add `is_trial` INTEGER DEFAULT 0 column
  - Create index `idx_users_trial_expires`
  - Migrate existing users with trial_started_at

## Phase 2: Backend Implementation
- [ ] Update `packages/backend/src/services/auth.service.ts`
  - Modify `signup()` to grant 14-day PRO trial
  - Set `subscription_tier = 'pro'`, `is_trial = 1`
  - Calculate and set `trial_expires_at`

- [ ] Update `packages/backend/src/services/subscription.service.ts`
  - Add `checkTrialExpiration()` function
  - Add `downgradeToFree()` helper function
  - Update `getUserTier()` to check trial expiration and return 'pro-trial'

- [ ] Update `packages/backend/src/index.ts`
  - Add cron job for expired trials (downgrade)
  - Add cron job for 7-day warning emails
  - Add cron job for 1-day warning emails

- [ ] Update `packages/backend/src/services/email.service.ts`
  - Add `sendTrialWarningEmail()` function
  - Add `sendTrialExpiredEmail()` function

- [ ] Update `packages/backend/src/routes/subscription.ts` (webhooks)
  - Set `is_trial = 0` when paid subscription starts via Polar webhook

## Phase 3: Frontend Implementation
- [ ] Update `packages/frontend/src/pages/Signup.tsx`
  - Add ToS checkbox (required)
  - Add Privacy Policy checkbox (required)
  - Add "14-day FREE PRO trial" banner
  - Change button text to "Start Free Trial"
  - Disable submit until both checkboxes checked

- [ ] Update `packages/frontend/src/pages/Subscription.tsx`
  - Show "PRO Trial Active" with days remaining for trial users
  - Show "PRO Subscription Active" for paid users
  - Show upgrade prompt for FREE tier users

- [ ] Update `packages/frontend/src/components/Navigation.tsx`
  - Show "PRO Trial" badge (green) for trial users
  - Show "PRO" badge (blue) for paid users
  - Show "FREE" badge (gray) for free tier

## Phase 4: Testing
- [ ] Database tests
  - Migration runs successfully
  - Index created
  - Existing users migrated correctly

- [ ] Signup flow tests
  - New user gets `is_trial=1`
  - `trial_expires_at` = 14 days from now
  - User starts with `subscription_tier='pro'`
  - Can't submit without ToS/Privacy checkboxes

- [ ] Trial expiration tests
  - Cron finds expired trials
  - Users downgraded to FREE after expiry
  - `is_trial` set to 0
  - `subscription_status` set to 'expired'

- [ ] Email notification tests
  - 7-day warning sends
  - 1-day warning sends
  - Trial expired email sends
  - Correct dates in emails
  - Links work

- [ ] Frontend UI tests (Playwright)
  - Subscription page shows trial status
  - Navigation badge correct
  - Upgrade button visible during trial
  - FREE tier shown after expiry
  - PRO shown after paid upgrade

- [ ] Paid upgrade tests
  - Polar checkout works
  - Webhook sets `is_trial=0`
  - Badge changes from "PRO Trial" to "PRO"

## Phase 5: Deployment
1. [ ] Deploy database migration
2. [ ] Deploy backend
3. [ ] Deploy frontend
4. [ ] Verify cron job in Cloudflare dashboard

## Phase 6: Post-Deployment Verification
- [ ] Create test user
- [ ] Verify PRO trial status in database
- [ ] Verify "PRO Trial" badge
- [ ] Check /subscription shows days remaining
- [ ] Verify ToS/Privacy checkboxes on signup
- [ ] Test manual expiration (update trial_expires_at)
- [ ] Verify downgrade to FREE
- [ ] Verify trial expired email sent
