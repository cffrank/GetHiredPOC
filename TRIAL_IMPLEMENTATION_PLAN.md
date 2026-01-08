# 14-Day Free Trial Implementation Plan

## Business Model

### Current (Wrong)
- Users start as FREE
- Can upgrade to PRO ($39/month) with payment
- Payment required immediately

### New (Correct)
- **All new users** start with 14-day FREE PRO trial (auto-selected)
- During trial: Full PRO access, no payment required
- 7 days before expiry: Email warning
- 1 day before expiry: Final email warning
- After trial expires: Auto-downgrade to FREE tier with limits
- User can upgrade to paid PRO anytime during or after trial
- **Only collect payment when upgrading to paid PRO subscription**

## Database Changes

### New Fields Needed
Already have:
- `trial_started_at` (INTEGER) - Timestamp when trial started
- `subscription_tier` ('free' | 'pro')
- `subscription_status` ('active' | 'canceled' | 'expired')
- `subscription_started_at` (INTEGER) - When PAID subscription started
- `subscription_expires_at` (INTEGER) - When subscription expires

Need to add:
- `trial_expires_at` (INTEGER) - When trial expires
- `is_trial` (BOOLEAN) - Whether current PRO status is from trial or paid

##Frontend Changes

### 1. Signup Page (/packages/frontend/src/pages/Signup.tsx)
**Add:**
- Checkbox: "I agree to the Terms of Service"
- Checkbox: "I agree to the Privacy Policy"
- Remove tier selection (everyone gets trial automatically)
- Show message: "Start your 14-day FREE PRO trial - no credit card required"

### 2. Subscription Page
**Show:**
- If on trial: "PRO Trial - X days remaining"
- If trial expired: "Trial Ended - Upgrade to PRO"
- If on paid PRO: "PRO - Active"
- Only show "Upgrade to PRO" button if:
  - User is on FREE tier (never had trial, OR trial expired)
  - User had trial that expired

**Hide "Upgrade to PRO" if:**
- User is currently on PRO trial
- User is on paid PRO subscription

### 3. Navigation Badge
**Show:**
- "PRO Trial" if on trial
- "PRO" if on paid subscription
- "FREE" if trial expired or never had trial

## Backend Changes

### 1. Auth Service (/packages/backend/src/services/auth.service.ts)
**Update `signup()`:**
```typescript
// Set new users to PRO trial automatically
const trialStartsAt = Math.floor(Date.now() / 1000);
const trialExpiresAt = trialStartsAt + (14 * 24 * 60 * 60); // 14 days

subscription_tier = 'pro'
subscription_status = 'active'
trial_started_at = trialStartsAt
trial_expires_at = trialExpiresAt
is_trial = 1
```

### 2. Subscription Service (/packages/backend/src/services/subscription.service.ts)
**Update `checkUserTier()`:**
```typescript
// Check if trial has expired
if (user.is_trial && user.trial_expires_at && now > user.trial_expires_at) {
  // Auto-downgrade to FREE
  await downgradeToFree(userId);
  return 'free';
}

// If on paid PRO or active trial
if (user.subscription_tier === 'pro') {
  return user.is_trial ? 'pro-trial' : 'pro';
}

return 'free';
```

**Add `downgradeToFree()`:**
```typescript
async function downgradeToFree(userId: string) {
  await db.prepare(`
    UPDATE users
    SET subscription_tier = 'free',
        subscription_status = 'expired',
        is_trial = 0
    WHERE id = ?
  `).bind(userId).run();

  // Send trial expired email
  await sendTrialExpiredEmail(user);
}
```

### 3. Upgrade Endpoint
**Update `/api/subscription/upgrade`:**
- Only create Polar checkout if user wants to pay for PRO
- Do NOT call this during trial signup (trial is automatic)
- Set `is_trial = 0` when paid subscription starts

### 4. Cron Job (New)
**Create `/api/cron/check-trials`:**
```typescript
// Run daily at 1 AM UTC
// Check for expired trials
const expiredTrials = await db.prepare(`
  SELECT id, email, trial_expires_at
  FROM users
  WHERE is_trial = 1
    AND trial_expires_at < unixepoch()
    AND subscription_tier = 'pro'
`).all();

for (const user of expiredTrials) {
  await downgradeToFree(user.id);
}

// Check for trials expiring in 7 days
const expiringIn7Days = await db.prepare(`
  SELECT id, email, trial_expires_at
  FROM users
  WHERE is_trial = 1
    AND trial_expires_at BETWEEN unixepoch() AND unixepoch() + (7 * 24 * 60 * 60)
    AND trial_expires_at > unixepoch() + (6 * 24 * 60 * 60)
`).all();

for (const user of expiringIn7Days) {
  await sendTrialWarningEmail(user, 7);
}

// Check for trials expiring in 1 day
const expiringIn1Day = await db.prepare(`
  SELECT id, email, trial_expires_at
  FROM users
  WHERE is_trial = 1
    AND trial_expires_at BETWEEN unixepoch() AND unixepoch() + (24 * 60 * 60)
`).all();

for (const user of expiringIn1Day) {
  await sendTrialWarningEmail(user, 1);
}
```

### 5. Email Templates (New)
**Create:**
- `TrialWarningEmail.tsx` - 7 days before expiry
- `TrialFinalWarningEmail.tsx` - 1 day before expiry
- `TrialExpiredEmail.tsx` - After trial ends

## Migration

### Migration File: 0018_add_trial_fields.sql
```sql
-- Add trial tracking fields
ALTER TABLE users ADD COLUMN trial_expires_at INTEGER;
ALTER TABLE users ADD COLUMN is_trial INTEGER DEFAULT 0;

-- Create index for trial expiration queries
CREATE INDEX IF NOT EXISTS idx_users_trial_expires ON users(trial_expires_at) WHERE is_trial = 1;

-- Migrate existing users: Anyone with trial_started_at but no paid subscription gets trial
UPDATE users
SET is_trial = 1,
    trial_expires_at = trial_started_at + (14 * 24 * 60 * 60)
WHERE trial_started_at IS NOT NULL
  AND polar_subscription_id IS NULL;
```

## Testing Checklist

- [ ] New user signup → Gets 14-day PRO trial automatically
- [ ] During trial → Full PRO features accessible
- [ ] Trial page shows "PRO Trial - X days remaining"
- [ ] 7 days before expiry → Warning email sent
- [ ] 1 day before expiry → Final warning email sent
- [ ] Trial expires → Auto-downgrade to FREE
- [ ] After trial → User can upgrade to paid PRO
- [ ] Paid upgrade → Creates Polar checkout
- [ ] Paid subscription → Shows "PRO" (not "PRO Trial")
- [ ] ToS/Privacy checkboxes required on signup

## Implementation Order

1. ✅ Create ToS and Privacy Policy pages
2. ✅ Add routes for legal pages
3. ⏳ Create database migration for trial fields
4. ⏳ Update signup to give all users 14-day trial
5. ⏳ Add ToS/Privacy checkboxes to signup
6. ⏳ Update subscription service for trial logic
7. ⏳ Create email templates for trial warnings
8. ⏳ Create cron job for trial expiration
9. ⏳ Update UI to show trial status
10. ⏳ Test complete flow end-to-end
