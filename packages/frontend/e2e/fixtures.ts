import { test as base, expect } from '@playwright/test';

/**
 * Test fixtures for GetHiredPOC E2E tests
 *
 * Provides common utilities and authenticated contexts
 */

type TestFixtures = {
  // Add custom fixtures here if needed
};

export const test = base.extend<TestFixtures>({
  // Custom fixtures can be added here
});

export { expect };

/**
 * Helper function to sign up a new user
 */
export async function signupUser(
  page: any,
  email: string,
  password: string
) {
  await page.goto('/signup');

  // Fill in all required signup fields
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.fill('input[id="firstName"]', 'Test');
  await page.fill('input[id="lastName"]', 'User');
  await page.fill('input[id="phone"]', '5551234567');
  await page.fill('input[id="streetAddress"]', '123 Test St');
  await page.fill('input[id="city"]', 'Test City');
  await page.selectOption('select[id="state"]', 'CA');
  await page.fill('input[id="zipCode"]', '94102');

  // Accept ToS and Privacy Policy
  await page.check('input[id="accept-tos"]');
  await page.check('input[id="accept-privacy"]');

  // Submit form - use text selector instead of type="submit"
  await page.click('button:has-text("Start Free Trial")');

  // Wait for navigation to complete - could go to multiple pages
  await page.waitForURL(/.*(profile|dashboard|jobs|onboarding|preferences)/, { timeout: 20000 });
}

/**
 * Helper function to log in an existing user
 */
export async function loginUser(
  page: any,
  email: string,
  password: string
) {
  console.log(`[loginUser] Navigating to /login`);
  await page.goto('/login');

  // Wait for login page to load
  await page.waitForLoadState('domcontentloaded');
  console.log(`[loginUser] Login page loaded, filling form with email: ${email}`);

  // Fill in login form
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);

  console.log(`[loginUser] Form filled, clicking Sign In button`);
  // Submit form
  await page.click('button:has-text("Sign In")');

  console.log(`[loginUser] Button clicked, waiting for navigation`);
  // Wait for navigation to complete - goes to /jobs after successful login
  try {
    await page.waitForURL(/.*(profile|dashboard|jobs|onboarding|preferences)/, { timeout: 20000 });
    console.log(`[loginUser] Successfully navigated to: ${page.url()}`);
  } catch (error) {
    console.error(`[loginUser] Navigation failed. Current URL: ${page.url()}`);
    // Check for error message on login page
    const errorMsg = await page.locator('.text-red-600').textContent().catch(() => null);
    if (errorMsg) {
      console.error(`[loginUser] Login error message: ${errorMsg}`);
    }
    throw error;
  }
}

/**
 * Helper function to log out
 */
export async function logoutUser(page: any) {
  await page.click('button:has-text("Logout")');
  await page.waitForURL('/');
}

/**
 * Generate a random test email
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-${timestamp}-${random}@example.com`;
}
