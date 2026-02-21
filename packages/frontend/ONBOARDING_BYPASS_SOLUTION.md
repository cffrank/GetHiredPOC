# Onboarding Bypass Solution for E2E Tests

## Problem
10 out of 13 E2E tests are failing because users are redirected to the onboarding flow when navigating to `/jobs`. Tests cannot proceed past the onboarding screen.

## Attempted Solutions

### ❌ Attempt 1: Test Utils API (Incomplete)
Created a backend API endpoint `/api/test-utils/complete-onboarding` to mark onboarding as complete via database update.

**Files Created**:
- `packages/backend/src/routes/test-utils.ts` - New route with onboarding bypass
- Updated `packages/backend/src/index.ts` - Registered test-utils route
- Updated `packages/frontend/e2e/fixtures.ts` - Call API after signup

**Blocker**: Local wrangler dev environment uses a separate D1 database instance than the running frontend. The API returns "no such table: users" because the local D1 is empty.

**Why It Failed**:
- Frontend (localhost:5173) connects to deployed/production backend
- Wrangler dev (localhost:8787) uses local D1 database with no data
- Database mismatch prevents the API from finding the newly created user

## ✅ Recommended Solution: Improve completeOnboarding() Function

The most reliable solution is to enhance the existing `completeOnboarding()` helper to robustly click through all 8 onboarding steps.

### Current completeOnboarding() Implementation
Located in `packages/frontend/e2e/fixtures.ts` (lines 28-90):
- Attempts to click through steps by finding "Next"/"Continue"/"Finish" buttons
- Tries to click option cards before clicking next
- Has a 10-step safety limit
- **Status**: Partially working but doesn't complete all steps reliably

### Required Improvements

#### 1. Better Option Card Detection
Current code tries to exclude navigation buttons but selector is too broad:
```typescript
const optionCards = page.locator('button:not(:has-text("Next")):not(:has-text("Continue")):not(:has-text("Finish")):not(:has-text("Back")):not(:has-text("Skip"))');
```

**Fix**: Use more specific selectors based on actual onboarding UI structure. Inspect the onboarding page to find:
- Specific class names for option cards
- Data attributes
- ARIA labels
- Parent container selectors

#### 2. Step-by-Step Verification
After clicking "Next", verify the step actually changed:
```typescript
const currentStep = await page.locator('[some-step-indicator-selector]').textContent();
console.log(`[completeOnboarding] On step: ${currentStep}`);
```

#### 3. Handle Different Step Types
The onboarding likely has different step types:
- Multiple choice (click one card)
- Multi-select (click multiple cards)
- Text input (fill forms)
- Optional vs required steps

**Solution**: Detect step type and handle accordingly:
```typescript
// Check if step has selectable cards
const hasCards = await page.locator('[card-selector]').count() > 0;

if (hasCards) {
  // Click first card or all cards depending on type
  await page.locator('[card-selector]').first().click();
}

// Check if step has input fields
const hasInputs = await page.locator('input[type="text"], textarea').count() > 0;

if (hasInputs) {
  // Fill with test data
  await page.fill('input[type="text"]', 'Test Value');
}
```

#### 4. Wait for Transitions
After clicking "Next", wait for the transition to complete:
```typescript
await page.click('button:has-text("Next")');

// Wait for the old step to disappear and new step to appear
await page.waitForTimeout(1500); // Or better: wait for specific element

// Verify we moved forward
const newUrl = page.url();
if (newUrl.includes('onboarding') || newUrl.includes('preferences')) {
  // Still on onboarding, continue
} else {
  // Completed!
  break;
}
```

#### 5. Debug Logging
Add detailed logging to understand where it gets stuck:
```typescript
console.log(`[completeOnboarding] Step ${step}: Found ${cardCount} cards`);
console.log(`[completeOnboarding] Step ${step}: Clicked card, waiting for next button`);
console.log(`[completeOnboarding] Step ${step}: Next button ${nextBtn.isVisible() ? 'found' : 'not found'}`);
```

### Implementation Steps

