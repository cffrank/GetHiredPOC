import { test, expect } from './fixtures';

/**
 * Smoke Tests
 *
 * Basic tests to verify the app is running and accessible
 */

test.describe('Smoke Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check for app branding in navigation (more specific selector)
    await expect(page.locator('nav a:has-text("JobMatch AI")')).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/');

    // Click signup button
    await page.click('text=Sign Up');

    // Should be on signup page
    await page.waitForURL('/signup');
    await expect(page.locator('text=Create Account').first()).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Click login button
    await page.click('text=Login');

    // Should be on login page
    await page.waitForURL('/login');
    await expect(page.locator('text=Sign In').first()).toBeVisible();
  });

  test('should navigate to Terms of Service page', async ({ page }) => {
    await page.goto('/signup');

    // Click ToS link
    await page.click('a:has-text("Terms of Service")');

    // Should open ToS page (may be in new tab)
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('a:has-text("Terms of Service")'),
    ]);

    await popup.waitForLoadState();
    expect(popup.url()).toContain('/terms-of-service');
  });

  test('should navigate to Privacy Policy page', async ({ page }) => {
    await page.goto('/signup');

    // Click Privacy Policy link
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('a:has-text("Privacy Policy")'),
    ]);

    await popup.waitForLoadState();
    expect(popup.url()).toContain('/privacy-policy');
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('/');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav a:has-text("JobMatch AI")')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('nav a:has-text("JobMatch AI")')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('nav a:has-text("JobMatch AI")')).toBeVisible();
  });
});
