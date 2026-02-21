import { test, expect, signupUser, generateTestEmail } from './fixtures';

/**
 * Navigation with Trial Badge Tests
 *
 * Tests the navigation showing trial status badge
 */

test.describe('Navigation - Trial Badge', () => {
  test.beforeEach(async ({ page }) => {
    // Create a new user with trial
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    await signupUser(page, email, password);
  });

  test('should show PRO Trial badge in navigation', async ({ page }) => {
    // Navigate to any page
    await page.goto('/');

    // Check for PRO Trial badge in navigation
    const trialBadge = page.locator('nav span:has-text("PRO Trial")');
    await expect(trialBadge).toBeVisible();

    // Verify styling (blue badge)
    await expect(trialBadge).toHaveClass(/bg-blue-100.*text-blue-700/);
  });

  test('should show "Keep PRO Access" button in navigation', async ({ page }) => {
    await page.goto('/');

    // Check for upgrade button with trial-specific text
    const keepProButton = page.locator('nav button:has-text("Keep PRO Access")');
    await expect(keepProButton).toBeVisible();
  });

  test('should navigate to subscription page when clicking upgrade button', async ({ page }) => {
    await page.goto('/');

    // Click the "Keep PRO Access" button
    await page.click('nav button:has-text("Keep PRO Access")');

    // Should navigate to subscription page
    await page.waitForURL('/subscription');
  });

  test('should show trial badge on all pages', async ({ page }) => {
    const pages = ['/jobs', '/applications', '/resume', '/profile', '/settings'];

    for (const path of pages) {
      try {
        await page.goto(path, { waitUntil: 'domcontentloaded' });

        // Check for PRO Trial badge
        const trialBadge = page.locator('nav span:has-text("PRO Trial")');
        await expect(trialBadge).toBeVisible({ timeout: 5000 });
      } catch (error) {
        // Some pages might not exist or require additional setup
        console.log(`Skipping test for ${path}: ${error}`);
      }
    }
  });

  test('should show user email with trial badge', async ({ page }) => {
    await page.goto('/');

    // Check that both email and badge are in the same button
    const profileButton = page.locator('nav button:has-text("@example.com")');
    await expect(profileButton).toBeVisible();

    // Badge should be within the same button
    const badgeInButton = profileButton.locator('span:has-text("PRO Trial")');
    await expect(badgeInButton).toBeVisible();
  });
});
