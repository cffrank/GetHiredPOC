import { test, expect, signupUser, generateTestEmail } from './fixtures';

/**
 * Subscription Page with Trial Status Tests
 *
 * Tests the subscription page showing trial information
 */

test.describe('Subscription Page - Trial Status', () => {
  test.beforeEach(async ({ page }) => {
    // Create a new user with trial
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    await signupUser(page, email, password);
  });

  test('should show PRO Trial badge', async ({ page }) => {
    await page.goto('/subscription');

    // Check for PRO Trial badge
    await expect(page.locator('text=PRO TRIAL')).toBeVisible();
  });

  test('should show trial plan information', async ({ page }) => {
    await page.goto('/subscription');

    // Check for plan name (in the main subscription area, use .first() to avoid strict mode violation)
    await expect(page.locator('main span:has-text("PRO Trial")').first()).toBeVisible();

    // Check for trial expiration info
    await expect(page.locator('text=Trial ends in:')).toBeVisible();
    await expect(page.locator('text=Trial expires:')).toBeVisible();
  });

  test('should show days remaining', async ({ page }) => {
    await page.goto('/subscription');

    // Check for days remaining (should be 14 or close to it)
    const daysText = page.locator('text=/\\d+\\s+(day|days)/');
    await expect(daysText).toBeVisible();
  });

  test('should show "Keep Your PRO Access" heading', async ({ page }) => {
    await page.goto('/subscription');

    // Check for trial-specific heading
    await expect(page.locator('h2:has-text("Keep Your PRO Access")')).toBeVisible();
  });

  test('should show upgrade button for trial users', async ({ page }) => {
    await page.goto('/subscription');

    // Check for upgrade section
    await expect(page.locator('text=Continue enjoying unlimited access')).toBeVisible();

    // Check for Polar checkout button
    await expect(page.locator('button:has-text("Upgrade")')).toBeVisible();
  });

  test('should show unlimited usage in dashboard', async ({ page }) => {
    await page.goto('/subscription');

    // Check for unlimited indicators
    await expect(page.locator('text=Unlimited').first()).toBeVisible();
  });

  test('should show PRO benefits list', async ({ page }) => {
    await page.goto('/subscription');

    // Check for benefits (using actual text from Subscription.tsx)
    await expect(page.locator('text=Unlimited job imports')).toBeVisible();
    await expect(page.locator('text=Unlimited applications')).toBeVisible();
    await expect(page.locator('text=Unlimited AI-generated resumes')).toBeVisible();
    await expect(page.locator('text=Unlimited cover letters')).toBeVisible();
  });
});
