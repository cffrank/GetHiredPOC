import { test, expect } from '@playwright/test';
import { generateTestEmail, signupUser, loginUser, logoutUser, bypassOnboarding } from './helpers';

test.describe('Authentication flows', () => {
  test('signup with all required fields succeeds', async ({ page }) => {
    const email = generateTestEmail();
    await signupUser(page, email);

    // Should be on profile or onboarding after signup
    expect(page.url()).toMatch(/\/(profile|onboarding)/);
  });

  test('signup shows validation error for invalid phone', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'User');
    await page.fill('#email', generateTestEmail());
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#phone', '123'); // Too short
    await page.fill('#streetAddress', '123 Test St');
    await page.fill('#city', 'Testville');
    await page.selectOption('#state', 'CA');
    await page.fill('#zipCode', '94102');
    await page.check('#accept-tos');
    await page.check('#accept-privacy');

    await page.click('button:has-text("Start Free Trial")');

    // Should show validation error
    await expect(page.locator('.text-red-600')).toContainText('phone', { ignoreCase: true });
  });

  test('signup shows validation error for invalid zip code', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'User');
    await page.fill('#email', generateTestEmail());
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#phone', '5551234567');
    await page.fill('#streetAddress', '123 Test St');
    await page.fill('#city', 'Testville');
    await page.selectOption('#state', 'CA');
    await page.fill('#zipCode', 'abc'); // Invalid
    await page.check('#accept-tos');
    await page.check('#accept-privacy');

    await page.click('button:has-text("Start Free Trial")');

    // Should show validation error
    await expect(page.locator('.text-red-600')).toContainText('zip', { ignoreCase: true });
  });

  test('signup shows validation error when state not selected', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('#firstName', 'Test');
    await page.fill('#lastName', 'User');
    await page.fill('#email', generateTestEmail());
    await page.fill('#password', 'TestPassword123!');
    await page.fill('#phone', '5551234567');
    await page.fill('#streetAddress', '123 Test St');
    await page.fill('#city', 'Testville');
    // Don't select state
    await page.fill('#zipCode', '94102');
    await page.check('#accept-tos');
    await page.check('#accept-privacy');

    await page.click('button:has-text("Start Free Trial")');

    // Should show validation error about state
    await expect(page.locator('.text-red-600')).toContainText('state', { ignoreCase: true });
  });

  test('login with valid credentials', async ({ page }) => {
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    // First, sign up
    await signupUser(page, email, password);
    await bypassOnboarding(page, email);
    await logoutUser(page);

    // Now login
    await loginUser(page, email, password);
    expect(page.url()).toMatch(/\/(jobs|profile|onboarding)/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'nobody@example.com');
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button:has-text("Sign In")');

    // Should show error message
    await expect(page.locator('.text-red-600')).toBeVisible({ timeout: 10000 });
  });

  test('logout redirects to home', async ({ page }) => {
    const email = generateTestEmail();
    await signupUser(page, email);
    await bypassOnboarding(page, email);

    // Navigate to jobs to ensure we have the nav
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');

    await logoutUser(page);
    expect(page.url()).toMatch(/\/(login)?$/);
  });

  test('session persists across page refresh', async ({ page }) => {
    const email = generateTestEmail();
    await signupUser(page, email);
    await bypassOnboarding(page, email);

    // Navigate to jobs
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');

    // Verify authenticated nav is visible
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should still be authenticated
    await expect(page.locator('button:has-text("Logout")')).toBeVisible({ timeout: 10000 });
  });

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Try accessing a protected route
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    // Should be redirected to login (or home)
    await expect(page).toHaveURL(/\/(login|signup|\?)/, { timeout: 10000 });
  });
});
