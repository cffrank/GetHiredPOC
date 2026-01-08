# Task: 14-Day Free Trial Implementation

## Context
Implement the 14-day free trial system for GetHiredPOC. Reference the detailed spec in the uploaded document and checklist in trial-implementation-todo.md.

## Work Order
Execute in this exact sequence:

### 1. Database Migration
- Create `migrations/0018_add_trial_fields.sql`
- Add `trial_expires_at` INTEGER column
- Add `is_trial` INTEGER DEFAULT 0 column  
- Create index `idx_users_trial_expires`
- Run migration: `npx wrangler d1 execute gethiredpoc-db --local --file=migrations/0018_add_trial_fields.sql`

### 2. Backend Services
- Update `packages/backend/src/services/auth.service.ts` - modify signup() to grant 14-day PRO trial
- Update `packages/backend/src/services/subscription.service.ts` - add checkTrialExpiration(), downgradeToFree(), update getUserTier()
- Update `packages/backend/src/services/email.service.ts` - add sendTrialWarningEmail(), sendTrialExpiredEmail()
- Update `packages/backend/src/index.ts` - add cron jobs for trial expiration and warning emails
- Update `packages/backend/src/routes/subscription.ts` - set is_trial=0 on Polar webhook

### 3. Frontend Components
- Update `packages/frontend/src/pages/Signup.tsx` - add ToS/Privacy checkboxes, trial banner, disable submit until checked
- Update `packages/frontend/src/pages/Subscription.tsx` - show trial status with days remaining
- Update `packages/frontend/src/components/Navigation.tsx` - show PRO Trial/PRO/FREE badges

### 4. Testing
- Write Playwright tests for signup flow (checkboxes required, trial granted)
- Write Playwright tests for subscription page (trial status display)
- Write Playwright tests for navigation badge
- Run all tests: `npx playwright test`

## Rules
- Check off each task in trial-implementation-todo.md as `[x]` when complete
- Run tests after each frontend component change
- If a test fails, fix it before moving on
- Follow existing code patterns in the project

## If Blocked
After 10 iterations without progress:
- Document the blocking issue in trial-implementation-todo.md
- List attempted solutions
- Stop and output <promise>BLOCKED</promise>

## Completion
Output <promise>DONE</promise> ONLY when:
- All tasks in trial-implementation-todo.md are checked off
- All Playwright tests pass
- No TypeScript/lint errors