1. **Inspect Onboarding Flow**:
   ```bash
   # Manually go through onboarding and note:
   # - Number of steps (currently 8)
   # - What each step requires (click cards, fill forms, etc.)
   # - Selectors for option cards
   # - Selectors for step indicators
   ```

2. **Update completeOnboarding() with Specific Selectors**:
   ```typescript
   // Example based on actual UI inspection
   export async function completeOnboarding(page: any) {
     const steps = [
       { type: 'single-choice', selector: '.employment-status-card' },
       { type: 'multi-select', selector: '.job-title-chip' },
       { type: 'single-choice', selector: '.work-mode-card' },
       { type: 'multi-select', selector: '.location-chip' },
       // ...etc for all 8 steps
     ];

     for (const step of steps) {
       if (step.type === 'single-choice') {
         await page.locator(step.selector).first().click();
       } else if (step.type === 'multi-select') {
         // Click first 2-3 options
         const options = page.locator(step.selector);
         const count = await options.count();
         for (let i = 0; i < Math.min(3, count); i++) {
           await options.nth(i).click();
         }
       }

       // Click next
       await page.click('button:has-text("Next"), button:has-text("Continue")');
       await page.waitForTimeout(1500);
     }
   }
   ```

3. **Test and Iterate**:
   ```bash
   npx playwright test e2e/week1-3-features.spec.ts -g "should show advanced filters" --headed
   # Watch the onboarding flow and see where it fails
   # Add more specific selectors as needed
   ```

### Alternative: Skip Onboarding in Test Environment

If improving `completeOnboarding()` proves too complex, modify the frontend code:

**Option A**: Add environment variable check
```typescript
// In ProtectedRoute.tsx
const isTestEnv = import.meta.env.VITE_SKIP_ONBOARDING === 'true';

if (!requireAdmin && preferences && !preferences.onboardingCompleted && requiresOnboarding && !isTestEnv) {
  return <Navigate to="/onboarding" replace />;
}
```

**Option B**: Check for test user pattern
```typescript
// Skip onboarding for users with email matching test pattern
const isTestUser = user.email.startsWith('test-') && user.email.includes('@example.com');

if (!requireAdmin && preferences && !preferences.onboardingCompleted && requiresOnboarding && !isTestUser) {
  return <Navigate to="/onboarding" replace />;
}
```

## Current Status

**What Works** ✅:
- Authentication persistence across navigation (fixed)
- Independent test pattern (each test creates own user)
- Test infrastructure is solid
- 3/13 tests passing

**What's Blocked** ⚠️:
- 10 tests require Jobs page access
- Onboarding redirect prevents access
- `completeOnboarding()` function needs refinement

**Estimated Effort**: 1-2 hours to properly implement onboarding automation

## Next Steps

1. **Short-term** (Recommended):
   - Inspect onboarding UI to get accurate selectors
   - Update `completeOnboarding()` with step-by-step logic
   - Test with `--headed` mode to watch execution
   - Iterate until all 8 steps complete successfully

2. **Long-term** (Production):
   - Add E2E environment flag to skip onboarding
   - Document that E2E tests bypass onboarding
   - Keep `completeOnboarding()` as backup for integration tests

## Files to Modify

**Priority 1** (Fix onboarding):
- `packages/frontend/e2e/fixtures.ts` - Improve `completeOnboarding()`

**Priority 2** (If approach 1 fails):
- `packages/frontend/src/components/ProtectedRoute.tsx` - Add test env check
- `packages/frontend/.env.test` - Add VITE_SKIP_ONBOARDING=true
- `packages/frontend/playwright.config.ts` - Set test env variables

## Test Command

```bash
# Run single test with browser visible to debug onboarding
cd packages/frontend
npx playwright test e2e/week1-3-features.spec.ts \
  -g "should show advanced filters" \
  --headed \
  --project=chromium

# Once working, run all tests
npx playwright test e2e/week1-3-features.spec.ts --project=chromium
```

## Success Criteria

✅ All 13 tests in week1-3-features.spec.ts pass
✅ Tests can navigate to `/jobs` without onboarding redirect
✅ Onboarding bypass is reliable (doesn't flake)
✅ Solution doesn't require backend changes
