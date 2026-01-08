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

  // Fill in signup form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Accept ToS and Privacy Policy
  await page.check('#accept-tos');
  await page.check('#accept-privacy');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/profile|\/dashboard/);
}

/**
 * Helper function to log in an existing user
 */
export async function loginUser(
  page: any,
  email: string,
  password: string
) {
  await page.goto('/login');

  // Fill in login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/profile|\/dashboard|\/jobs/);
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
