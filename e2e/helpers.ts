import { Page, expect } from '@playwright/test';

const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8787';

/**
 * Generate a unique test email for each test run
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `e2e-${timestamp}-${random}@example.com`;
}

/**
 * Sign up a new user by filling all 9 required fields + checkboxes
 */
export async function signupUser(
  page: Page,
  email: string,
  password: string = 'TestPassword123!'
) {
  await page.goto('/signup');

  // Fill all required fields
  await page.fill('#firstName', 'Test');
  await page.fill('#lastName', 'User');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#phone', '5551234567');
  await page.fill('#streetAddress', '123 Test St');
  await page.fill('#city', 'Testville');
  await page.selectOption('#state', 'CA');
  await page.fill('#zipCode', '94102');

  // Accept ToS and Privacy Policy
  await page.check('#accept-tos');
  await page.check('#accept-privacy');

  // Submit
  await page.click('button:has-text("Start Free Trial")');

  // Wait for auth to complete — redirects to profile or onboarding
  await page.waitForURL(/.*(profile|onboarding|jobs)/, { timeout: 15000 });
}

/**
 * Log in an existing user
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string = 'TestPassword123!'
) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL(/.*(jobs|profile|onboarding)/, { timeout: 15000 });
}

/**
 * Log out the current user
 */
export async function logoutUser(page: Page) {
  await page.click('button:has-text("Logout")');
  await page.waitForURL(/\/(login)?$/, { timeout: 10000 });
}

/**
 * Bypass onboarding by calling the test-utils endpoint directly
 */
export async function bypassOnboarding(page: Page, email: string) {
  const response = await page.request.post(`${BACKEND_URL}/api/test-utils/complete-onboarding`, {
    data: { email },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
}

/**
 * Navigate to a path while preserving auth.
 * Uses nav links when possible, falls back to direct navigation.
 */
export async function navigateTo(page: Page, path: string) {
  const currentUrl = page.url();
  if (currentUrl.endsWith(path) || currentUrl.includes(path + '?')) return;

  const navLinks: Record<string, string> = {
    '/jobs': 'Jobs',
    '/saved': 'Saved',
    '/applications': 'Applications',
    '/profile': 'Profile',
  };

  const linkText = navLinks[path];
  if (linkText) {
    const navLink = page.locator(`nav >> text=${linkText}`);
    if (await navLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await navLink.click();
      await page.waitForLoadState('domcontentloaded');
      return;
    }
  }

  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
}
