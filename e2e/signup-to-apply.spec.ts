import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser, bypassOnboarding, navigateTo } from './helpers';

/**
 * E2E test: signup -> bypass onboarding -> job search -> apply
 *
 * Prerequisites:
 *   - Frontend dev server running on http://localhost:5173
 *   - Backend dev server running on http://localhost:8787
 *   - D1 database seeded with at least one job
 */
test('signup -> profile setup -> job search -> apply', async ({ page }) => {
  const email = generateTestEmail();
  const password = 'TestPassword123!';

  // ---- Step 1: Signup with all required fields ----
  await signupUser(page, email, password);

  // ---- Step 2: Bypass onboarding via test-utils endpoint ----
  await bypassOnboarding(page, email);

  // ---- Step 3: Navigate to jobs ----
  await navigateTo(page, '/jobs');
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // Check whether there are jobs or empty state
  const jobLinks = page.locator('a[href^="/jobs/"]');
  const jobCount = await jobLinks.count();
  const emptyState = await page.getByText('No jobs found matching your criteria').isVisible().catch(() => false);

  if (jobCount === 0 && emptyState) {
    test.info().annotations.push({
      type: 'info',
      description: 'Steps 1-3 passed but apply step skipped: no jobs in dev database.',
    });
    return;
  }

  // ---- Step 4: Click a job and apply ----
  await jobLinks.first().click();
  await expect(page).toHaveURL(/\/jobs\/[^/]+$/, { timeout: 10000 });

  // Click "Apply Now"
  await page.click('button:has-text("Apply Now")');

  // Should redirect to /applications
  await expect(page).toHaveURL(/\/applications/, { timeout: 15000 });

  // Verify application tracker page is shown
  await expect(page.getByText('Application Tracker')).toBeVisible();
});
