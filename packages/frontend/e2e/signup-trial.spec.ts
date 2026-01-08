import { test, expect, generateTestEmail } from './fixtures';

/**
 * Signup Flow with 14-Day Trial Tests
 *
 * Tests the new user signup flow with automatic PRO trial
 */

test.describe('Signup with Trial', () => {
  test('should show trial banner on signup page', async ({ page }) => {
    await page.goto('/signup');

    // Check for trial banner
    await expect(page.locator('text=14-Day FREE PRO Trial Included')).toBeVisible();
    await expect(page.locator('text=no credit card required')).toBeVisible();
  });

  test('should show ToS and Privacy Policy checkboxes', async ({ page }) => {
    await page.goto('/signup');

    // Check for checkboxes
    await expect(page.locator('#accept-tos')).toBeVisible();
    await expect(page.locator('#accept-privacy')).toBeVisible();

    // Check for links
    await expect(page.locator('a:has-text("Terms of Service")')).toBeVisible();
    await expect(page.locator('a:has-text("Privacy Policy")')).toBeVisible();
  });

  test('should disable submit button until checkboxes are checked', async ({ page }) => {
    await page.goto('/signup');

    const submitButton = page.locator('button[type="submit"]');

    // Button should be disabled initially
    await expect(submitButton).toBeDisabled();

    // Fill in email and password
    await page.fill('input[type="email"]', generateTestEmail());
    await page.fill('input[type="password"]', 'TestPassword123!');

    // Still disabled without checkboxes
    await expect(submitButton).toBeDisabled();

    // Check ToS
    await page.check('#accept-tos');
    await expect(submitButton).toBeDisabled();

    // Check Privacy Policy
    await page.check('#accept-privacy');

    // Now should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should change button text to "Start Free Trial"', async ({ page }) => {
    await page.goto('/signup');

    // Check button text
    await expect(page.locator('button:has-text("Start Free Trial")')).toBeVisible();
  });

  test('should successfully signup and start trial', async ({ page }) => {
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    await page.goto('/signup');

    // Fill in form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.check('#accept-tos');
    await page.check('#accept-privacy');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to profile or dashboard
    await page.waitForURL(/\/profile|\/dashboard/, { timeout: 10000 });

    // Should show PRO Trial badge in navigation (use specific selector to avoid strict mode violation)
    await expect(page.locator('nav span.bg-blue-100:has-text("PRO Trial")')).toBeVisible();
  });
});
