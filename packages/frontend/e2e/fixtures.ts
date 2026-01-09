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
 * Generate a random test email
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Helper function to complete onboarding flow
 */
export async function completeOnboarding(page: any) {
  console.log(`[completeOnboarding] Starting onboarding completion`);

  // Check if we're on the onboarding page
  const currentUrl = page.url();
  if (!currentUrl.includes('onboarding') && !currentUrl.includes('preferences')) {
    console.log(`[completeOnboarding] Not on onboarding page, checking if we need to navigate`);
    // Try navigating to preferences/onboarding
    await page.goto('/preferences').catch(() => page.goto('/onboarding'));
  }

  // Wait for onboarding page to load
  await page.waitForLoadState('domcontentloaded');

  // Click through all onboarding steps quickly with default selections
  const maxSteps = 10; // Safety limit
  for (let step = 0; step < maxSteps; step++) {
    console.log(`[completeOnboarding] Step ${step + 1}`);

    // Check for selectable option cards/buttons (excluding navigation buttons)
    const optionCards = page.locator('button:not(:has-text("Next")):not(:has-text("Continue")):not(:has-text("Finish")):not(:has-text("Back")):not(:has-text("Skip"))');
    const cardCount = await optionCards.count().catch(() => 0);

    if (cardCount > 0) {
      console.log(`[completeOnboarding] Found ${cardCount} option cards, clicking first one`);
      // Click the first option card
      await optionCards.first().click();
      await page.waitForTimeout(800);
    }

    // Look for "Next" or "Continue" or "Finish" button
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Finish"), button:has-text("Get Started")').first();

    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`[completeOnboarding] Clicking next/continue button`);
      await nextBtn.click();
      await page.waitForTimeout(1500);

      // Check if we've navigated away from onboarding
      const newUrl = page.url();
      if (!newUrl.includes('onboarding') && !newUrl.includes('preferences')) {
        console.log(`[completeOnboarding] Onboarding complete, navigated to: ${newUrl}`);
        break;
      }
    } else {
      console.log(`[completeOnboarding] No next button found, checking if onboarding is complete`);
      // Double-check if we're still on onboarding
      const currentUrl = page.url();
      if (!currentUrl.includes('onboarding') && !currentUrl.includes('preferences')) {
        console.log(`[completeOnboarding] Already left onboarding page`);
        break;
      }
      // If we're still on onboarding but no next button, we might be stuck
      console.log(`[completeOnboarding] Still on onboarding but no next button found`);
      break;
    }
  }

  console.log(`[completeOnboarding] Onboarding completion finished`);
}

/**
 * Helper function to sign up a new user
 */
export async function signupUser(
  page: any,
  email: string,
  password: string
) {
  console.log(`[signupUser] Starting signup for ${email}`);
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

  console.log(`[signupUser] Submitting signup form`);
  // Submit form - use text selector instead of type="submit"
  await page.click('button:has-text("Start Free Trial")');

  console.log(`[signupUser] Waiting for navigation after signup`);
  // Wait for navigation to complete - could go to multiple pages
  await page.waitForURL(/.*(profile|dashboard|jobs|onboarding|preferences)/, { timeout: 20000 });

  console.log(`[signupUser] Navigation complete, current URL: ${page.url()}`);

  // CRITICAL: Wait for authenticated state to be established
  // Look for Profile link/button in navigation which only appears when authenticated
  // This ensures localStorage/cookies have been set before continuing
  console.log(`[signupUser] Waiting for authenticated navigation to appear`);
  try {
    await page.waitForSelector('text=Profile', { timeout: 10000 });
    console.log(`[signupUser] Authenticated navigation confirmed`);
  } catch (error) {
    console.error(`[signupUser] Failed to find authenticated navigation. Current URL: ${page.url()}`);
    // Try to find any auth indicator
    const hasLogout = await page.locator('text=Logout').isVisible().catch(() => false);
    const hasLogin = await page.locator('text=Login').first().isVisible().catch(() => false);
    console.log(`[signupUser] Has Logout button: ${hasLogout}, Has Login button: ${hasLogin}`);
    throw error;
  }

  // Additional wait to ensure localStorage is fully written
  await page.waitForTimeout(1000);

  // Verify localStorage has sessionToken
  const sessionToken = await page.evaluate(() => localStorage.getItem('sessionToken'));
  console.log(`[signupUser] SessionToken in localStorage: ${sessionToken ? 'YES' : 'NO'}`);

  if (!sessionToken) {
    throw new Error('Session token not found in localStorage after signup');
  }

  // Check if redirected to onboarding/preferences and complete it automatically
  const finalUrl = page.url();
  if (finalUrl.includes('onboarding') || finalUrl.includes('preferences')) {
    console.log(`[signupUser] User redirected to onboarding, completing automatically`);
    await completeOnboarding(page);
  }

  console.log(`[signupUser] Signup complete and authenticated`);
}

/**
 * Helper function to navigate to a page while preserving authentication
 * Uses navigation links instead of direct page.goto() to preserve session
 */
export async function navigateTo(page: any, path: string) {
  console.log(`[navigateTo] Navigating to ${path}`);

  // If we're already on the target path, do nothing
  const currentUrl = page.url();
  if (currentUrl.includes(path)) {
    console.log(`[navigateTo] Already on ${path}`);
    return;
  }

  // For specific routes, click navigation links instead of direct goto
  const navMap: Record<string, string> = {
    '/jobs': 'Jobs',
    '/saved': 'Saved',
    '/applications': 'Applications',
    '/profile': 'Profile',
  };

  const linkText = navMap[path];
  if (linkText) {
    console.log(`[navigateTo] Clicking nav link: ${linkText}`);
    await page.click(`nav >> text=${linkText}`).catch(async () => {
      // If clicking nav fails, fall back to page.goto
      console.log(`[navigateTo] Nav click failed, using page.goto`);
      await page.goto(path);
    });
    await page.waitForLoadState('domcontentloaded');
  } else {
    // For other paths, use page.goto
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
  }

  // Wait for client-side React Router redirects to complete
  await page.waitForTimeout(1000);

  const finalUrl = page.url();
  console.log(`[navigateTo] Navigation complete, current URL: ${finalUrl}`);

  // Check if we got redirected to onboarding and complete it
  if ((finalUrl.includes('onboarding') || finalUrl.includes('preferences')) && !path.includes('onboarding') && !path.includes('preferences')) {
    console.log(`[navigateTo] Got redirected to onboarding, completing it`);
    await completeOnboarding(page);

    // Navigate to original destination again
    console.log(`[navigateTo] Onboarding complete, navigating to ${path} again`);
    if (linkText) {
      await page.click(`nav >> text=${linkText}`).catch(async () => {
        await page.goto(path);
      });
    } else {
      await page.goto(path);
    }
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    console.log(`[navigateTo] Finally at: ${page.url()}`);
  }

  // Verify we're actually on the intended page by checking for page-specific content
  if (path === '/jobs' || path.includes('/jobs')) {
    // Wait for Jobs page to load - look for search or job listings
    console.log(`[navigateTo] Verifying Jobs page loaded`);
    await page.waitForSelector('input[placeholder*="Search"], button:has-text("Search"), h1, h2, h3').catch(() => {
      console.log(`[navigateTo] Warning: Could not find Jobs page elements`);
    });
  }
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
